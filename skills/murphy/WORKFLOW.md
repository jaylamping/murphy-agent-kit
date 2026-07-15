# Murphy Workflow

## SDD lifecycle

`intent → spec-draft → spec-reviewed → spec-approved → planned → implementation-ready → implementing → verifying → release-ready → released`

Only the controller advances these states via CAS transitions after gate evidence.

## Delivery states (per Story)

`candidate → architect-ready → subtask-ready → junior-complete → senior-integrated → tests-passed → architect-approved → merge-ready`

## Batch governance

`batch-open → (optional) principal-review → continue | corrective-work | human-escalation`

After **≥3** merged Stories, a Principal glance is **recommended** (`principalCheckpointEvery.min`). By default this is **advisory** (`principalCheckpointBlocking: false`) — the batch stays open and work continues. The batch only pauses for Principal when blocking is explicitly enabled, or when a Principal **escalate** / other crucial gate fires.

Hard stops (do pause): failed tests, missing evidence, tracker mismatch, architect rejection, policy/credential issues, Principal escalate.

## Role order

1. **Intern** (default for search/inventory/trace) — readonly, cheapest
2. **Architect** preflight — readonly
3. **Junior** Subtasks — writable isolated worktrees, non-overlapping claims
4. **Senior** integration — Story worktree
5. Controller validators / CI gates
6. **Architect** final review — readonly; approval requires zero blocking findings
7. Merge-ready (no automatic merge)
8. **Principal** advisory glance after ≥3 Stories (does not pause unless blocking/escalate)

## Default-to-Intern

All find/where/search/trace/inventory/locate tasks go to Intern unless evidence is already in context or a logged narrow-read exception applies.

## Parallelism

- Independent Intern searches may run concurrently
- Junior Subtasks only when claims/paths do not overlap
- Story lanes up to profile WIP caps
- Shared foundation resources serialize via exclusive lease

## Stop conditions

Pause only when crucial: ambiguity/scope drift that blocks progress, failed tests, missing evidence, tracker mismatch, policy denial, credential issues, or Principal **escalate** → per `packages/contracts/escalation.json`. Routine Principal cadence alone does not stop the flow.

## Non-production-first (core posture)

Murphy does not assume any vendor's environment names. Default delivery posture:

1. Prove work in **non-production** (local, CI, staging, or whatever the active profile names).
2. Do **not** require production traffic, throughput, or live cutover evidence to freeze specs/playbooks or start implementation.
3. Production touch / cutover only after non-production verification and any profile-defined rehearsal gates.

Product profiles may map “non-production” to a concrete env (e.g. QA) and add peer-service house styles. Those mappings stay in `profiles/<name>/`, never in the core.
