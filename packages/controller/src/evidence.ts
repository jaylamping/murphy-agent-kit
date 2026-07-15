import { mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { StateStore } from "./state-store.js";
import { nowIso, sha256 } from "./types.js";
import { redactSecrets } from "./credentials.js";

export interface EvidenceRecord {
  id: string;
  runId: string;
  kind: string;
  checksum: string;
  path?: string;
}

export class EvidenceStore {
  constructor(
    private readonly store: StateStore,
    private readonly evidenceDir: string,
  ) {
    mkdirSync(evidenceDir, { recursive: true, mode: 0o700 });
    chmodSync(evidenceDir, 0o700);
  }

  put(
    runId: string,
    kind: string,
    payload: Record<string, unknown> | string,
  ): EvidenceRecord {
    const text =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    const safe = redactSecrets(text);
    const checksum = sha256(safe);
    const id = createHash("sha256")
      .update(`${runId}|${kind}|${checksum}`)
      .digest("hex")
      .slice(0, 16);
    const path = join(this.evidenceDir, `${id}-${kind}.json`);
    writeFileSync(path, safe, { mode: 0o600 });
    this.store.db
      .prepare(
        `INSERT OR REPLACE INTO evidence (id, run_id, kind, checksum, path, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, runId, kind, checksum, path, safe, nowIso());
    this.store.appendEvent("evidence", { id, runId, kind, checksum }, runId);
    return { id, runId, kind, checksum, path };
  }

  hasKinds(runId: string, kinds: string[]): boolean {
    for (const kind of kinds) {
      const row = this.store.db
        .prepare(
          `SELECT id FROM evidence WHERE run_id = ? AND kind = ? LIMIT 1`,
        )
        .get(runId, kind);
      if (!row) return false;
    }
    return true;
  }

  listKinds(runId: string): string[] {
    const rows = this.store.db
      .prepare(`SELECT kind FROM evidence WHERE run_id = ?`)
      .all(runId) as { kind: string }[];
    return rows.map((r) => r.kind);
  }
}
