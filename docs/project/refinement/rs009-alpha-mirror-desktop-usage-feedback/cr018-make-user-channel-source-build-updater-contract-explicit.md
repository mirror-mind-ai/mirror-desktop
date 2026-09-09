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

Not planned. Characterize the two user-channel commands, define whether they represent a
signed release build or a local non-updating validation build, and then align launcher,
configuration, tests, and documentation without weakening updater trust.

## Evidence

Captured during CR017 proportionality review. The failure mechanism is the same Tauri
updater deserialization boundary observed in the pre-repair Dev bundle; no generic
user-channel execution was performed as part of this capture.

## Outcome

No outcome. CR018 is captured and unassigned.

## Authority Boundary

Capture does not authorize selection, planning, implementation, commit, push,
publication, release, endpoint mutation, or production promotion.
