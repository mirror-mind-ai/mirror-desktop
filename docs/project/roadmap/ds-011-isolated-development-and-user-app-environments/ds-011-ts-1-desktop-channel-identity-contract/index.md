[< Parent](../index.md)

# DS-011.TS-1 — Desktop Channel Identity Contract

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to prevent a development build from masquerading as the daily-use app, define one closed native runtime-channel contract shared by Tauri setup, process routing and frontend diagnostics.

## Outcome

`user` and `development` have explicit product name, bundle identifier, app-data identity and Mirror runtime coordinates. Rust selects the channel through build configuration, validates the merged Tauri identity before exposing commands and publishes only a sanitized diagnostic projection.

## Acceptance Behavior

```text
Given a binary compiled for one runtime channel
When Tauri resolves its product, bundle and app-data identity
Then every coordinate matches the closed channel profile
Or startup fails before state mutation or process invocation
```

## Scope

- Closed Rust channel enum and profile.
- Compile-time development feature.
- Tauri setup preflight.
- Strict diagnostic transport.
- Pure profile and mismatch tests.

## Out Of Scope

- Visual redesign.
- Mirror process routing implementation owned by TS-2.
- Runtime channel selection from user preferences.

## Validation

Rust unit tests plus startup/config mismatch characterization for both channels.
