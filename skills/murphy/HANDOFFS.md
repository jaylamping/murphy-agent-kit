# Murphy Handoffs

All handoffs must validate against `packages/contracts/schemas/handoff.schema.json`.

## Kinds

| Kind | From → To | Purpose |
|------|-----------|---------|
| `discovery-request` | pup/lead/judge/shepherd → orchestrator | Pause and dispatch Nose |
| `discovery-report` | nose → requester | Cited evidence + gaps |
| `story-brief` | judge → pup/lead | Story scope and claims |
| `subtask-brief` | judge/lead → pup | Mechanical subtask + allowed paths |
| `implementation-result` | pup → lead | Commits, tests, risks |
| `integration-result` | lead → judge | Integrated Story evidence |
| `review-result` | judge → orchestrator | Findings; approval iff zero blocking |
| `shepherd-verdict` | shepherd → orchestrator | `continue` \| `correct` \| `escalate` |
| `escalation` | any → human | Focused human question |
| `gate-failure` | controller → orchestrator | Blocking gate evidence missing |

## Rules

- No schema-invalid handoff advances state
- No role approves its own work
- Discovery reports distinguish `direct` vs `inference` citations
- Shepherd escalate must cite an allowed human-escalation condition
