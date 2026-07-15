import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { StateStore } from "../src/state-store.js";
import { LeaseManager } from "../src/leases.js";
import { RecoveryService } from "../src/recovery.js";
import { EvidenceStore } from "../src/evidence.js";
import { loadModelProfile, selectModel, validateAgainstAllowlist } from "../src/models.js";
import {
  ParallelScheduler,
  principalDue,
  type StoryLane,
} from "../src/scheduler.js";
import {
  classifyDiscoveryTask,
  loadGates,
  loadLifecycle,
  trackerInheritanceMatch,
  isOversizedStory,
  createValidator,
} from "../src/gates.js";
import { Orchestrator, createMockLauncher } from "../src/orchestrator.js";
import { redactSecrets, assertNoSecrets } from "../src/credentials.js";
import { runSelfTests } from "../src/self-test.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function tempStore(): { store: StateStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "murphy-test-"));
  const store = new StateStore(join(dir, "test.db"));
  return { store, dir };
}

describe("state-store CAS", () => {
  it("allows legal delivery transitions and rejects illegal ones", () => {
    const { store, dir } = tempStore();
    const life = loadLifecycle(REPO_ROOT);
    const a = store.casDelivery("S1", null, "candidate", life.deliveryTransitions);
    assert.equal(a.ok, true);
    const b = store.casDelivery(
      "S1",
      "candidate",
      "architect-ready",
      life.deliveryTransitions,
    );
    assert.equal(b.ok, true);
    const bad = store.casDelivery(
      "S1",
      "architect-ready",
      "merge-ready",
      life.deliveryTransitions,
    );
    assert.equal(bad.ok, false);
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("idempotency keys prevent duplicate mutations", () => {
    const { store, dir } = tempStore();
    assert.equal(store.putIdempotent("op1", { ok: true }), true);
    assert.equal(store.putIdempotent("op1", { ok: true }), false);
    assert.deepEqual(store.getIdempotent("op1"), { ok: true });
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("leases", () => {
  it("exclusive write conflicts and fence rejects stale token", () => {
    const { store, dir } = tempStore();
    const leases = new LeaseManager(store, 60_000);
    const a = leases.acquire("pom.xml", "run-a", "exclusive-write");
    assert.equal(a.ok, true);
    const b = leases.acquire("pom.xml", "run-b", "exclusive-write");
    assert.equal(b.ok, false);
    if (a.ok) {
      assert.equal(leases.assertFence("pom.xml", a.lease.fenceToken), true);
      assert.equal(leases.assertFence("pom.xml", a.lease.fenceToken + 99), false);
      assert.equal(leases.release("pom.xml", "run-a", a.lease.fenceToken), true);
    }
    const c = leases.acquire("pom.xml", "run-b", "exclusive-write");
    assert.equal(c.ok, true);
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("models", () => {
  it("selects primary when available and allowlisted fallback on capacity", () => {
    const profile = loadModelProfile(REPO_ROOT, "balanced");
    const avail = new Map([
      ["cursor-grok-4.5-high-fast", true],
      ["gpt-5.6-luna-xhigh", true],
      ["composer-2.5", true],
      ["cursor-grok-4.5-low", true],
      ["gpt-5.6-terra-medium", true],
      ["gpt-5.6-sol-xhigh", true],
    ]);
    const primary = selectModel(profile, "senior", avail);
    assert.ok(!("error" in primary));
    if (!("error" in primary)) {
      assert.equal(primary.selectedModel, "cursor-grok-4.5-high-fast");
    }
    const fb = selectModel(profile, "senior", avail, {
      kind: "pre-execution-capacity",
      message: "quota",
    });
    assert.ok(!("error" in fb));
    if (!("error" in fb)) {
      assert.equal(fb.selectedModel, "gpt-5.6-luna-xhigh");
      assert.ok(validateAgainstAllowlist(profile, "senior", fb.selectedModel));
    }
    const internFb = selectModel(profile, "intern", avail, {
      kind: "pre-execution-capacity",
      message: "quota",
    });
    assert.ok("error" in internFb);
  });
});

describe("scheduler", () => {
  it("fills lanes up to cap and serializes exclusive claims", () => {
    const sched = new ParallelScheduler({
      storyLanes: 4,
      juniorsPerStory: 3,
      interns: 8,
      seniors: 2,
      architects: 2,
      sharedFoundationLanes: 1,
    });
    const stories: StoryLane[] = [
      {
        storyId: "A",
        claims: [{ resourceId: "db.users", kind: "database-object", mode: "exclusive-write" }],
        dependsOn: [],
        subtasks: [
          {
            subtaskId: "t1",
            claims: [{ resourceId: "src/a", kind: "file-glob", mode: "exclusive-write" }],
            allowedPaths: ["src/a"],
            dependsOn: [],
          },
          {
            subtaskId: "t2",
            claims: [{ resourceId: "src/b", kind: "file-glob", mode: "exclusive-write" }],
            allowedPaths: ["src/b"],
            dependsOn: [],
          },
          {
            subtaskId: "t3",
            claims: [{ resourceId: "src/a", kind: "file-glob", mode: "exclusive-write" }],
            allowedPaths: ["src/a"],
            dependsOn: [],
          },
        ],
      },
      {
        storyId: "B",
        claims: [{ resourceId: "db.users", kind: "database-object", mode: "exclusive-write" }],
        dependsOn: [],
        subtasks: [],
      },
      {
        storyId: "C",
        claims: [{ resourceId: "docs", kind: "documentation", mode: "shared-read" }],
        dependsOn: [],
        subtasks: [],
      },
    ];
    const plan = sched.plan(stories, {
      storyIds: new Set(),
      subtaskIds: new Set(),
      internCount: 0,
      seniorCount: 0,
      architectCount: 0,
    });
    assert.ok(plan.readyStories.includes("A"));
    assert.ok(plan.readyStories.includes("C"));
    assert.ok(plan.blockedStories.some((b) => b.storyId === "B"));
    assert.ok(plan.claimConflicts.some((c) => c.resourceId === "db.users"));
    assert.equal(plan.readySubtasks.length, 2);
    assert.ok(
      plan.blockedSubtasks.some((b) => b.subtaskId === "t3"),
    );
  });

  it("principalDue at 5-7", () => {
    assert.equal(principalDue(4), false);
    assert.equal(principalDue(5), true);
    assert.equal(principalDue(7), true);
    assert.equal(principalDue(8), false);
  });
});

describe("gates and routing", () => {
  it("routes discovery to intern", () => {
    assert.equal(classifyDiscoveryTask("find the Kafka consumer"), true);
    assert.equal(classifyDiscoveryTask("implement the handler"), false);
  });

  it("detects oversized stories and jira mismatch", () => {
    assert.equal(isOversizedStory(13), true);
    const m = trackerInheritanceMatch(
      { Team: "Platform Experience", Assignee: "Joey" },
      { Team: "Other", Assignee: "Joey" },
      ["Team", "Assignee"],
    );
    assert.equal(m.ok, false);
    assert.deepEqual(m.mismatches, ["Team"]);
  });

  it("validates schemas load", () => {
    const ajv = createValidator(REPO_ROOT);
    const validate = ajv.getSchema("handoff");
    assert.ok(validate);
  });
});

describe("orchestrator", () => {
  it("launches with model snapshot and rejects advisor gate waive", async () => {
    const { store, dir } = tempStore();
    const leases = new LeaseManager(store);
    const evidence = new EvidenceStore(store, join(dir, "evidence"));
    const profile = loadModelProfile(REPO_ROOT);
    const avail = new Map(
      Object.values(profile.roles).flatMap((r) => [
        [r.model, true] as [string, boolean],
        ...r.allowedFallbacks.map((f) => [f, true] as [string, boolean]),
      ]),
    );
    const orch = new Orchestrator({
      store,
      leases,
      evidence,
      modelProfile: profile,
      availability: avail,
      gates: loadGates(REPO_ROOT),
      wip: {
        storyLanes: 4,
        juniorsPerStory: 3,
        interns: 8,
        seniors: 2,
        architects: 2,
        sharedFoundationLanes: 1,
      },
      repoRoot: REPO_ROOT,
      launcher: createMockLauncher(),
      specificationDigest: "spec",
      profileDigest: "prof",
      pluginDigest: "plug",
      repositoryFingerprint: "fp",
    });
    assert.equal(orch.acceptAdvisorProposal({ waiveGate: true }).accepted, false);
    assert.equal(orch.routeTask("search for MessageNormalizer"), "intern");
    const launch = await orch.launchRole({
      role: "intern",
      prompt: "inventory SharedConfig",
      cwd: REPO_ROOT,
    });
    assert.equal(launch.status, "ok");
    assert.equal(launch.primaryModel, "composer-2.5");
    assert.equal(launch.selectedModel, "composer-2.5");
    assert.ok(launch.sdkAgentId);
    assert.ok(launch.sdkRunId);

    const capacityLauncher = createMockLauncher({
      "senior:cursor-grok-4.5-high-fast": {
        status: "startup-failure",
        error: "capacity",
        capacityFailure: true,
      },
    });
    const orch2 = new Orchestrator({
      store,
      leases,
      evidence,
      modelProfile: profile,
      availability: avail,
      gates: loadGates(REPO_ROOT),
      wip: {
        storyLanes: 4,
        juniorsPerStory: 3,
        interns: 8,
        seniors: 2,
        architects: 2,
        sharedFoundationLanes: 1,
      },
      repoRoot: REPO_ROOT,
      launcher: capacityLauncher,
      specificationDigest: "spec",
      profileDigest: "prof",
      pluginDigest: "plug",
      repositoryFingerprint: "fp",
    });
    const fbLaunch = await orch2.launchRole({
      role: "senior",
      prompt: "integrate",
      cwd: REPO_ROOT,
    });
    assert.equal(fbLaunch.status, "ok");
    assert.equal(fbLaunch.selectedModel, "gpt-5.6-luna-xhigh");
    assert.ok(fbLaunch.fallbackReason);

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("blocks delivery without gate evidence and invokes principal", () => {
    const { store, dir } = tempStore();
    const leases = new LeaseManager(store);
    const evidence = new EvidenceStore(store, join(dir, "evidence"));
    const profile = loadModelProfile(REPO_ROOT);
    const orch = new Orchestrator({
      store,
      leases,
      evidence,
      modelProfile: profile,
      availability: new Map([["composer-2.5", true]]),
      gates: loadGates(REPO_ROOT),
      wip: {
        storyLanes: 4,
        juniorsPerStory: 3,
        interns: 8,
        seniors: 2,
        architects: 2,
        sharedFoundationLanes: 1,
      },
      repoRoot: REPO_ROOT,
      launcher: createMockLauncher(),
      specificationDigest: "spec",
      profileDigest: "prof",
      pluginDigest: "plug",
      repositoryFingerprint: "fp",
    });
    store.casDelivery("S1", null, "candidate", loadLifecycle(REPO_ROOT).deliveryTransitions);
    store.casDelivery(
      "S1",
      "candidate",
      "architect-ready",
      loadLifecycle(REPO_ROOT).deliveryTransitions,
    );
    const blocked = orch.transitionDelivery(
      "S1",
      "architect-ready",
      "subtask-ready",
      "run-missing",
      [],
    );
    assert.equal(blocked.ok, false);

    const ok = orch.transitionDelivery(
      "S1",
      "architect-ready",
      "subtask-ready",
      "run-ok",
      ["resource-claims", "story-brief", "discovery-report"],
    );
    assert.equal(ok.ok, true);

    orch.recordMerge("S1");
    orch.recordMerge("S2");
    orch.recordMerge("S3");
    orch.recordMerge("S4");
    const fifth = orch.recordMerge("S5");
    assert.equal(fifth.principalRequired, true);
    orch.applyPrincipalVerdict("S5", "continue", "healthy");

    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("credentials redaction", () => {
  it("redacts secrets and asserts clean strings", () => {
    const dirty = "token sk-abcdefghijklmnopqrstuvwxyz password=secret customer-email=a@b.com";
    const clean = redactSecrets(dirty);
    assert.ok(!clean.includes("sk-"));
    assert.ok(clean.includes("[REDACTED]"));
    assert.throws(() => assertNoSecrets(dirty, "test"));
    assertNoSecrets("no secrets here", "test");
  });
});

describe("recovery", () => {
  it("quarantines incomplete dispatches", () => {
    const { store, dir } = tempStore();
    const leases = new LeaseManager(store, 1);
    store.upsertRun({
      runId: "r1",
      attemptId: "a1",
      role: "junior",
      repositoryFingerprint: "fp",
      specificationDigest: "s",
      profileDigest: "p",
      modelProfileDigest: "m",
      pluginDigest: "pl",
      stateVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // mark as open-ish by setting sdk_run_id without evidence
    store.db
      .prepare(`UPDATE runs SET sdk_run_id = ? WHERE run_id = ?`)
      .run("sdk", "r1");
    const recovery = new RecoveryService(store, leases);
    const report = recovery.reconcile();
    assert.ok(report.openRuns >= 1);
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("self-test", () => {
  it("passes plugin self-tests", () => {
    const results = runSelfTests(REPO_ROOT);
    const failed = results.filter((r) => !r.ok);
    assert.deepEqual(failed, []);
  });
});
