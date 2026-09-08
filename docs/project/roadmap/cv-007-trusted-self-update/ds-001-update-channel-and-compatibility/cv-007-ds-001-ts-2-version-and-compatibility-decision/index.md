[< Parent](../index.md)

# CV-007.DS-001.TS-2 - Version and Compatibility Decision

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to offer only safe update candidates,
As the compatibility decision boundary,
I want to compare the manifest against the current app, macOS, architecture and Mirror Core,
So that incompatible releases are explained without download or installation.

## Outcome

The update discovery domain compares semantic app versions, macOS minimum version, Mirror Core range and architecture-specific artifacts, returning `available`, `current`, `incompatible` or `invalid`.

## Acceptance Behavior

```text
Given a valid update manifest and current runtime context
When the manifest version is not newer
Then discovery reports current
When macOS, Mirror Core or architecture does not match
Then discovery reports incompatible with a bounded reason
When a newer compatible artifact exists
Then discovery reports available with release notes and matching artifact identity
```

## Scope

- Semantic version comparison.
- Mirror Core range comparison.
- macOS minimum comparison.
- Architecture-specific or universal artifact selection.

## Out Of Scope

- Runtime binding changes.
- Mirror Core installation or migration.
- Artifact download or apply.

## Validation

`npm test -- src/tests/updateChannel.test.ts` covers compatible, current, incompatible and invalid discovery states.
