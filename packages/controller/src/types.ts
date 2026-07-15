import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN_NAME = "murphy-agent-kit";

const packageJsonPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../package.json",
);
export const PLUGIN_VERSION = (
  JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string }
).version;

export const STATE_SCHEMA_VERSION = 1;

export type Role =
  | "orchestrator"
  | "intern"
  | "junior"
  | "senior"
  | "architect"
  | "principal"
  | "human";

export type SddState =
  | "intent"
  | "spec-draft"
  | "spec-reviewed"
  | "spec-approved"
  | "planned"
  | "implementation-ready"
  | "implementing"
  | "verifying"
  | "release-ready"
  | "released";

export type DeliveryState =
  | "candidate"
  | "architect-ready"
  | "subtask-ready"
  | "junior-complete"
  | "senior-integrated"
  | "tests-passed"
  | "architect-approved"
  | "merge-ready";

export type BatchState =
  | "batch-open"
  | "three-or-four-stories-merged"
  | "principal-review"
  | "continue"
  | "corrective-work"
  | "human-escalation";

export type PrincipalVerdict = "continue" | "correct" | "escalate";

export type EventType =
  | "dispatch-intent"
  | "dispatch-attached"
  | "dispatch-result"
  | "mutation-intent"
  | "mutation-result"
  | "gate-decision"
  | "transition"
  | "denial"
  | "cancellation"
  | "recovery"
  | "lease"
  | "evidence"
  | "self-test";

export interface RunRecord {
  runId: string;
  attemptId: string;
  role: Role;
  sdkAgentId?: string;
  sdkRunId?: string;
  worktree?: string;
  repositoryFingerprint: string;
  specificationDigest: string;
  profileDigest: string;
  modelProfileDigest: string;
  pluginDigest: string;
  stateVersion: number;
  primaryModel?: string;
  selectedModel?: string;
  fallbackReason?: string;
  evidenceChecksum?: string;
  createdAt: string;
  updatedAt: string;
}

export function defaultStateDir(): string {
  return process.env.MURPHY_STATE_DIR ?? join(homedir(), ".murphy-agent-kit");
}

export function defaultDbPath(stateDir = defaultStateDir()): string {
  return join(stateDir, "state", "murphy-agent-kit.db");
}

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function stableOpKey(parts: string[]): string {
  return sha256(parts.join("|"));
}
