[< Parent](../index.md)

# CV-006.DS-001.TS-2 - Release Notes and Provenance Receipt

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to make release candidates reviewable,
As the release process,
I want a privacy-safe provenance receipt shape,
So that tag, revision, artifact, checksum, checks and notes can be audited without exposing private state.

## Outcome

`scripts/release_candidate.mjs` produces a bounded provenance object with product, version, tag, revision, artifact, architecture, SHA-256, checks and explicit authority boundaries. The release guide defines the matching release-note and receipt fields.

## Acceptance Behavior

```text
Given a version, tag, full revision, artifact and SHA-256
When provenance is built
Then the receipt records bounded release identity and check statuses
And it explicitly records that binaries are not committed, self-update is not authorized and signing or notarization is not claimed
And private paths, credentials, Mirror users, Journey content and release-channel details are excluded
```

## Scope

- Privacy-safe provenance receipt shape.
- Release-note field guidance.
- Boundary flags for binary storage, self-update and signing claims.

## Out Of Scope

- Uploading or storing receipts in a remote release system.
- Collecting telemetry or tester data.
- Signing receipts.

## Validation

`src/tests/releaseCandidate.test.mjs` covers provenance receipt construction and boundary flags. `docs/release/versioned-macos-release.md` documents allowed receipt fields.
