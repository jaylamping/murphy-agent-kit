# Murphy Workflow

## SDD lifecycle

`intent → spec-draft → spec-reviewed → spec-approved → planned → implementation-ready → implementing → verifying → release-ready → released`

Only the controller advances these states via CAS transitions after gate evidence.

## Delivery states (per Story)

`candidate → judge-ready → subtask-ready → pup-complete → lead-integrated → tests-passed → judge-approved → merge-ready`

## Batch governance

`batch-open → (optional) shepherd-review → continue | corrective-work | human-escalation`

After **≥3** merged Stories, a Shepherd glance is **recommended** (`shepherdCheckpointEvery.min`). By default this is **advisory** (`shepherdCheckpointBlocking: false`) — the batch stays open and work continues. The batch only pauses for Shepherd when blocking is explicitly enabled, or when a Shepherd **escalate** / other crucial gate fires.

Hard stops (do pause): failed tests, missing evidence, tracker mismatch, Judge rejection, policy/credential issues, Shepherd escalate.

## Role order

1. **Nose** (default for search/inventory/trace) — readonly, cheapest
2. **Judge** preflight — readonly
3. **Pup** Subtasks — writable isolated worktrees, non-overlapping claims
4. **Lead** integration — Story worktree
5. Controller validators / CI gates
6. **Judge** final review — readonly; approval requires zero blocking findings
7. Merge-ready (no automatic merge)
8. **Shepherd** advisory glance after ≥3 Stories (does not pause unless blocking/escalate)

## Default-to-Nose

All find/where/search/trace/inventory/locate tasks go to Nose unless evidence is already in context or a logged narrow-read exception applies.

## Parallelism

- Independent Nose searches may run concurrently
- Pup Subtasks only when claims/paths do not overlap
- Story lanes up to profile WIP caps
- Shared foundation resources serialize via exclusive lease

## Stop conditions

Pause only when crucial: ambiguity/scope drift that blocks progress, failed tests, missing evidence, tracker mismatch, policy denial, credential issues, or Shepherd **escalate** → per `packages/contracts/escalation.json`. Routine Shepherd cadence alone does not stop the flow.

## Non-production-first (core posture)

Murphy does not assume any vendor's environment names. Default delivery posture:

1. Prove work in **non-production** (local, CI, staging, or whatever the active profile names).
2. Do **not** require production traffic, throughput, or live cutover evidence to freeze specs/playbooks or start implementation.
3. Production touch / cutover only after non-production verification and any profile-defined rehearsal gates.

Product profiles may map “non-production” to a concrete env (e.g. QA) and add peer-service house styles. Those mappings stay in `profiles/<name>/`, never in the core.
