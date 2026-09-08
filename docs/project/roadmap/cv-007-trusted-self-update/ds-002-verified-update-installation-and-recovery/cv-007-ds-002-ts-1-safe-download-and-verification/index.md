[< Parent](../index.md)

# CV-007.DS-002.TS-1 - Safe Download and Verification

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to prevent untrusted bytes from becoming an update,
As the updater verification boundary,
I want staged bytes verified against the manifest checksum before apply,
So that application replacement is never planned from mismatched artifacts.

## Outcome

`verifyStagedArtifact` accepts only bytes whose SHA-256 matches the available update artifact and exact user consent. Checksum mismatch returns a blocked result before any apply plan exists.

## Acceptance Behavior

```text
Given a compatible available update and exact user consent
When staged artifact bytes match the manifest SHA-256
Then the artifact becomes verified with version, checksum and byte count
When staged bytes differ
Then verification blocks before application mutation
```

## Validation

`npm test -- src/tests/updateInstallation.test.ts` covers matching and mismatched staged bytes.
