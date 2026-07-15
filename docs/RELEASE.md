# Release

## v0.1.7 — advisory Principal (≥3 turns); hard-stop only when crucial

| Field | Value |
|-------|-------|
| Plugin version | `0.1.7` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` / `consumer-port-active` `1.1.3` |
| State schema version | `1` |
| Git tag | `v0.1.7` |
| Git SHA | `f4af72cf683b213e3780cad3c1badfbb4b7e1a91` |
| Qualification | 47/47 with advisory Principal assertions |

### Changes since v0.1.6

- `principalCheckpointBlocking: false` by default — after ≥3 merges Principal is **recommended**, batch does **not** pause
- `principalDue` = `count >= min` (glance at least every 3 turns)
- Hard stops remain: failed tests, missing evidence, architect rejection, escalate, security/policy
- Profiles `1.1.3` aligned

### Install this release

```bash
git checkout v0.1.7
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.7
```

## v0.1.6 — Principal checkpoint every 5–7 Stories

| Field | Value |
|-------|-------|
| Plugin version | `0.1.6` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` / `consumer-port-active` `1.1.2` |
| State schema version | `1` |
| Git tag | `v0.1.6` |
| Git SHA | `e4a953a5f8460156283a5369ec7586a9dff3c63e` |
| Qualification | Unchanged suite; Principal due window updated — see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.5

- `principalCheckpointEvery` default and consumer-port profiles: **min 5 / max 7** (was 3–4)
- Docs/skills/README aligned; batch state id name unchanged (thresholds are profile-driven)

### Install this release

```bash
git checkout v0.1.6
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.6
```

## v0.1.5 — non-production-first in core

| Field | Value |
|-------|-------|
| Plugin version | `0.1.5` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` / `consumer-port-active` `1.1.1` |
| State schema version | `1` |
| Git tag | `v0.1.5` |
| Git SHA | `17abbfa6ef9ddceaa8c84cbc7286af6c3a84367b` |
| Qualification | Unchanged from v0.1.0; see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.4

- Core `WORKFLOW.md`: **non-production-first** posture (domain-neutral; no vendor env names)
- Consumer-port profiles `1.1.1`: map non-production → Fan360 QA; keep peer house style / repo pins in the profile only
- README clarifies profiles hold product env names and peer lists

### Install this release

```bash
git checkout v0.1.5
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.5
```

## v0.1.4 — peer house style + QA-first profiles

| Field | Value |
|-------|-------|
| Plugin version | `0.1.4` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` / `consumer-port-active` `1.1.0` |
| State schema version | `1` |
| Git tag | `v0.1.4` |
| Git SHA | `5a407f0d314583c90b47e6a2de8c4139c219ba59` |
| Qualification | Unchanged from v0.1.0; see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.3

- Consumer-port profiles `1.1.0`: authoritative peer Quarkus house style (`reporting` / `email` / `campaign` / `sms`)
- QA-first freeze/delivery posture (no prod throughput gate to start coding)
- Active profile gains `sporting-innovations/consumer-service` tracker fields + uplift label
- Escalate industry-standard conflicts; Behavior Ledger *what* vs peer idioms *how*

### Install this release

```bash
git checkout v0.1.4
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.4
```

## v0.1.3 — meet Murphy

| Field | Value |
|-------|-------|
| Plugin version | `0.1.3` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` `1.0.0` |
| State schema version | `1` |
| Git tag | `v0.1.3` |
| Git SHA | `898871b3bda08d1da8247f09a616e4323a718990` |
| Qualification | Unchanged from v0.1.0; see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.2

- README features Murphy, the kit's namesake (`docs/assets/murphy.jpg`)

### Install this release

```bash
git checkout v0.1.3
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.3
```

## v0.1.2 — version handshake fix

| Field | Value |
|-------|-------|
| Plugin version | `0.1.2` |
| Model profile | `balanced` `1.0.0` |
| Project profile | `consumer-port-bootstrap` `1.0.0` |
| State schema version | `1` |
| Git tag | `v0.1.2` |
| Git SHA | `be1ead61de71cd6ecee7f0f53791f49a6d92126f` |
| Qualification | Unchanged from v0.1.0; see `docs/QUALIFICATION-REPORT.md` |

### Changes since v0.1.1

- Controller reads `PLUGIN_VERSION` from `package.json` instead of a hardcoded `0.1.0` constant
- Prefer this tag over `v0.1.1` for `self-test --expect-version`

### Install this release

```bash
git checkout v0.1.2
pnpm install --frozen-lockfile
pnpm build
pnpm run install:local
pnpm murphy self-test --expect-version 0.1.2
```

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

Superseded by `v0.1.2`. The controller still exported hardcoded `PLUGIN_VERSION = "0.1.0"`, so `self-test --expect-version 0.1.1` failed.

### Changes since v0.1.0

- README: architecture and SDD lifecycle diagrams, roles, repo map, docs index
- Local install copies into `~/.cursor/plugins/local/` instead of an out-of-tree symlink
- Windows install path and notes
- Public repository visibility documented
- Bootstrap profile records `githubOrg` / `serviceRepo` for sporting-innovations/consumer-service

### Known limitations

Same as v0.1.0. Use `v0.1.2` instead of this tag.

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
