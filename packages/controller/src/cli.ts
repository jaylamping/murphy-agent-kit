#!/usr/bin/env node
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSelfTests } from "./self-test.js";
import { StateStore } from "./state-store.js";
import { LeaseManager } from "./leases.js";
import { RecoveryService } from "./recovery.js";
import { defaultDbPath, defaultStateDir, PLUGIN_VERSION } from "./types.js";
import { loadModelProfile } from "./models.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

function usage(): never {
  console.log(`murphy ${PLUGIN_VERSION}

Usage:
  murphy self-test [--expect-version X.Y.Z]
  murphy status
  murphy recover
  murphy version
  murphy qualify   (delegate to qualification runner)

Murphy conducts the crew. The controller holds the leash; /murphy is just the whistle.
`);
  process.exit(1);
}

function crewBlurb(openRuns: number): string {
  if (openRuns <= 0) return "all dogs home";
  if (openRuns === 1) return "1 dog out on the course";
  return `${openRuns} dogs out on the course`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd || cmd === "--help" || cmd === "-h") usage();

  if (cmd === "version") {
    console.log(PLUGIN_VERSION);
    return;
  }

  if (cmd === "self-test") {
    const expectIdx = args.indexOf("--expect-version");
    const expect =
      expectIdx >= 0 ? args[expectIdx + 1] : undefined;
    const results = runSelfTests(REPO_ROOT);
    const failed = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ version: PLUGIN_VERSION, results }, null, 2));
    if (expect && expect !== PLUGIN_VERSION) {
      console.error(`version handshake failed: expected ${expect}`);
      process.exit(2);
    }
    process.exit(failed.length ? 1 : 0);
  }

  if (cmd === "status") {
    const store = new StateStore();
    const open = store.listOpenRuns();
    console.log(
      JSON.stringify(
        {
          version: PLUGIN_VERSION,
          stateDir: defaultStateDir(),
          dbPath: defaultDbPath(),
          openRuns: open.length,
          crew: crewBlurb(open.length),
          modelProfile: loadModelProfile(REPO_ROOT).name,
        },
        null,
        2,
      ),
    );
    store.close();
    return;
  }

  if (cmd === "recover") {
    const store = new StateStore();
    const leases = new LeaseManager(store);
    const recovery = new RecoveryService(store, leases);
    const report = recovery.reconcile();
    console.log(JSON.stringify(report, null, 2));
    store.close();
    return;
  }

  if (cmd === "qualify") {
    const { spawnSync } = await import("node:child_process");
    const runner = join(REPO_ROOT, "qualification/tests/run-qualification.ts");
    const r = spawnSync(
      process.execPath,
      ["--import", "tsx", runner],
      { stdio: "inherit", cwd: REPO_ROOT },
    );
    process.exit(r.status ?? 1);
  }

  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
