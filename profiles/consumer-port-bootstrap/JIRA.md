# Jira inheritance for consumer-port profiles

All descendant issues of Epic [FAN360-13796](https://fan360.atlassian.net/browse/FAN360-13796) must match the Epic's current:

- Team: Platform Experience (`customfield_13000` = team id string `d550f451-7911-45e7-8b5c-eb03546afa70`)
- Assignee: Joey Lamping
- Product Feature: Fan Data Platform (`customfield_14281` = `{ "id": "12013" }`)
- Labels: include `fan360-consumer-uplift`
- Goals: match Epic Goals field

Mismatch blocks dispatch.

## Status hygiene (do not leave Stories in Backlog after ship)

When finishing Story work on this Epic, **transition Jira in the same turn** as the PR/commit:

| Event | Status |
| --- | --- |
| Implementation started | **In Progress** |
| PR open, awaiting review/merge | **In Review** (requires Team + Product Feature set first) |
| PR merged to the integration tip / `main` | **Ready for QA** |
| Not started / blocked / evidence still open | leave **Backlog** (or **Inactive**) |

Do not skip status updates because the PR queue is busy — board accuracy is part of Story completion.
