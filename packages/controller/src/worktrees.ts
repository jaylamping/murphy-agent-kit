import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { sha256 } from "./types.js";

export interface WorktreeInfo {
  path: string;
  branch: string;
  baseSha: string;
}

export interface RepositoryFingerprint {
  commitSha: string;
  stagedHash: string;
  unstagedHash: string;
  untrackedHash: string;
  digest: string;
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function repositoryFingerprint(cwd: string): RepositoryFingerprint {
  const commitSha = git(cwd, ["rev-parse", "HEAD"]);
  const staged = git(cwd, ["diff", "--cached"]);
  const unstaged = git(cwd, ["diff"]);
  const untracked = git(cwd, ["ls-files", "--others", "--exclude-standard"]);
  const stagedHash = sha256(staged);
  const unstagedHash = sha256(unstaged);
  const untrackedHash = sha256(untracked);
  const digest = sha256(
    [commitSha, stagedHash, unstagedHash, untrackedHash].join("|"),
  );
  return { commitSha, stagedHash, unstagedHash, untrackedHash, digest };
}

export function contentDigest(root: string): string {
  const hash = createHash("sha256");
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === ".git" || name === "node_modules" || name === "target") continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else {
        hash.update(p);
        hash.update(readFileSync(p));
      }
    }
  };
  if (existsSync(root)) walk(root);
  return hash.digest("hex");
}

export class WorktreeManager {
  constructor(
    private readonly repoRoot: string,
    private readonly worktreeRoot: string,
  ) {
    mkdirSync(worktreeRoot, { recursive: true, mode: 0o700 });
  }

  create(branch: string, baseSha?: string): WorktreeInfo {
    const path = join(this.worktreeRoot, branch.replace(/\//g, "__"));
    if (existsSync(path)) {
      throw new Error(`worktree already exists: ${path}`);
    }
    const sha = baseSha ?? git(this.repoRoot, ["rev-parse", "HEAD"]);
    try {
      git(this.repoRoot, ["branch", branch, sha]);
    } catch {
      /* branch may exist */
    }
    git(this.repoRoot, ["worktree", "add", path, branch]);
    return { path, branch, baseSha: sha };
  }

  remove(branch: string): void {
    const path = join(this.worktreeRoot, branch.replace(/\//g, "__"));
    try {
      git(this.repoRoot, ["worktree", "remove", "--force", path]);
    } catch {
      /* ignore */
    }
    try {
      git(this.repoRoot, ["branch", "-D", branch]);
    } catch {
      /* ignore */
    }
  }
}
