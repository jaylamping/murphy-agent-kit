# Qualification

## How to run

```bash
pnpm install
pnpm test:controller   # deterministic controller tests (10× in qualify)
pnpm test:qualification
pnpm qualify           # full suite with repeat policy
```

## Rules

- Destructive cases use fake adapters and disposable worktrees.
- Qualification never mutates real Jira, opens real PRs, merges code, or contacts production.
- Grade repository evidence, hook logs, state records, and externally run tests — not agent prose.
- Agent-backed cases: 3 consecutive successes.
- Deterministic controller/lease/recovery/redaction/idempotency tests: 10 consecutive successes.
- Automatic retries do not count as a passing repetition.

## Evidence

Qualification writes under `qualification/evidence/<run-id>/`:

- Case results and fingerprints
- State transition logs
- Diff and gate decisions
- Latency and failure summaries

## Activation preflight

After fake-adapter qualification passes, run readonly preflight against real workspace metadata with all mutation paths disabled:

```bash
pnpm murphy preflight --readonly --profile consumer-port-bootstrap
```
