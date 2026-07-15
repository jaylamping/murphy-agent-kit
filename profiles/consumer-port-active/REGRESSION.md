# Regression — active

Every Story must map to behavior-ledger entries. Shadow traffic and parity diffs are required before cutover. Shepherd cannot waive regression gates.

## Non-production-first

Build and prove slices in non-production (and local Testcontainers) before any production group join. Production throughput is a cutover concern, not a Story-start gate.

For this product, non-production maps primarily to Fan360 QA.
