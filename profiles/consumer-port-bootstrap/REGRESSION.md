# Regression oracle (bootstrap)

Bootstrap produces the behavior ledger and playbook. Full old-vs-new regression gates activate under `consumer-port-active` after discovery freeze.

## QA-first

Playbook freeze and profile switch do **not** require production throughput or live cutover evidence. Characterize from code + fixtures; confirm env-specific / traffic-sensitive ledger rows during QA with owners.

Shadow/parity/rollback remain required before big-bang cutover (active profile).
