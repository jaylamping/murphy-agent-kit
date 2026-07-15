# Security

## Credential boundaries

- Read `CURSOR_API_KEY` and adapter credentials from environment/keychain only.
- Never store credentials in YAML, SQLite, context packets, prompts, transcripts, caches, or evidence.
- Intern, Architect, and Principal receive no mutating Jira/GitHub credentials.
- Only the controller performs approved external mutations through adapters with idempotency keys.

## Redaction

Suspected secrets, tokens, customer payloads, and sensitive paths are redacted before events or evidence are written. Qualification case 41 asserts secret/PII seeds never appear in retained artifacts.

## Role isolation

- Writable roles use controller-created Git worktrees.
- Readonly roles get a readonly snapshot, restrictive hooks, and before/after content digests.
- No role is trusted with secrets or production credentials.
- Hooks are defense in depth; the controller is the security and workflow boundary.

## Repository privacy

This repository must remain **private**. Setup stops if GitHub visibility is not private.
