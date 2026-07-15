# Murphy Workflow

## SDD lifecycle

`intent → spec-draft → spec-reviewed → spec-approved → planned → implementation-ready → implementing → verifying → release-ready → released`

Only the controller advances these states via CAS transitions after gate evidence.

## Delivery states (per Story)

`candidate → architect-ready → subtask-ready → junior-complete → senior-integrated → tests-passed → architect-approved → merge-ready`

## Batch governance

`batch-open → three-or-four-stories-merged → principal-review → continue | corrective-work | human-escalation`

Principal reviews every 3–4 merged Stories.

## Role order

1. **Intern** (default for search/inventory/trace) — readonly, cheapest
2. **Architect** preflight — readonly
3. **Junior** Subtasks — writable isolated worktrees, non-overlapping claims
4. **Senior** integration — Story worktree
5. Controller validators / CI gates
6. **Architect** final review — readonly; approval requires zero blocking findings
7. Merge-ready (no automatic merge)
8. **Principal** checkpoint every 3–4 Stories

## Default-to-Intern

All find/where/search/trace/inventory/locate tasks go to Intern unless evidence is already in context or a logged narrow-read exception applies.

## Parallelism

- Independent Intern searches may run concurrently
- Junior Subtasks only when claims/paths do not overlap
- Story lanes up to profile WIP caps
- Shared foundation resources serialize via exclusive lease

## Stop conditions

Ambiguity, scope drift, failed tests, missing evidence, tracker mismatch, policy denial, credential issues, or Principal escalate → pause and escalate per `packages/contracts/escalation.json`.
