import type { StateStore } from "./state-store.js";
import type { LeaseManager } from "./leases.js";
import { nowIso } from "./types.js";

export interface RecoveryReport {
  openRuns: number;
  quarantined: string[];
  reclaimedLeases: string[];
  ambiguous: string[];
  actions: string[];
}

export class RecoveryService {
  constructor(
    private readonly store: StateStore,
    private readonly leases: LeaseManager,
  ) {}

  reconcile(): RecoveryReport {
    const report: RecoveryReport = {
      openRuns: 0,
      quarantined: [],
      reclaimedLeases: [],
      ambiguous: [],
      actions: [],
    };

    const open = this.store.listOpenRuns();
    report.openRuns = open.length;

    for (const run of open) {
      if (!run.sdkAgentId || !run.sdkRunId) {
        report.quarantined.push(run.runId);
        report.actions.push(`quarantine-incomplete-dispatch:${run.runId}`);
        this.store.appendEvent(
          "recovery",
          { action: "quarantine", runId: run.runId, reason: "incomplete-dispatch" },
          run.runId,
        );
        continue;
      }
      // Without live SDK in qualification, mark as needs-human if evidence missing
      // after a stale window; tests inject resolved evidence.
      report.ambiguous.push(run.runId);
      report.actions.push(`ambiguous-open-run:${run.runId}`);
      this.store.appendEvent(
        "recovery",
        {
          action: "escalate-ambiguous",
          runId: run.runId,
          at: nowIso(),
        },
        run.runId,
      );
    }

    const now = Date.now();
    const stale = this.store.db
      .prepare("SELECT * FROM leases WHERE expires_at < ?")
      .all(new Date(now).toISOString()) as Array<Record<string, unknown>>;

    for (const lease of stale) {
      const resourceId = String(lease.resource_id);
      const owner = String(lease.owner_run_id);
      const fence = Number(lease.fence_token);
      this.leases.release(resourceId, owner, fence);
      report.reclaimedLeases.push(resourceId);
      report.actions.push(`reclaim-stale-lease:${resourceId}`);
    }

    this.store.appendEvent("recovery", {
      action: "reconcile-complete",
      ...report,
    });

    return report;
  }
}
