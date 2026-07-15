# Release

## v0.1.0 — initial qualified kit

| Field | Value |
|-------|-------|
| Plugin version | `0.1.0` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` `1.0.0` |
| State schema version | `1` |
| Git tag | `v0.1.0` |
| Git SHA | _(filled at tag time)_ |
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
