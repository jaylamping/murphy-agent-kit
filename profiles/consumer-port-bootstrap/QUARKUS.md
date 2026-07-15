# Quarkus target conventions (bootstrap reference)

## House style (authoritative)

Follow the fundamental patterns shared by:

- `reporting-service`
- `email-service`
- `campaign-service`
- `sms-service`

Details differ across those repos; copy the shared basics (stack, Maven/Jenkins, config, messaging shape, health/metrics, secrets). Escalate only when a pattern conflicts with industry standards or Behavior Ledger parity — otherwise org standards win. Embellishments are fine.

Behavior Ledger = *what* to preserve. Peer Quarkus idioms = *how* to code it. If those conflict, discuss — do not invent a silent third style.

## Delivery posture (QA-first)

- Do **not** require prod throughput or live traffic numbers to freeze the playbook or open coding under `consumer-port-active`.
- Live `fan360-consumer` stays untouched until QA → rehearsal → cutover.
- Ops/env confirmation of optional/dead paths may be deferred to QA with an explicit owner (not a silent skip).

## Stack pins

- Java 25
- Quarkus 3.34.5
- Maven
- `global-pom:3.0.0`
- `global-bom:2.5.1`
- Target org/repo: `sporting-innovations/consumer-service`

Keep jOOQ (modernized) for shared schema when peers do; do not blind-convert to Panache.
Implementation Stories are forbidden until `consumer-port-active` is frozen and qualified.
