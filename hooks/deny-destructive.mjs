#!/usr/bin/env node
/**
 * Defense-in-depth shell gate. Controller remains authoritative.
 * Denies destructive git, force push, production deploys, and out-of-scope mutations
 * when MURPHY_ROLE is a readonly role.
 */
import { readFileSync } from "node:fs";

const DENY_PATTERNS = [
  /\bgit\s+push\s+.*--force\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd\b/i,
  /\bkubectl\s+.*\b(apply|delete|drain)\b/i,
  /\bterraform\s+apply\b/i,
  /\baws\s+.*\b(delete|terminate)\b/i,
];

const READONLY_DENY = [
  /\bgit\s+commit\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+checkout\b/i,
  /\bgh\s+pr\s+(create|merge|edit)\b/i,
  /\bjira\s+/i,
];

function main() {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {
    input = "";
  }

  let payload = {};
  try {
    payload = input ? JSON.parse(input) : {};
  } catch {
    payload = { command: input };
  }

  const command = String(payload.command ?? payload.cmd ?? "");
  const role = String(process.env.MURPHY_ROLE ?? payload.role ?? "unknown");
  const readonlyRoles = new Set(["nose", "judge", "shepherd", "orchestrator"]);

  for (const re of DENY_PATTERNS) {
    if (re.test(command)) {
      console.log(
        JSON.stringify({
          permission: "deny",
          reason: `murphy-hook: that command would scatter the flock (${re})`,
        }),
      );
      process.exit(0);
    }
  }

  if (readonlyRoles.has(role)) {
    for (const re of READONLY_DENY) {
      if (re.test(command)) {
        console.log(
          JSON.stringify({
            permission: "deny",
            reason: `murphy-hook: ${role} is on a sit-stay (readonly); mutating command blocked`,
          }),
        );
        process.exit(0);
      }
    }
  }

  console.log(JSON.stringify({ permission: "allow" }));
}

main();
