[< Parent](../index.md)

# DS-011.TS-3 — Reproducible Development Launch and Build

**Status:** 🟡 Planned
**Type:** Technical Story

## Technical Story

In order to eliminate manual production-manifest edits and forgotten shell exports, provide deterministic commands that pair each Tauri configuration with the correct Rust channel and Mirror runtime.

## Outcome

Repository commands launch/build development with its config overlay, Cargo feature and `~/mirror-dev.sh`-equivalent environment, while the user build retains the stable baseline.

## Acceptance Behavior

```text
Given a prepared repository
When the documented development command runs
Then it always builds com.nautilus.harness.dev with the development Rust channel
And no manual export or stable manifest edit is required
```

## Scope

- Tauri development config overlay.
- Cargo development-channel feature.
- Explicit dev/user package scripts or committed launcher.
- Build-time pairing guardrails.

## Out Of Scope

- Universal installer or update service.
- Replacing `~/mirror-dev.sh` for direct Pi CLI sessions.

## Validation

Static config tests and compilation/bundle metadata checks for both channels.
