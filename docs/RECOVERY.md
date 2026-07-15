# Recovery

## State store

Location: `~/.murphy-agent-kit/state/murphy-agent-kit.db` (SQLite WAL).

Every dispatch intent, mutation intent, result, gate decision, transition, denial, cancellation, and recovery action is append-only.

## Crash recovery

On startup the controller:

1. Reconciles unknown outcomes using SQLite, SDK agent/run status, Git/worktree state, and adapter evidence.
2. Quarantines abandoned workers, partial transitions, stale worktrees, and incomplete external mutations.
3. Reclaims expired leases only after fencing-token checks.
4. Escalates ambiguous recovery to a human — never invents a transition.

## Leases

Concurrent orchestration on one workstation uses transactional leases with fencing tokens, heartbeats, expiry, and reclamation. Multi-machine orchestration is unsupported in v1.

## Idempotency

Retries and tracker/source-control mutations use stable operation keys. Duplicate controllers cannot hold the same fenced resource lease or dispatch duplicate work.
