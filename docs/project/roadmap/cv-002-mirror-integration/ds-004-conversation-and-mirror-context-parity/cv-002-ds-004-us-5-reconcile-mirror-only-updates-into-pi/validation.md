# Validation — CV-002.DS-004.US-5

## Status

Passed

## Automated Checks

- Harness npm test — 26 files, 176 tests passed
- Harness npm run build — passed
- Harness cargo test — 8 tests passed
- Harness cargo check — passed
- Python Mirror inspector unittest — 4 tests passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated mapped Mirror-only pair on viagem-do-lipe. Before approval, generation remained 0, visible messages remained 28, Pi leaf remained 68a2ad1a and SHA-256 remained 14d6a2762077b61e02d9267244d2d8f5e12c054202151257f6002873a7c1e889. Explicit approval created generation 1, preserved that old Pi file as backup, activated leaf import-message-30 with branch count 31, materialized exactly two deterministic Mirror-derived Harness messages, reached in_sync, and remained unique after focus/relaunch. E2E exposed and verified the fix for a session-header off-by-one checkpoint and compact notice spacing.

## Navigator Validation

Route: Completed: observe exact Mirror-only pair on Journey activation; review inert preview; verify pre-approval Pi digest/identity; explicitly create reconciled branch; focus/relaunch and verify uniqueness plus cleared warning.

Navigator accepted: yes

Expected observation: One inert preview before approval, no Pi mutation or run; one explicit generation transition after approval; old branch preserved; accepted pair appears once; in_sync survives relaunch without warning.

Pass condition: Pre-approval Pi is unchanged, eligible approval creates one rollback-safe hydrated generation, all checkpoints align, and focus/relaunch do not duplicate or warn.

Fail condition: Automatic chat/Pi mutation, provider execution, duplicate pair/generation, lost old branch, stale warning, or checkpoint divergence.

## Missing Evidence

- none
