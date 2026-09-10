[< Refinement Workbench](../index.md)

# CR018 — Make user-channel source build updater contract explicit

## Problem

CR017 fixed the packaged development channel by excluding updater initialization where
no updater contract exists. The generic user-channel commands `npm run tauri:user` and
`npm run tauri:build:user` still use the base Tauri configuration while registering the
updater plugin. Because the base configuration has no `plugins.updater` object, those
source-build routes may fail during setup unless an updater overlay is supplied.

## Expected Behavior

Every documented user-channel source-build command either supplies an explicit trusted
updater configuration or deliberately uses a separately named non-updating validation
contract. No command advertised as canonical should successfully compile an application
that aborts during setup because updater configuration is absent.

## Impact

This does not block the isolated Dev validation route restored by CR017 or the governed
alpha build, which already supplies its signed overlay. It leaves ambiguity in generic
user-channel development and build commands.

## Plan Or Decision

The generic user-channel routes represent the current trusted alpha user identity, not unsigned local validation:

- `npm run tauri:user` must overlay the governed alpha updater endpoint and public key before the user-channel updater plugin starts;
- `npm run tauri:build:user` must use the same overlay, create updater artifacts, and fail closed unless the trusted updater signing key is available;
- inherited updater private-key environment is removed before all launches, and only the closed user build route injects key contents;
- unsigned local validation remains exclusively `npm run tauri:build:dev` under the isolated development identity;
- release publication, installation, endpoint mutation, and production data access remain outside this change.

Driver: `@alissonvale`. Delivery: `refinement/rs009-cr010-shift-enter-line-breaks`.

## Implementation

The channel launcher now overlays `src-tauri/tauri.alpha-update.conf.json` for both generic user routes. The build route reads the updater key from `$HOME/.mirror-desktop-updater/alpha/updater.key` or the explicit `MIRROR_DESKTOP_UPDATER_SIGNING_KEY` path, injects it only into the child build, and gives an actionable refusal directing unsigned validation to the Dev bundle. Canonical development, alpha, and release guidance now states this contract.

Historical completed-story receipts remain historical evidence; they are not rewritten as current command authority.

## Evidence

Captured during CR017 proportionality review. The failure mechanism is the same Tauri updater deserialization boundary observed in the pre-repair Dev bundle. A regression contract now verifies that both user routes carry the exact governed overlay, that its endpoint and public key are present, and that user builds require explicit signing material.

Implementation checks:

- the focused runtime-channel configuration suite passed with 9 tests;
- the executable missing-key launcher test passed;
- all 642 frontend tests passed across 116 files;
- the canonical `npm run tauri:build:user -- -- --locked` route completed with the governed overlay;
- the build produced `Mirror Desktop.app`, the DMG, updater archive, and non-empty updater signature;
- native bundle inspection confirmed `ai.mirrormind.desktop`;
- an explicit nonexistent signing-key path failed closed with exit code 2 before Tauri launched and directed unsigned validation to `tauri:build:dev`;
- `git diff --check` passed before commit.

The user application was not launched, installed, published, or promoted.

## Navigator Validation

The Navigator accepted the technical validation evidence without opening the real user-channel application or touching its app-data boundary.

The proportionality review found the implementation appropriately bounded: it reuses the governed alpha overlay and existing closed launcher, introduces no second updater trust root, and confines private-key injection to the signing child process after clearing inherited signing variables. No follow-up technical debt was accepted.

## Outcome

CR018 was closed as `done` by explicit Navigator decision after successful trusted-build and fail-closed validation.

## Authority Boundary

Capture does not authorize selection, planning, implementation, commit, push,
publication, release, endpoint mutation, or production promotion.
