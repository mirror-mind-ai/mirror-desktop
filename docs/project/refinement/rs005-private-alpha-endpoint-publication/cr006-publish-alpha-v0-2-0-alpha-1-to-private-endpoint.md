[< Refinement Workbench](../index.md)

# CR006 — Publish alpha v0.2.0-alpha.1 to private endpoint

## Problem

Publish the already prepared Mirror Desktop v0.2.0-alpha.1 candidate to the private alpha endpoint only. Validate release notes, manifests and artifacts. Do not push, tag, create GitHub Release, notarize, mutate Mirror data, change app user data, or announce public release.

## Expected Behavior

Not separately recorded in the legacy Workbench entry.

## Impact

Captured as `navigator-authorization` refinement work for `mirror-desktop`. Provenance:
explicit authorization: autorizo publicar o alpha v0.2.0-alpha.1 no endpoint alpha privado.

## Plan Or Decision

No separately structured plan was preserved in the legacy Workbench record.

## Evidence

Validation evidence: Validated endpoint: alpha release note 200, alpha release index 200, alpha darwin/darwin-x86_64/darwin-aarch64 manifests for 0.2.0-alpha.0 and 0.2.0-alpha.1 all 200, alpha updater artifact and DMG HEAD 200. Post-repair: root alpha release note 404, root alpha manifest 404, root private-test index restored. Tests: npm test -- src/tests/privateUpdatePublish.test.mjs passed 5 tests; npm run build passed; full npm test passed 111 files and 618 tests.
Done note: CR006 closed. Alpha endpoint publication completed only for the private alpha endpoint. No push, Git tag, GitHub Release, notarization, public release announcement, Mirror data mutation, app user data mutation or Nautilus state mutation was performed.

## Outcome

Validation evidence: Validated endpoint: alpha release note 200, alpha release index 200, alpha darwin/darwin-x86_64/darwin-aarch64 manifests for 0.2.0-alpha.0 and 0.2.0-alpha.1 all 200, alpha updater artifact and DMG HEAD 200. Post-repair: root alpha release note 404, root alpha manifest 404, root private-test index restored. Tests: npm test -- src/tests/privateUpdatePublish.test.mjs passed 5 tests; npm run build passed; full npm test passed 111 files and 618 tests.
Done note: CR006 closed. Alpha endpoint publication completed only for the private alpha endpoint. No push, Git tag, GitHub Release, notarization, public release announcement, Mirror data mutation, app user data mutation or Nautilus state mutation was performed.

## Migration Provenance

- Legacy record: `6af19f43`.
- Created: `2026-09-08T19:12:04.265376Z`.
- Last updated: `2026-09-08T19:14:51.623136Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
