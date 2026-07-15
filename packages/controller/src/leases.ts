import { nowIso } from "./types.js";
import type { StateStore } from "./state-store.js";

export type LeaseMode = "exclusive-write" | "shared-read";

export interface Lease {
  resourceId: string;
  ownerRunId: string;
  fenceToken: number;
  mode: LeaseMode;
  heartbeatAt: string;
  expiresAt: string;
}

export class LeaseManager {
  constructor(
    private readonly store: StateStore,
    private readonly ttlMs = 60_000,
  ) {}

  acquire(
    resourceId: string,
    ownerRunId: string,
    mode: LeaseMode,
  ): { ok: true; lease: Lease } | { ok: false; reason: string } {
    const db = this.store.db;
    const now = Date.now();
    const expiresAt = new Date(now + this.ttlMs).toISOString();
    const heartbeatAt = nowIso();

    const result = db.transaction(() => {
      const existing = db
        .prepare("SELECT * FROM leases WHERE resource_id = ?")
        .get(resourceId) as Record<string, unknown> | undefined;

      if (existing) {
        const exp = Date.parse(String(existing.expires_at));
        const existingMode = String(existing.mode) as LeaseMode;
        if (exp > now) {
          if (mode === "exclusive-write" || existingMode === "exclusive-write") {
            if (String(existing.owner_run_id) !== ownerRunId) {
              return { ok: false as const, reason: "lease-held" };
            }
          }
        } else {
          // expired — reclaim with new fence
          const nextFence = Number(existing.fence_token) + 1;
          db.prepare("DELETE FROM leases WHERE resource_id = ?").run(resourceId);
          db.prepare(
            `INSERT INTO leases (resource_id, owner_run_id, fence_token, mode, heartbeat_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(resourceId, ownerRunId, nextFence, mode, heartbeatAt, expiresAt);
          const lease: Lease = {
            resourceId,
            ownerRunId,
            fenceToken: nextFence,
            mode,
            heartbeatAt,
            expiresAt,
          };
          this.store.appendEvent("lease", {
            action: "reclaim",
            ...lease,
          }, ownerRunId);
          return { ok: true as const, lease };
        }
      }

      const fence = existing ? Number(existing.fence_token) : 1;
      if (!existing) {
        db.prepare(
          `INSERT INTO leases (resource_id, owner_run_id, fence_token, mode, heartbeat_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(resourceId, ownerRunId, fence, mode, heartbeatAt, expiresAt);
      } else {
        db.prepare(
          `UPDATE leases SET heartbeat_at = ?, expires_at = ? WHERE resource_id = ? AND owner_run_id = ?`,
        ).run(heartbeatAt, expiresAt, resourceId, ownerRunId);
      }

      const lease: Lease = {
        resourceId,
        ownerRunId,
        fenceToken: fence,
        mode,
        heartbeatAt,
        expiresAt,
      };
      this.store.appendEvent("lease", { action: "acquire", ...lease }, ownerRunId);
      return { ok: true as const, lease };
    })();

    return result;
  }

  heartbeat(resourceId: string, ownerRunId: string, fenceToken: number): boolean {
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    const info = this.store.db
      .prepare(
        `UPDATE leases SET heartbeat_at = ?, expires_at = ?
         WHERE resource_id = ? AND owner_run_id = ? AND fence_token = ?`,
      )
      .run(nowIso(), expiresAt, resourceId, ownerRunId, fenceToken);
    return info.changes > 0;
  }

  release(resourceId: string, ownerRunId: string, fenceToken: number): boolean {
    const info = this.store.db
      .prepare(
        `DELETE FROM leases WHERE resource_id = ? AND owner_run_id = ? AND fence_token = ?`,
      )
      .run(resourceId, ownerRunId, fenceToken);
    if (info.changes > 0) {
      this.store.appendEvent("lease", {
        action: "release",
        resourceId,
        ownerRunId,
        fenceToken,
      }, ownerRunId);
    }
    return info.changes > 0;
  }

  /** Reject stale fence — caller must hold current token. */
  assertFence(resourceId: string, fenceToken: number): boolean {
    const row = this.store.db
      .prepare("SELECT fence_token FROM leases WHERE resource_id = ?")
      .get(resourceId) as { fence_token: number } | undefined;
    return row !== undefined && Number(row.fence_token) === fenceToken;
  }
}
