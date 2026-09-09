[< Refinement Workbench](../index.md)

# CR001 — Configure signed updater channel before real self-update validation

## Problem

Technical validation of CV-007.DS-003 found that the UI bridge, Tauri updater/process plugins, ACL permissions and local build are present, but src-tauri/tauri.conf.json has no plugins.updater configuration. Required before real installed-app self-update validation: HTTPS updater endpoint(s), updater public key, signed updater artifacts/signatures, and a previous installed version pointed at a manifest offering a newer compatible version. Until this is done, the app can build but check() will fail at runtime with no updater endpoints instead of notifying users about real updates.

## Expected Behavior

Not separately recorded in the legacy Workbench entry.

## Impact

Captured as `technical-validation` refinement work for `mirror-desktop`. Provenance:
mirror-desktop CV-007.DS-003 post-implementation validation.

## Plan Or Decision

No separately structured plan was preserved in the legacy Workbench record.

## Evidence

Validation evidence: Validated CR001 in mirror-desktop. npm run self-update:preflight succeeds with the non-production overlay. Running node scripts/self_update_preflight.mjs without overlay remains blocked, proving missing updater config is caught. npm test passes all suites, 107 files and 601 tests. npm run build passes. cd src-tauri && cargo check passes. npm run tauri -- build --bundles app --no-sign --config src-tauri/tauri.self-update.test.conf.json passes and the produced app binary embeds the test HTTPS updater endpoint and test public key.
Done note: CR001 closed as a validation-channel guardrail. The repository can now prove whether a release/self-update build includes updater endpoint/pubkey configuration without creating keys, publishing artifacts, pushing tags or exposing a production endpoint. Real user self-update rehearsal still requires separately authorized release artifacts and endpoint publication.

## Outcome

Validation evidence: Validated CR001 in mirror-desktop. npm run self-update:preflight succeeds with the non-production overlay. Running node scripts/self_update_preflight.mjs without overlay remains blocked, proving missing updater config is caught. npm test passes all suites, 107 files and 601 tests. npm run build passes. cd src-tauri && cargo check passes. npm run tauri -- build --bundles app --no-sign --config src-tauri/tauri.self-update.test.conf.json passes and the produced app binary embeds the test HTTPS updater endpoint and test public key.
Done note: CR001 closed as a validation-channel guardrail. The repository can now prove whether a release/self-update build includes updater endpoint/pubkey configuration without creating keys, publishing artifacts, pushing tags or exposing a production endpoint. Real user self-update rehearsal still requires separately authorized release artifacts and endpoint publication.

## Migration Provenance

- Legacy record: `3a6207db`.
- Created: `2026-09-07T19:10:08.078080Z`.
- Last updated: `2026-09-07T22:24:31.605598Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
