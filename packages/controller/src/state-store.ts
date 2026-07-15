import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  defaultDbPath,
  defaultStateDir,
  nowIso,
  STATE_SCHEMA_VERSION,
  type DeliveryState,
  type EventType,
  type Role,
  type RunRecord,
  type SddState,
  type BatchState,
} from "./types.js";

export interface TransitionResult {
  ok: boolean;
  reason?: string;
  from?: string;
  to?: string;
}

export class StateStore {
  readonly db: Database.Database;
  readonly dbPath: string;

  constructor(dbPath = defaultDbPath()) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
    chmodSync(dirname(dbPath), 0o700);
    try {
      chmodSync(defaultStateDir(), 0o700);
    } catch {
      /* may not own parent */
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runs (
        run_id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL,
        role TEXT NOT NULL,
        sdk_agent_id TEXT,
        sdk_run_id TEXT,
        worktree TEXT,
        repository_fingerprint TEXT NOT NULL,
        specification_digest TEXT NOT NULL,
        profile_digest TEXT NOT NULL,
        model_profile_digest TEXT NOT NULL,
        plugin_digest TEXT NOT NULL,
        state_version INTEGER NOT NULL,
        primary_model TEXT,
        selected_model TEXT,
        fallback_reason TEXT,
        evidence_checksum TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sdd (
        specification_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery (
        story_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        batch_state TEXT,
        version INTEGER NOT NULL,
        evidence_checksum TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS leases (
        resource_id TEXT PRIMARY KEY,
        owner_run_id TEXT NOT NULL,
        fence_token INTEGER NOT NULL,
        mode TEXT NOT NULL,
        heartbeat_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        checksum TEXT NOT NULL,
        path TEXT,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discovery_cache (
        cache_key TEXT PRIMARY KEY,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS idempotency (
        op_key TEXT PRIMARY KEY,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS merged_stories (
        story_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        merged_at TEXT NOT NULL
      );
    `);

    const row = this.db
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get("state_schema_version") as { value: string } | undefined;
    if (!row) {
      this.db
        .prepare("INSERT INTO meta (key, value) VALUES (?, ?)")
        .run("state_schema_version", String(STATE_SCHEMA_VERSION));
    }
  }

  appendEvent(
    eventType: EventType,
    payload: Record<string, unknown>,
    runId?: string,
  ): void {
    this.db
      .prepare(
        `INSERT INTO events (run_id, event_type, payload_json, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(runId ?? null, eventType, JSON.stringify(payload), nowIso());
  }

  upsertRun(run: RunRecord): void {
    this.db
      .prepare(
        `INSERT INTO runs (
          run_id, attempt_id, role, sdk_agent_id, sdk_run_id, worktree,
          repository_fingerprint, specification_digest, profile_digest,
          model_profile_digest, plugin_digest, state_version,
          primary_model, selected_model, fallback_reason, evidence_checksum,
          created_at, updated_at
        ) VALUES (
          @runId, @attemptId, @role, @sdkAgentId, @sdkRunId, @worktree,
          @repositoryFingerprint, @specificationDigest, @profileDigest,
          @modelProfileDigest, @pluginDigest, @stateVersion,
          @primaryModel, @selectedModel, @fallbackReason, @evidenceChecksum,
          @createdAt, @updatedAt
        )
        ON CONFLICT(run_id) DO UPDATE SET
          sdk_agent_id=excluded.sdk_agent_id,
          sdk_run_id=excluded.sdk_run_id,
          worktree=excluded.worktree,
          primary_model=excluded.primary_model,
          selected_model=excluded.selected_model,
          fallback_reason=excluded.fallback_reason,
          evidence_checksum=excluded.evidence_checksum,
          updated_at=excluded.updated_at`,
      )
      .run({
        runId: run.runId,
        attemptId: run.attemptId,
        role: run.role,
        sdkAgentId: run.sdkAgentId ?? null,
        sdkRunId: run.sdkRunId ?? null,
        worktree: run.worktree ?? null,
        repositoryFingerprint: run.repositoryFingerprint,
        specificationDigest: run.specificationDigest,
        profileDigest: run.profileDigest,
        modelProfileDigest: run.modelProfileDigest,
        pluginDigest: run.pluginDigest,
        stateVersion: run.stateVersion,
        primaryModel: run.primaryModel ?? null,
        selectedModel: run.selectedModel ?? null,
        fallbackReason: run.fallbackReason ?? null,
        evidenceChecksum: run.evidenceChecksum ?? null,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      });
  }

  getRun(runId: string): RunRecord | undefined {
    const row = this.db.prepare("SELECT * FROM runs WHERE run_id = ?").get(runId) as
      | Record<string, unknown>
      | undefined;
    if (!row) return undefined;
    return {
      runId: String(row.run_id),
      attemptId: String(row.attempt_id),
      role: row.role as Role,
      sdkAgentId: row.sdk_agent_id ? String(row.sdk_agent_id) : undefined,
      sdkRunId: row.sdk_run_id ? String(row.sdk_run_id) : undefined,
      worktree: row.worktree ? String(row.worktree) : undefined,
      repositoryFingerprint: String(row.repository_fingerprint),
      specificationDigest: String(row.specification_digest),
      profileDigest: String(row.profile_digest),
      modelProfileDigest: String(row.model_profile_digest),
      pluginDigest: String(row.plugin_digest),
      stateVersion: Number(row.state_version),
      primaryModel: row.primary_model ? String(row.primary_model) : undefined,
      selectedModel: row.selected_model ? String(row.selected_model) : undefined,
      fallbackReason: row.fallback_reason ? String(row.fallback_reason) : undefined,
      evidenceChecksum: row.evidence_checksum
        ? String(row.evidence_checksum)
        : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  casSdd(
    specificationId: string,
    from: SddState | null,
    to: SddState,
    allowed: Record<string, string[]>,
  ): TransitionResult {
    return this.casGeneric(
      "sdd",
      "specification_id",
      specificationId,
      from,
      to,
      allowed,
      (id, state) => {
        this.db
          .prepare(
            `INSERT INTO sdd (specification_id, state, version, updated_at)
             VALUES (?, ?, 1, ?)
             ON CONFLICT(specification_id) DO UPDATE SET
               state=excluded.state,
               version=sdd.version+1,
               updated_at=excluded.updated_at`,
          )
          .run(id, state, nowIso());
      },
      (id) => {
        const row = this.db
          .prepare("SELECT state FROM sdd WHERE specification_id = ?")
          .get(id) as { state: string } | undefined;
        return row?.state;
      },
    );
  }

  casDelivery(
    storyId: string,
    from: DeliveryState | null,
    to: DeliveryState,
    allowed: Record<string, string[]>,
  ): TransitionResult {
    return this.casGeneric(
      "delivery",
      "story_id",
      storyId,
      from,
      to,
      allowed,
      (id, state) => {
        this.db
          .prepare(
            `INSERT INTO delivery (story_id, state, batch_state, version, updated_at)
             VALUES (?, ?, 'batch-open', 1, ?)
             ON CONFLICT(story_id) DO UPDATE SET
               state=excluded.state,
               version=delivery.version+1,
               updated_at=excluded.updated_at`,
          )
          .run(id, state, nowIso());
      },
      (id) => {
        const row = this.db
          .prepare("SELECT state FROM delivery WHERE story_id = ?")
          .get(id) as { state: string } | undefined;
        return row?.state;
      },
    );
  }

  setBatchState(storyId: string, batchState: BatchState): void {
    this.db
      .prepare(
        `UPDATE delivery SET batch_state = ?, updated_at = ? WHERE story_id = ?`,
      )
      .run(batchState, nowIso(), storyId);
  }

  getDelivery(storyId: string):
    | { state: DeliveryState; batchState: BatchState; version: number }
    | undefined {
    const row = this.db
      .prepare("SELECT state, batch_state, version FROM delivery WHERE story_id = ?")
      .get(storyId) as
      | { state: string; batch_state: string; version: number }
      | undefined;
    if (!row) return undefined;
    return {
      state: row.state as DeliveryState,
      batchState: row.batch_state as BatchState,
      version: row.version,
    };
  }

  recordMergedStory(storyId: string, batchId: string): number {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO merged_stories (story_id, batch_id, merged_at)
         VALUES (?, ?, ?)`,
      )
      .run(storyId, batchId, nowIso());
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS c FROM merged_stories WHERE batch_id = ?`,
      )
      .get(batchId) as { c: number };
    return row.c;
  }

  countMergedInBatch(batchId: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM merged_stories WHERE batch_id = ?`)
      .get(batchId) as { c: number };
    return row.c;
  }

  putIdempotent(opKey: string, result: Record<string, unknown>): boolean {
    const existing = this.db
      .prepare("SELECT result_json FROM idempotency WHERE op_key = ?")
      .get(opKey) as { result_json: string } | undefined;
    if (existing) return false;
    this.db
      .prepare(
        `INSERT INTO idempotency (op_key, result_json, created_at) VALUES (?, ?, ?)`,
      )
      .run(opKey, JSON.stringify(result), nowIso());
    return true;
  }

  getIdempotent(opKey: string): Record<string, unknown> | undefined {
    const row = this.db
      .prepare("SELECT result_json FROM idempotency WHERE op_key = ?")
      .get(opKey) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as Record<string, unknown>) : undefined;
  }

  putDiscoveryCache(cacheKey: string, report: Record<string, unknown>): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO discovery_cache (cache_key, report_json, created_at)
         VALUES (?, ?, ?)`,
      )
      .run(cacheKey, JSON.stringify(report), nowIso());
  }

  getDiscoveryCache(cacheKey: string): Record<string, unknown> | undefined {
    const row = this.db
      .prepare("SELECT report_json FROM discovery_cache WHERE cache_key = ?")
      .get(cacheKey) as { report_json: string } | undefined;
    return row ? (JSON.parse(row.report_json) as Record<string, unknown>) : undefined;
  }

  invalidateDiscoveryCache(): void {
    this.db.prepare("DELETE FROM discovery_cache").run();
  }

  listOpenRuns(): RunRecord[] {
    const rows = this.db
      .prepare(
        `SELECT run_id FROM runs WHERE sdk_run_id IS NOT NULL AND evidence_checksum IS NULL`,
      )
      .all() as { run_id: string }[];
    return rows
      .map((r) => this.getRun(r.run_id))
      .filter((r): r is RunRecord => r !== undefined);
  }

  private casGeneric(
    _table: string,
    _idCol: string,
    id: string,
    from: string | null,
    to: string,
    allowed: Record<string, string[]>,
    write: (id: string, state: string) => void,
    read: (id: string) => string | undefined,
  ): TransitionResult {
    const txn = this.db.transaction(() => {
      const current = read(id) ?? null;
      if (from === null) {
        if (current !== null) {
          return { ok: false, reason: "already-exists", from: current, to };
        }
      } else if (current !== from) {
        return {
          ok: false,
          reason: "cas-mismatch",
          from: current ?? undefined,
          to,
        };
      }
      if (from !== null) {
        const next = allowed[from] ?? [];
        if (!next.includes(to)) {
          return { ok: false, reason: "illegal-transition", from, to };
        }
      }
      write(id, to);
      this.appendEvent("transition", { id, from, to, table: _table });
      return { ok: true, from: from ?? undefined, to };
    });
    return txn();
  }
}
