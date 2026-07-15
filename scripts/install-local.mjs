#!/usr/bin/env node
/**
 * Install murphy-agent-kit into ~/.cursor/plugins/local/murphy-agent-kit
 * as a real directory copy. Cursor rejects symlinks whose target is outside
 * ~/.cursor/plugins/local (logs: "symlink target ... is outside ...").
 */
import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  cpSync,
} from "node:fs";
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

cpSync(repoRoot, target, {
  recursive: true,
  dereference: true,
  filter: (src) => {
    const base = src.slice(repoRoot.length).replace(/^[\\/]/, "");
    if (!base) return true;
    const top = base.split(/[\\/]/)[0];
    return ![
      ".git",
      "node_modules",
      "packages/controller/dist",
      "qualification/evidence",
      ".turbo",
      "coverage",
    ].includes(top) && top !== "packages/controller/dist";
  },
});

const pluginJson = JSON.parse(
  readFileSync(join(target, ".cursor-plugin", "plugin.json"), "utf8"),
);

if (!existsSync(join(target, "skills", "murphy", "SKILL.md"))) {
  console.error(
    JSON.stringify({ ok: false, error: "skills/murphy/SKILL.md missing after copy" }),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      plugin: pluginJson.name,
      version: pluginJson.version,
      installPath: target,
      source: repoRoot,
      method: "directory-copy",
      platform: process.platform,
      note: "Reload Cursor (Developer: Reload Window). Out-of-tree symlinks are rejected.",
    },
    null,
    2,
  ),
);
