# Murphy Handoffs

All handoffs must validate against `packages/contracts/schemas/handoff.schema.json`.

## Kinds

| Kind | From → To | Purpose |
|------|-----------|---------|
| `discovery-request` | junior/senior/architect/principal → orchestrator | Pause and dispatch Intern |
| `discovery-report` | intern → requester | Cited evidence + gaps |
| `story-brief` | architect → junior/senior | Story scope and claims |
| `subtask-brief` | architect/senior → junior | Mechanical subtask + allowed paths |
| `implementation-result` | junior → senior | Commits, tests, risks |
| `integration-result` | senior → architect | Integrated Story evidence |
| `review-result` | architect → orchestrator | Findings; approval iff zero blocking |
| `principal-verdict` | principal → orchestrator | `continue` \| `correct` \| `escalate` |
| `escalation` | any → human | Focused human question |
| `gate-failure` | controller → orchestrator | Blocking gate evidence missing |

## Rules

- No schema-invalid handoff advances state
- No role approves its own work
- Discovery reports distinguish `direct` vs `inference` citations
- Principal escalate must cite an allowed human-escalation condition
