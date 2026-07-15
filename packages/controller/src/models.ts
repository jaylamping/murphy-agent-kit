import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { sha256, type Role } from "./types.js";

export type MurphyRole = Exclude<Role, "human">;

export interface RoleModelConfig {
  model: string;
  allowedFallbacks: string[];
}

export interface ModelProfile {
  name: string;
  version: string;
  fallbackPolicy: "allowlisted";
  roles: Record<MurphyRole, RoleModelConfig>;
  digest: string;
}

interface RawProfiles {
  profiles: Record<
    string,
    {
      version: string;
      fallbackPolicy: string;
      orchestrator: { model: string; allowedFallbacks: string[] };
      nose: { model: string; allowedFallbacks: string[] };
      pup: { model: string; allowedFallbacks: string[] };
      lead: { model: string; allowedFallbacks: string[] };
      judge: { model: string; allowedFallbacks: string[] };
      shepherd: { model: string; allowedFallbacks: string[] };
    }
  >;
}

export type ModelAvailability = Map<string, boolean>;

export interface ModelSelection {
  primaryModel: string;
  selectedModel: string;
  fallbackReason?: string;
}

export function loadModelProfile(
  repoRoot: string,
  name = "balanced",
): ModelProfile {
  const path = join(repoRoot, "config", "model-profiles.yaml");
  const raw = yaml.load(readFileSync(path, "utf8")) as RawProfiles;
  const profile = raw.profiles[name];
  if (!profile) {
    throw new Error(`Unknown model profile: ${name}`);
  }
  if (profile.fallbackPolicy !== "allowlisted") {
    throw new Error(`Unsupported fallbackPolicy: ${profile.fallbackPolicy}`);
  }
  const roles: ModelProfile["roles"] = {
    orchestrator: profile.orchestrator,
    nose: profile.nose,
    pup: profile.pup,
    lead: profile.lead,
    judge: profile.judge,
    shepherd: profile.shepherd,
  };
  const digest = sha256(JSON.stringify({ name, ...profile }));
  return {
    name,
    version: profile.version,
    fallbackPolicy: "allowlisted",
    roles,
    digest,
  };
}

export function selectModel(
  profile: ModelProfile,
  role: MurphyRole,
  availability: ModelAvailability,
  failure?: { kind: "pre-execution-capacity"; message: string },
): ModelSelection | { error: string } {
  const cfg = profile.roles[role];
  if (!cfg) return { error: `no model config for role ${role}` };

  const primaryAvailable = availability.get(cfg.model) !== false;
  if (primaryAvailable && !failure) {
    return { primaryModel: cfg.model, selectedModel: cfg.model };
  }

  if (!failure && primaryAvailable === false) {
    // absent before launch
    const fb = cfg.allowedFallbacks.find((m) => availability.get(m) !== false);
    if (!fb) {
      return {
        error: `primary ${cfg.model} unavailable and no allowlisted fallback for ${role}`,
      };
    }
    return {
      primaryModel: cfg.model,
      selectedModel: fb,
      fallbackReason: "primary-absent",
    };
  }

  if (failure?.kind === "pre-execution-capacity") {
    const fb = cfg.allowedFallbacks.find((m) => availability.get(m) !== false);
    if (!fb) {
      return {
        error: `capacity failure on ${cfg.model} with no allowlisted fallback`,
      };
    }
    if (!cfg.allowedFallbacks.includes(fb)) {
      return { error: `fallback ${fb} not allowlisted for ${role}` };
    }
    return {
      primaryModel: cfg.model,
      selectedModel: fb,
      fallbackReason: failure.message,
    };
  }

  return {
    error:
      "fallback refused: ambiguous or post-execution failure must not relaunch",
  };
}

export function validateAgainstAllowlist(
  profile: ModelProfile,
  role: MurphyRole,
  selectedModel: string,
): boolean {
  const cfg = profile.roles[role];
  return (
    cfg.model === selectedModel || cfg.allowedFallbacks.includes(selectedModel)
  );
}
