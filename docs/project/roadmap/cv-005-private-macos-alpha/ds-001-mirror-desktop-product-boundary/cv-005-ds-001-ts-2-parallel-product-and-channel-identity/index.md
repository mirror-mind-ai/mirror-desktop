[< Parent](../index.md)

# CV-005.DS-001.TS-2 - Parallel Product and Channel Identity

**Status:** 🟠 In Progress
**Type:** Technical Story

## Technical Story

In order to validate Mirror Desktop without endangering the predecessor application,
as the native packaging and runtime-channel boundary,
I want user and development builds to own distinct Mirror Desktop coordinates,
so that both new channels can run beside Nautilus Harness without bundle or app-data collisions.

## Outcome

Mirror Desktop and Mirror Desktop Dev have approved product names, bundle identifiers, app-data roots, package metadata and guarded promotion destinations. Existing Nautilus Harness coordinates remain untouched.

## Acceptance Behavior

```text
Given Nautilus Harness is installed with existing local state
When Mirror Desktop user and development builds are generated and launched
Then all three applications have distinct native identities and app-data roots
And the development channel remains visibly distinguishable
And no Mirror Desktop promotion or launch path targets Nautilus Harness
```

## Scope

- Proposed bundle identifiers `ai.mirrormind.desktop` and `ai.mirrormind.desktop.dev`.
- Product names `Mirror Desktop` and `Mirror Desktop Dev`.
- Tauri, JavaScript and Rust package metadata.
- Channel launcher, native profile and runtime diagnostic expectations.
- Stable and development app-data separation.
- Guarded local promotion destination and rollback behavior.
- Deterministic channel isolation tests.

## Out Of Scope

- Signing and notarization.
- Public binary publication.
- Importing `com.nautilus.harness` app data.
- Resolving another user's Mirror runtime.

## Validation

Inspect generated native metadata, run channel and promotion tests, launch both Mirror Desktop channels beside Nautilus Harness, and confirm that bundle identifiers, app-data paths and replacement destinations remain distinct.
