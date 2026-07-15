# Quarkus target conventions (bootstrap reference)

Product-specific profile for the Fan360 consumer port. Murphy core stays domain-neutral; see `skills/murphy/WORKFLOW.md` → **Non-production-first**.

## House style (this product)

Follow the fundamental patterns shared by these Fan360 peer services:

- `reporting-service`
- `email-service`
- `campaign-service`
- `sms-service`

Details differ across those repos; copy the shared basics (stack, Maven/Jenkins, config, messaging shape, health/metrics, secrets). Escalate only when a pattern conflicts with industry standards or Behavior Ledger parity — otherwise org standards win. Embellishments are fine.

Behavior Ledger = *what* to preserve. Peer Quarkus idioms = *how* to code it. If those conflict, discuss — do not invent a silent third style.

## Delivery posture

Applies Murphy’s **non-production-first** rule:

- Do **not** require production throughput or live traffic numbers to freeze the playbook or open coding under `consumer-port-active`.
- Prove discovery/architecture against code, fixtures, and non-production evidence.
- Production / live legacy consumer stays untouched until non-production verification → rehearsal → cutover.

### Env mapping (this product)

| Murphy term | Fan360 instance |
|-------------|-----------------|
| Non-production | QA (+ local / Testcontainers) |
| Production | Live `fan360-consumer` / prod cutover |

Ops confirmation of optional/dead paths may be deferred to non-production with an explicit owner (not a silent skip).

## Stack pins

- Java 25
- Quarkus 3.34.5
- Maven
- `global-pom:3.0.0`
- `global-bom:2.5.1`
- Target org/repo: `sporting-innovations/consumer-service`

Keep jOOQ (modernized) for shared schema when peers do; do not blind-convert to Panache.
Implementation Stories are forbidden until `consumer-port-active` is frozen and qualified.
