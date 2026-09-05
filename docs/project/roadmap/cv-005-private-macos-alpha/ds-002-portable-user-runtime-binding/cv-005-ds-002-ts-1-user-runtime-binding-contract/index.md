[< Parent](../index.md)

# CV-005.DS-002.TS-1 - User Runtime Binding Contract

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to remove personal runtime coordinates from the product,
As the Mirror Desktop native boundary,
I want one strict and versioned local Mirror binding contract,
So that later UI, persistence and process execution share the same authority.

## Outcome

Mirror root, Mirror home, Mirror user and database form one canonical channel-owned binding whose validity and readiness can be inspected without reading database contents.

## Acceptance Behavior

```text
Given a candidate local Mirror binding
When the native contract validates its schema, channel, paths, user, Core version and required tools
Then it returns a bounded readiness result for every coordinate
And only a completely valid candidate can become process authority
And invalid, partial, symlinked, escaped, incompatible or cross-channel candidates fail closed
```

## Scope

- Exact `runtime-binding.v1.json` schema and unknown-field rejection.
- Canonical path and symlink policy.
- Direct-child `memory.db` confinement.
- Bounded Mirror user slug.
- Mirror root markers and Core range `>=0.31.14,<0.32.0`.
- Closed `pi` and `uv` executable resolution.
- Typed candidate, validation and readiness diagnostics.

## Out Of Scope

- Settings UI and folder selection.
- Persistence mechanics beyond serialization characterization.
- Process spawning.
- Mirror installation, identity creation or database inspection.

## Validation

Native unit tests with temporary roots cover every accepted and rejected coordinate. Navigator review confirms the diagnostic shape contains no secret or database content.
