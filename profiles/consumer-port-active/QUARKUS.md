# Quarkus target conventions (active reference)

## House style (authoritative)

Follow the fundamental patterns shared by:

- `reporting-service`
- `email-service`
- `campaign-service`
- `sms-service`

Details differ across those repos; copy the shared basics. Escalate industry-standard conflicts for discussion. Embellishments welcome. Behavior Ledger governs *what*; peer idioms govern *how*.

## Delivery posture (QA-first)

- Implementation and Story tests run against QA / local / Testcontainers first.
- No prod cutover or live group join until rehearsal gates pass.
- Prefer peer Quarkus wiring; if Behavior Ledger semantics (e.g. custom Failure topics) conflict with a peer’s stock DLQ, stop and discuss.

## Stack pins

- Java 25
- Quarkus 3.34.5
- Maven
- `global-pom:3.0.0`
- `global-bom:2.5.1`
- Target org/repo: `sporting-innovations/consumer-service`

Keep jOOQ (modernized) for shared schema when peers do; do not blind-convert to Panache.
