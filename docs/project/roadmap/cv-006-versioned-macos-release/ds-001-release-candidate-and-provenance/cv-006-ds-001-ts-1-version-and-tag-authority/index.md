[< Parent](../index.md)

# CV-006.DS-001.TS-1 - Version and Tag Authority

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to prevent ambiguous macOS releases,
As the maintainer preparing a release candidate,
I want one version and tag authority,
So that a candidate is bound to exact source metadata before artifact creation.

## Outcome

`package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` must agree on one semantic version, and release tag identity is derived as `vX.Y.Z` from that version.

## Acceptance Behavior

```text
Given source metadata files declare the same semantic version
When the release-candidate inspection runs
Then it accepts the version and derives the exact `vX.Y.Z` tag
When the metadata versions disagree or the tag format differs
Then inspection blocks before release provenance is accepted
```

## Scope

- Coordinated version source validation.
- `vX.Y.Z` tag convention.
- Full Git revision capture.
- Read-only inspection before any tag mutation.

## Out Of Scope

- Creating or pushing Git tags automatically.
- Changing the project version number.
- Public release publication.

## Validation

`src/tests/releaseCandidate.test.mjs` covers semantic version parsing and tag derivation. `npm run release:candidate` exercises the read-only inspection route.
