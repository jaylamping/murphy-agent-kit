import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { StateStore } from "./state-store.js";
import { defaultDbPath, defaultStateDir, PLUGIN_VERSION } from "./types.js";
import { getCursorApiKey } from "./credentials.js";
import { loadModelProfile } from "./models.js";
import { loadGates, createValidator } from "./gates.js";

export interface SelfTestResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export function runSelfTests(repoRoot: string): SelfTestResult[] {
  const results: SelfTestResult[] = [];

  const pluginJson = join(repoRoot, ".cursor-plugin/plugin.json");
  results.push({
    name: "plugin-discovery",
    ok: existsSync(pluginJson),
    detail: pluginJson,
  });

  if (existsSync(pluginJson)) {
    const pj = JSON.parse(readFileSync(pluginJson, "utf8")) as {
      version: string;
      name: string;
    };
    results.push({
      name: "version-handshake",
      ok: pj.version === PLUGIN_VERSION && pj.name === "murphy-agent-kit",
      detail: `${pj.name}@${pj.version} vs ${PLUGIN_VERSION}`,
    });
  }

  results.push({
    name: "hooks-present",
    ok:
      existsSync(join(repoRoot, "hooks/hooks.json")) &&
      existsSync(join(repoRoot, "hooks/deny-destructive.mjs")),
  });

  try {
    const store = new StateStore(defaultDbPath(join(defaultStateDir(), "self-test")));
    store.appendEvent("self-test", { ok: true });
    store.close();
    results.push({ name: "writable-state-store", ok: true });
  } catch (err) {
    results.push({
      name: "writable-state-store",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    loadModelProfile(repoRoot, "balanced");
    results.push({ name: "model-profile", ok: true });
  } catch (err) {
    results.push({
      name: "model-profile",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    loadGates(repoRoot);
    createValidator(repoRoot);
    results.push({ name: "schema-compatibility", ok: true });
  } catch (err) {
    results.push({
      name: "schema-compatibility",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  results.push({
    name: "sdk-auth-env",
    ok: true,
    detail: getCursorApiKey()
      ? "CURSOR_API_KEY present"
      : "CURSOR_API_KEY absent (ok for deterministic qualification)",
  });

  results.push({
    name: "skill-files",
    ok:
      existsSync(join(repoRoot, "skills/murphy/SKILL.md")) &&
      existsSync(join(repoRoot, "skills/murphy/WORKFLOW.md")) &&
      existsSync(join(repoRoot, "skills/murphy/HANDOFFS.md")),
  });

  results.push({
    name: "role-prompts",
    ok: ["intern", "junior", "senior", "architect", "principal"].every((r) =>
      existsSync(join(repoRoot, "roles", `${r}.md`)),
    ),
  });

  return results;
}
