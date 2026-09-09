[< Refinement Workbench](../index.md)

# CR007 — Document simple Windows manual build path

## Problem

Add minimal Windows manual build instructions for Mirror Desktop so another person can pull from GitHub and generate a local Windows executable manually. Document prerequisites, git pull/npm install/build commands, output location, current limitations around Windows auto-update/signing/SmartScreen, and link it from README. Do not implement Windows updater, release train, CI, publication, push, tag, notarization, or mutate Mirror/app user data.

## Expected Behavior

Not separately recorded in the legacy Workbench entry.

## Impact

Captured as `navigator-request` refinement work for `mirror-desktop`. Provenance:
after deciding not to complicate multi-platform release coordination yet.

## Plan Or Decision

No separately structured plan was preserved in the legacy Workbench record.

## Evidence

Validation evidence: Validated npm test -- src/tests/windowsManualBuildDocumentation.test.ts; npm run build; full npm test passed with 112 files and 622 tests.
Done note: CR007 closed. No Windows updater, release train, CI, endpoint publication, push, tag, notarization, Mirror data mutation, app data mutation or Nautilus state mutation was performed.

## Outcome

Validation evidence: Validated npm test -- src/tests/windowsManualBuildDocumentation.test.ts; npm run build; full npm test passed with 112 files and 622 tests.
Done note: CR007 closed. No Windows updater, release train, CI, endpoint publication, push, tag, notarization, Mirror data mutation, app data mutation or Nautilus state mutation was performed.

## Migration Provenance

- Legacy record: `7111ab4b`.
- Created: `2026-09-08T19:36:04.360062Z`.
- Last updated: `2026-09-08T19:40:26.172211Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
