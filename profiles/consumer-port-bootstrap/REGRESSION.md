# Regression oracle (bootstrap)

Bootstrap produces the behavior ledger and playbook. Full old-vs-new regression gates activate under `consumer-port-active` after discovery freeze.

## Non-production-first

Playbook freeze and profile switch do **not** require production throughput or live cutover evidence. Characterize from code + fixtures; confirm env-specific / traffic-sensitive ledger rows in non-production with owners.

For this product, non-production maps primarily to Fan360 QA.

Shadow/parity/rollback remain required before big-bang cutover (active profile).
