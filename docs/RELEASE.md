# Release

## v0.1.1 — docs, install, and bootstrap profile

| Field | Value |
|-------|-------|
| Plugin version | `0.1.1` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` `1.0.0` |
| State schema version | `1` |
| Git tag | `v0.1.1` |
| Git SHA | `3ae34181b0eba137e45e1f0caf2d0dfb0e8dd759` |
| Qualification | Unchanged from v0.1.0; see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.0

- README: architecture and SDD lifecycle diagrams, roles, repo map, docs index
- Local install copies into `~/.cursor/plugins/local/` instead of an out-of-tree symlink
- Windows install path and notes
- Public repository visibility documented
- Bootstrap profile records `githubOrg` / `serviceRepo` for sporting-innovations/consumer-service

### Known limitations

Same as v0.1.0:

- Live `@cursor/sdk` agent launches require `CURSOR_API_KEY`; deterministic qualification uses mock launchers.
- Multi-machine orchestration is unsupported in v1.
- Walk through the live user-observed demo against this SHA before migration work.
- Re-qualify `consumer-port-active` after discovery/playbook freeze before implementation Stories.

### Install this release

```bash
git checkout v0.1.1
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.1
```

## v0.1.0 — initial qualified kit

| Field | Value |
|-------|-------|
| Plugin version | `0.1.0` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` `1.0.0` |
| State schema version | `1` |
| Git tag | `v0.1.0` |
| Git SHA | `18076a4f4535b02f18c89a628bd9f2599701200b` |
| Qualification | See `docs/QUALIFICATION-REPORT.md` |

### Known limitations

- Live `@cursor/sdk` agent launches require `CURSOR_API_KEY`; deterministic qualification uses mock launchers.
- Multi-machine orchestration is unsupported in v1.
- User-observed live demo (parallel lanes, conflict serialization, scope violation, Architect rejection, Principal correction, human escalation, Intern discovery resume) should be walked through once against this SHA before migration work begins.
- `consumer-port-active` must be re-qualified after discovery/playbook freeze before implementation Stories.

### Install this release

```bash
git checkout v0.1.0
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.0
```
