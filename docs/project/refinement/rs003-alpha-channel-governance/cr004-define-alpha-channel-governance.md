[< Refinement Workbench](../index.md)

# CR004 — Define alpha channel governance

## Problem

Create alpha channel governance for Mirror Desktop: document updater key custody, alpha/private-test separation, release runbook, retention and cleanup policy, notarization decision boundary, and add an alpha updater overlay plus validation tests. Do not publish an alpha release, push, tag, notarize, mutate production Mirror data, or change app user data.

## Expected Behavior

Not separately recorded in the legacy Workbench entry.

## Impact

Captured as `navigator-request` refinement work for `mirror-desktop`. Provenance:
after private test update publication rehearsal.

## Plan Or Decision

No separately structured plan was preserved in the legacy Workbench record.

## Evidence

Validation evidence: Validated npm run alpha:channel:check; npm test -- src/tests/alphaChannelGovernance.test.mjs src/tests/selfUpdatePreflight.test.mjs; npm run build; full npm test passed with 111 files and 616 tests.
Done note: CR004 closed. No alpha release publication, push, tag, GitHub Release, notarization, production Mirror data mutation, app user data mutation or Nautilus state mutation was performed.

## Outcome

Validation evidence: Validated npm run alpha:channel:check; npm test -- src/tests/alphaChannelGovernance.test.mjs src/tests/selfUpdatePreflight.test.mjs; npm run build; full npm test passed with 111 files and 616 tests.
Done note: CR004 closed. No alpha release publication, push, tag, GitHub Release, notarization, production Mirror data mutation, app user data mutation or Nautilus state mutation was performed.

## Migration Provenance

- Legacy record: `b316d2d0`.
- Created: `2026-09-08T18:49:38.786114Z`.
- Last updated: `2026-09-08T18:54:03.989069Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
