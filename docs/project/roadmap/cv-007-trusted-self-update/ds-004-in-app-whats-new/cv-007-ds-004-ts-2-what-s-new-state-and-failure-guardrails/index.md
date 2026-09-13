[< Parent](../index.md)

# CV-007.DS-004.TS-2 - What's New State and Failure Guardrails

**Status:** ✅ Done
**Type:** Technical Story

## Outcome

A versioned channel-local state contract records bounded pending and acknowledged release readings, activates post-relaunch presentation only on exact version evidence and fails safely without affecting update authority or protected data.

## Scope

- Define and validate the versioned What's New app-data shape.
- Persist the pending target and public release reading atomically before installation.
- Resolve pending, installed, acknowledged, malformed, stale and mismatched states against the running app version.
- Keep state naturally isolated by channel-specific app-data roots.
- Integrate safe defaults, bounded diagnostics and pre-relaunch persistence with existing updater flow.
- Prove that Mirror and Journey data are never read or written by this feature.

## Acceptance Behavior

```text
Given any stored What's New state and the exact running application version
When startup resolves post-update presentation
Then only a matching valid pending target becomes an installed release reading
And malformed, stale or mismatched state produces no success claim
And acknowledgement affects only the exact version in the current channel
And updater trust and protected data remain unchanged
```

## Out Of Scope

- Update verification, artifact installation, rollback implementation, cross-channel synchronization, Mirror persistence and historical release catalogues.

## Validation

Domain and native storage tests, mismatch and corruption fixtures, restart checks in isolated Mirror Desktop Dev, Rust gates and aggregate Delivery Story validation.
