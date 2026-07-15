#!/usr/bin/env node
/**
 * Install murphy-agent-kit into ~/.cursor/plugins/local/murphy-agent-kit
 * via symlink for local development.
 */
import { mkdirSync, rmSync, symlinkSync, existsSync, readFileSync, chmodSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const localPlugins = join(homedir(), ".cursor", "plugins", "local");
const target = join(localPlugins, "murphy-agent-kit");

mkdirSync(localPlugins, { recursive: true, mode: 0o700 });

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

symlinkSync(repoRoot, target, "dir");

const pluginJson = JSON.parse(
  readFileSync(join(repoRoot, ".cursor-plugin", "plugin.json"), "utf8"),
);

console.log(
  JSON.stringify(
    {
      ok: true,
      plugin: pluginJson.name,
      version: pluginJson.version,
      installPath: target,
      source: repoRoot,
      method: "symlink-local",
    },
    null,
    2,
  ),
);
