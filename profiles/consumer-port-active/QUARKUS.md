# Quarkus target conventions (active reference)

Product-specific profile for the Fan360 consumer port. Murphy core stays domain-neutral; see `skills/murphy/WORKFLOW.md` → **Non-production-first**.

## House style (this product)

Follow the fundamental patterns shared by these Fan360 peer services:

- `reporting-service`
- `email-service`
- `campaign-service`
- `sms-service`

Details differ across those repos; copy the shared basics. Escalate industry-standard conflicts for discussion. Embellishments welcome. Behavior Ledger governs *what*; peer idioms govern *how*.

## Delivery posture

Applies Murphy’s **non-production-first** rule:

- Implementation and Story tests run in non-production first (local / CI / Testcontainers / mapped env).
- No production group join or cutover until rehearsal gates pass.
- Prefer peer Quarkus wiring; if Behavior Ledger semantics conflict with a peer pattern (e.g. stock DLQ), stop and discuss.

### Env mapping (this product)

| Murphy term | Fan360 instance |
|-------------|-----------------|
| Non-production | QA (+ local / Testcontainers) |
| Production | Live cutover |

## Stack pins

- Java 25
- Quarkus 3.34.5
- Maven
- `global-pom:3.0.0`
- `global-bom:2.5.1`
- Target org/repo: `sporting-innovations/consumer-service`

Keep jOOQ (modernized) for shared schema when peers do; do not blind-convert to Panache.
