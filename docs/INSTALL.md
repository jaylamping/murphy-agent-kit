# Install

## Local development

1. Clone `jaylamping/murphy-agent-kit`.
2. `pnpm install && pnpm build`
3. `pnpm run install:local` — **copies** into `~/.cursor/plugins/local/murphy-agent-kit` (out-of-tree symlinks are rejected by Cursor)
4. **Developer: Reload Window**
5. Confirm **Plugins** shows Murphy Agent Kit, then invoke `/murphy` or `pnpm murphy self-test`

Do **not** install under `~/.cursor/skills-cursor/` (reserved for built-in skills).

## Immutable release install

Install from an approved tag/SHA only:

```bash
git checkout vX.Y.Z
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version X.Y.Z
```

Do not upgrade while runs are active. Failed handshake or migration rolls back to the previous package and database backup.

## Environment

| Variable | Purpose |
|----------|---------|
| `CURSOR_API_KEY` | SDK agent launches |
| `MURPHY_STATE_DIR` | Override state directory (default `~/.murphy-agent-kit`) |
| `MURPHY_PROFILE` | Default project profile name |

Credentials must come from environment or keychain injection — never YAML, SQLite, or prompts.

## Supported versions

| Component | Supported |
|-----------|-----------|
| Node.js | >= 22 |
| pnpm | 10.x |
| Git | worktree-capable |
| @cursor/sdk | 1.0.23 |
| OS | macOS, Windows (Linux untested) |

## Windows notes

- Same Node/pnpm/Git/`@cursor/sdk` stack; state lives under `%USERPROFILE%\.murphy-agent-kit\`.
- `pnpm run install:local` uses a directory **junction** (no admin required in most setups).
- If install still fails, turn on Windows Developer Mode and retry.
- Owner-only `chmod` is skipped on NTFS; keep the Windows account locked down instead.
- Qualification evidence so far was collected on macOS — run `pnpm murphy self-test` and `pnpm qualify` once on the Windows box before relying on it for migration work.
