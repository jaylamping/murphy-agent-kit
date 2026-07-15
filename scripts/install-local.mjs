#!/usr/bin/env node
/**
 * Install murphy-agent-kit into ~/.cursor/plugins/local/murphy-agent-kit
 * (symlink on POSIX; directory junction on Windows).
 */
import { mkdirSync, rmSync, symlinkSync, existsSync, readFileSync } from "node:fs";
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

const isWindows = process.platform === "win32";
/** Junctions do not require elevated privileges on Windows; symlinks often do. */
const linkType = isWindows ? "junction" : "dir";
const method = isWindows ? "junction-local" : "symlink-local";

try {
  symlinkSync(repoRoot, target, linkType);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: message,
        hint: isWindows
          ? "Enable Windows Developer Mode, or run from an elevated shell, then retry."
          : "Ensure the install path is writable, then retry.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

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
      method,
      platform: process.platform,
    },
    null,
    2,
  ),
);
