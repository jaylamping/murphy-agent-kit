# Murphy Agent Kit

Specification-Driven Development (SDD) orchestration kit for Cursor.

The TypeScript controller is the workflow authority. The `/murphy` skill is the user interface. Roles (Intern, Junior, Senior, Architect, Principal) are launched as top-level `@cursor/sdk` agents with explicit models and isolated worktrees.

## Requirements

- macOS or Windows (Linux should work; not yet qualification-tested)
- Node.js >= 22 (tested on 24 LTS)
- pnpm 10
- Git with worktree support
- Cursor with local plugin support
- `CURSOR_API_KEY` for live SDK agent launches (qualification of deterministic controller paths does not require it)

## Install (local development)

```bash
pnpm install
pnpm build
pnpm run install:local
```

This links the repo into `~/.cursor/plugins/local/murphy-agent-kit` (symlink on macOS/Linux, directory junction on Windows). Reload Cursor after install.

On Windows, if linking fails, enable **Developer Mode** (Settings → System → For developers) and retry.

Verify:

```bash
pnpm murphy self-test
```

## CLI

```bash
pnpm murphy --help
pnpm murphy self-test
pnpm murphy qualify
pnpm murphy status
```

## Profiles

- `profiles/consumer-port-bootstrap` — repository setup, Jira completion, readonly discovery, playbook creation
- `profiles/consumer-port-active` — implementation lanes (only after discovery/playbook freeze)

Consumer-specific values live only in profiles, never in core contracts.

## State

Durable SQLite state lives at `~/.murphy-agent-kit/state/murphy-agent-kit.db` (WAL mode; owner-only permissions on POSIX). Credentials are never stored there.

## License

UNLICENSED — personal repository.
