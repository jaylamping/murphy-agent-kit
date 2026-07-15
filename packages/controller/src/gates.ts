import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { StateStore } from "./state-store.js";
import type { EvidenceStore } from "./evidence.js";

type AddFormats = (ajv: Ajv2020) => Ajv2020;
const addFormats = (
  typeof addFormatsModule === "function"
    ? addFormatsModule
    : (addFormatsModule as { default: AddFormats }).default
) as AddFormats;

export interface GateDef {
  id: string;
  name: string;
  when: string;
  requiredEvidence: string[];
  blocking: boolean;
}

export interface GateDecision {
  gateId: string;
  passed: boolean;
  missing: string[];
  blocking: boolean;
}

export function loadLifecycle(repoRoot: string) {
  return JSON.parse(
    readFileSync(join(repoRoot, "packages/contracts/lifecycle.json"), "utf8"),
  ) as {
    sddTransitions: Record<string, string[]>;
    deliveryTransitions: Record<string, string[]>;
    batchTransitions: Record<string, string[]>;
    principalCheckpointEvery: { min: number; max: number };
  };
}

export function loadGates(repoRoot: string): GateDef[] {
  const raw = JSON.parse(
    readFileSync(join(repoRoot, "packages/contracts/gates.json"), "utf8"),
  ) as { gates: GateDef[] };
  return raw.gates;
}

export function createValidator(repoRoot: string) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemasDir = join(repoRoot, "packages/contracts/schemas");
  const names = [
    "sdd-lifecycle",
    "delivery-state",
    "discovery-request",
    "discovery-report",
    "parallel-plan",
    "resource-claims",
    "model-profile",
    "handoff",
    "gates",
    "role-permissions",
    "escalation",
    "specification",
    "profile",
  ];
  for (const name of names) {
    const schema = JSON.parse(
      readFileSync(join(schemasDir, `${name}.schema.json`), "utf8"),
    );
    ajv.addSchema(schema, name);
  }
  return ajv;
}

export class GateEvaluator {
  constructor(
    private readonly store: StateStore,
    private readonly evidence: EvidenceStore,
    private readonly gates: GateDef[],
  ) {}

  evaluate(
    when: string,
    evidenceRunId: string,
    extraPresent: string[] = [],
  ): GateDecision[] {
    const applicable = this.gates.filter((g) => g.when === when);
    return applicable.map((g) => {
      const present = new Set([
        ...this.evidence.listKinds(evidenceRunId),
        ...extraPresent,
      ]);
      const missing = g.requiredEvidence.filter((e) => !present.has(e));
      const decision: GateDecision = {
        gateId: g.id,
        passed: missing.length === 0,
        missing,
        blocking: g.blocking,
      };
      this.store.appendEvent(
        "gate-decision",
        { when, ...decision },
        evidenceRunId,
      );
      return decision;
    });
  }

  allPassed(decisions: GateDecision[]): boolean {
    return decisions.every((d) => d.passed || !d.blocking);
  }
}

export function classifyDiscoveryTask(text: string): boolean {
  return /\b(find|where|search|trace|inventory|locate|show me the existing pattern)\b/i.test(
    text,
  );
}

export function isOversizedStory(estimatePoints: number, maxPoints = 8): boolean {
  return estimatePoints > maxPoints;
}

export function trackerInheritanceMatch(
  epic: Record<string, string>,
  child: Record<string, string>,
  fields: string[],
): { ok: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  for (const f of fields) {
    if ((epic[f] ?? "") !== (child[f] ?? "")) mismatches.push(f);
  }
  return { ok: mismatches.length === 0, mismatches };
}
