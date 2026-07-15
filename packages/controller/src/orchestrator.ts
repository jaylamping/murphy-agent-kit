import { randomUUID } from "node:crypto";
import type { StateStore } from "./state-store.js";
import type { LeaseManager } from "./leases.js";
import type { EvidenceStore } from "./evidence.js";
import type { ModelProfile, ModelAvailability } from "./models.js";
import { selectModel, validateAgainstAllowlist, type MurphyRole } from "./models.js";
import {
  GateEvaluator,
  classifyDiscoveryTask,
  loadLifecycle,
  type GateDef,
} from "./gates.js";
import {
  ParallelScheduler,
  principalDue,
  type StoryLane,
  type WipLimits,
} from "./scheduler.js";
import { nowIso, sha256, PLUGIN_VERSION, type DeliveryState, type PrincipalVerdict, type Role } from "./types.js";
import { redactSecrets, roleIsReadonly } from "./credentials.js";

export interface LaunchRequest {
  role: MurphyRole;
  prompt: string;
  cwd: string;
  storyId?: string;
  subtaskId?: string;
}

export interface LaunchResult {
  runId: string;
  attemptId: string;
  primaryModel: string;
  selectedModel: string;
  fallbackReason?: string;
  sdkAgentId?: string;
  sdkRunId?: string;
  status: "ok" | "error" | "denied";
  error?: string;
  resultText?: string;
}

export type AgentLauncher = (args: {
  role: MurphyRole;
  model: string;
  cwd: string;
  prompt: string;
  runId: string;
}) => Promise<{
  agentId: string;
  runId: string;
  status: "ok" | "error" | "startup-failure";
  resultText?: string;
  error?: string;
  retryable?: boolean;
  capacityFailure?: boolean;
}>;

export interface OrchestratorDeps {
  store: StateStore;
  leases: LeaseManager;
  evidence: EvidenceStore;
  modelProfile: ModelProfile;
  availability: ModelAvailability;
  gates: GateDef[];
  wip: WipLimits;
  repoRoot: string;
  launcher: AgentLauncher;
  specificationDigest: string;
  profileDigest: string;
  pluginDigest: string;
  repositoryFingerprint: string;
}

export class Orchestrator {
  private readonly gateEval: GateEvaluator;
  private readonly scheduler: ParallelScheduler;
  private readonly lifecycle: ReturnType<typeof loadLifecycle>;
  private mergedSinceCheckpoint = 0;
  private currentBatchId = randomUUID();

  constructor(private readonly deps: OrchestratorDeps) {
    this.gateEval = new GateEvaluator(deps.store, deps.evidence, deps.gates);
    this.scheduler = new ParallelScheduler(deps.wip);
    this.lifecycle = loadLifecycle(deps.repoRoot);
  }

  /** Advisor proposals cannot advance state — controller validates. */
  acceptAdvisorProposal(proposal: Record<string, unknown>): {
    accepted: boolean;
    reason?: string;
  } {
    if (proposal.waiveGate === true) {
      this.deps.store.appendEvent("denial", {
        reason: "advisor-cannot-waive-gate",
        proposal,
      });
      return { accepted: false, reason: "advisor-cannot-waive-gate" };
    }
    if (proposal.advanceState) {
      this.deps.store.appendEvent("denial", {
        reason: "advisor-cannot-advance-state",
        proposal,
      });
      return { accepted: false, reason: "advisor-cannot-advance-state" };
    }
    return { accepted: true };
  }

  routeTask(taskDescription: string): Role {
    if (classifyDiscoveryTask(taskDescription)) return "intern";
    return "junior";
  }

  async launchRole(req: LaunchRequest): Promise<LaunchResult> {
    const attemptId = randomUUID();
    const runId = randomUUID();
    const selection = selectModel(
      this.deps.modelProfile,
      req.role,
      this.deps.availability,
    );
    if ("error" in selection) {
      this.deps.store.appendEvent("denial", {
        runId,
        role: req.role,
        error: selection.error,
      });
      return {
        runId,
        attemptId,
        primaryModel: "",
        selectedModel: "",
        status: "denied",
        error: selection.error,
      };
    }

    if (
      !validateAgainstAllowlist(
        this.deps.modelProfile,
        req.role,
        selection.selectedModel,
      )
    ) {
      return {
        runId,
        attemptId,
        primaryModel: selection.primaryModel,
        selectedModel: selection.selectedModel,
        status: "denied",
        error: "selected model not allowlisted",
      };
    }

    const prompt = redactSecrets(req.prompt);
    this.deps.store.appendEvent(
      "dispatch-intent",
      {
        runId,
        attemptId,
        role: req.role,
        model: selection.selectedModel,
        cwd: req.cwd,
        storyId: req.storyId,
        subtaskId: req.subtaskId,
      },
      runId,
    );

    this.deps.store.upsertRun({
      runId,
      attemptId,
      role: req.role,
      repositoryFingerprint: this.deps.repositoryFingerprint,
      specificationDigest: this.deps.specificationDigest,
      profileDigest: this.deps.profileDigest,
      modelProfileDigest: this.deps.modelProfile.digest,
      pluginDigest: this.deps.pluginDigest,
      stateVersion: 1,
      primaryModel: selection.primaryModel,
      selectedModel: selection.selectedModel,
      fallbackReason: selection.fallbackReason,
      worktree: req.cwd,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    let launch;
    try {
      launch = await this.deps.launcher({
        role: req.role,
        model: selection.selectedModel,
        cwd: req.cwd,
        prompt,
        runId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // startup failure — may try allowlisted fallback once
      if (/quota|rate|capacity|unavailable/i.test(message)) {
        const fb = selectModel(
          this.deps.modelProfile,
          req.role,
          this.deps.availability,
          { kind: "pre-execution-capacity", message },
        );
        if ("error" in fb) {
          return {
            runId,
            attemptId,
            ...selection,
            status: "error",
            error: fb.error,
          };
        }
        launch = await this.deps.launcher({
          role: req.role,
          model: fb.selectedModel,
          cwd: req.cwd,
          prompt,
          runId,
        });
        selection.selectedModel = fb.selectedModel;
        selection.fallbackReason = fb.fallbackReason;
      } else {
        return {
          runId,
          attemptId,
          ...selection,
          status: "error",
          error: message,
        };
      }
    }

    if (launch.status === "startup-failure" && launch.capacityFailure) {
      const fb = selectModel(
        this.deps.modelProfile,
        req.role,
        this.deps.availability,
        { kind: "pre-execution-capacity", message: launch.error ?? "capacity" },
      );
      if ("error" in fb) {
        return {
          runId,
          attemptId,
          ...selection,
          status: "error",
          error: fb.error,
        };
      }
      launch = await this.deps.launcher({
        role: req.role,
        model: fb.selectedModel,
        cwd: req.cwd,
        prompt,
        runId,
      });
      selection.selectedModel = fb.selectedModel;
      selection.fallbackReason = fb.fallbackReason;
    }

    this.deps.store.upsertRun({
      runId,
      attemptId,
      role: req.role,
      sdkAgentId: launch.agentId,
      sdkRunId: launch.runId,
      repositoryFingerprint: this.deps.repositoryFingerprint,
      specificationDigest: this.deps.specificationDigest,
      profileDigest: this.deps.profileDigest,
      modelProfileDigest: this.deps.modelProfile.digest,
      pluginDigest: this.deps.pluginDigest,
      stateVersion: 1,
      primaryModel: selection.primaryModel,
      selectedModel: selection.selectedModel,
      fallbackReason: selection.fallbackReason,
      worktree: req.cwd,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    this.deps.store.appendEvent(
      "dispatch-attached",
      {
        runId,
        sdkAgentId: launch.agentId,
        sdkRunId: launch.runId,
        selectedModel: selection.selectedModel,
      },
      runId,
    );

    if (launch.status === "error") {
      // started and failed — never fallback relaunch
      this.deps.store.appendEvent(
        "dispatch-result",
        { runId, status: "error", error: launch.error },
        runId,
      );
      return {
        runId,
        attemptId,
        ...selection,
        sdkAgentId: launch.agentId,
        sdkRunId: launch.runId,
        status: "error",
        error: launch.error,
      };
    }

    this.deps.store.appendEvent(
      "dispatch-result",
      { runId, status: "ok" },
      runId,
    );

    return {
      runId,
      attemptId,
      ...selection,
      sdkAgentId: launch.agentId,
      sdkRunId: launch.runId,
      status: "ok",
      resultText: launch.resultText,
    };
  }

  transitionDelivery(
    storyId: string,
    from: DeliveryState | null,
    to: DeliveryState,
    evidenceRunId: string,
    evidenceKinds: string[],
  ): { ok: boolean; reason?: string } {
    // record evidence kinds as present for gate checks
    for (const kind of evidenceKinds) {
      this.deps.evidence.put(evidenceRunId, kind, { storyId, kind });
    }

    const when =
      to === "junior-complete"
        ? "before-senior-integrate"
        : to === "architect-approved"
          ? "before-merge"
          : to === "subtask-ready"
            ? "before-junior-start"
            : to === "senior-integrated"
              ? "before-architect-approve"
              : null;

    if (when) {
      const decisions = this.gateEval.evaluate(when, evidenceRunId, evidenceKinds);
      if (!this.gateEval.allPassed(decisions)) {
        return {
          ok: false,
          reason: `gate-failure:${decisions
            .filter((d) => !d.passed)
            .map((d) => d.gateId)
            .join(",")}`,
        };
      }
    }

    const result = this.deps.store.casDelivery(
      storyId,
      from,
      to,
      this.lifecycle.deliveryTransitions,
    );
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  }

  recordMerge(storyId: string): {
    mergedCount: number;
    principalRequired: boolean;
  } {
    const count = this.deps.store.recordMergedStory(storyId, this.currentBatchId);
    this.mergedSinceCheckpoint = count;
    const { min, max } = this.lifecycle.principalCheckpointEvery;
    const principalRequired = principalDue(count, min, max);
    if (principalRequired) {
      this.deps.store.setBatchState(storyId, "three-or-four-stories-merged");
      this.deps.store.setBatchState(storyId, "principal-review");
    }
    return { mergedCount: count, principalRequired };
  }

  applyPrincipalVerdict(
    storyId: string,
    verdict: PrincipalVerdict,
    rationale: string,
  ): { ok: boolean; reason?: string } {
    if (verdict === "continue") {
      this.deps.store.setBatchState(storyId, "continue");
      this.deps.store.setBatchState(storyId, "batch-open");
      this.currentBatchId = randomUUID();
      this.mergedSinceCheckpoint = 0;
      this.deps.evidence.put(storyId, "principal-verdict", {
        verdict,
        rationale,
      });
      return { ok: true };
    }
    if (verdict === "correct") {
      this.deps.store.setBatchState(storyId, "corrective-work");
      this.deps.evidence.put(storyId, "corrective-work", {
        verdict,
        rationale,
      });
      return { ok: true };
    }
    this.deps.store.setBatchState(storyId, "human-escalation");
    this.deps.evidence.put(storyId, "human-escalation", { verdict, rationale });
    return { ok: true };
  }

  schedule(stories: StoryLane[], active: Parameters<ParallelScheduler["plan"]>[1]) {
    return this.scheduler.plan(stories, active);
  }

  rejectReadonlyMutation(role: Role, diffEmpty: boolean): boolean {
    if (roleIsReadonly(role) && !diffEmpty) {
      this.deps.store.appendEvent("denial", {
        reason: "readonly-role-produced-diff",
        role,
      });
      return true;
    }
    return false;
  }

  pluginVersion(): string {
    return PLUGIN_VERSION;
  }

  discoveryCacheKey(
    fingerprint: string,
    query: string,
    scope: string,
  ): string {
    return sha256([fingerprint, query, scope, this.deps.profileDigest].join("|"));
  }
}

export function createMockLauncher(
  behavior: Record<
    string,
    | { status: "ok"; resultText?: string }
    | { status: "error"; error: string }
    | { status: "startup-failure"; error: string; capacityFailure?: boolean }
  > = {},
): AgentLauncher {
  return async ({ role, model, runId }) => {
    const key = `${role}:${model}`;
    const b = behavior[key] ?? behavior[role] ?? { status: "ok" as const, resultText: "ok" };
    if (b.status === "startup-failure") {
      return {
        agentId: "",
        runId: "",
        status: "startup-failure",
        error: b.error,
        capacityFailure: b.capacityFailure,
        retryable: true,
      };
    }
    if (b.status === "error") {
      return {
        agentId: `agent-${runId}`,
        runId: `sdkrun-${runId}`,
        status: "error",
        error: b.error,
      };
    }
    return {
      agentId: `agent-${runId}`,
      runId: `sdkrun-${runId}`,
      status: "ok",
      resultText: b.resultText ?? `mock-${role}-${model}`,
    };
  };
}
