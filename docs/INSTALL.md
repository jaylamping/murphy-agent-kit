# Install

## Local development

1. Clone `jaylamping/murphy-agent-kit`.
2. `pnpm install && pnpm build`
3. `pnpm run install:local` — symlinks into `~/.cursor/plugins/local/murphy-agent-kit`
4. Reload Cursor
5. Invoke `/murphy` or `pnpm murphy self-test`

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
| OS | macOS |
