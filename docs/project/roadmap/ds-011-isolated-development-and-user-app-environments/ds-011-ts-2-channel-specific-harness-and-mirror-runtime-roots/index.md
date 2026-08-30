[< Parent](../index.md)

# DS-011.TS-2 — Channel-Specific Harness and Mirror Runtime Roots

**Status:** 🟢 Done
**Type:** Technical Story

## Technical Story

In order to make isolation structural, route Harness persistence and every Mirror/Pi subprocess through the validated runtime-channel profile and bind dedicated generation authority to that channel.

## Outcome

Development uses only `~/.mirror-journeys/mirror-mind/mirror-dev`, `~/.mirror-minds/mirror-dev`, `MIRROR_USER=mirror-dev` and its development database/app-data root. Stable use preserves its existing roots and history. No missing path can fall back across channels.

## Acceptance Behavior

```text
Given Nautilus Dev is active
When registry, projection, provisioning, logging, reconciliation or Pi work runs
Then cwd and allowlisted Mirror environment resolve only to Mirror Dev
And stable Harness files and production Mirror rows remain unchanged
```

## Scope

- One native command-profile helper for `uv`, Python and Pi.
- Removal of hard-coded production roots and Harness-root fallback.
- Channel-aware Python bridges and bootstrap output.
- Channel marker in new thread/generation authority.
- Model-free stable legacy compatibility; no development adoption.

## Out Of Scope

- Copying production data into development.
- Provider credential management.
- Concurrent runs from DS-009.

## Validation

Rust, TypeScript and Python tests plus bounded before/after file and database evidence.
