[< Parent](../index.md)

# CV-007.DS-001.TS-1 - Update Manifest Contract

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to trust self-update discovery,
As the application update boundary,
I want a bounded manifest contract,
So that Mirror Desktop can reject malformed or foreign update metadata before any download or installation.

## Outcome

`src/domain/updateChannel.ts` validates a Mirror Desktop manifest with schema version, product identity, semantic version, matching `vX.Y.Z` tag, full Git revision, minimum macOS, Mirror Core compatibility requirement, HTTPS release notes, provenance receipt and SHA-256 bound artifacts.

## Acceptance Behavior

```text
Given update metadata is loaded for inspection
When the manifest belongs to Mirror Desktop and all provenance fields are bounded
Then it parses into a trusted manifest value
When the product, tag, revision, digest, artifact URL or provenance URL is malformed
Then discovery returns invalid before any update action is offered
```

## Scope

- Manifest shape and product identity validation.
- Version and tag agreement.
- Full revision, HTTPS coordinates and SHA-256 validation.
- Architecture-specific artifact entries.

## Out Of Scope

- Manifest download or publication.
- Cryptographic signature verification.
- Artifact installation.

## Validation

`npm test -- src/tests/updateChannel.test.ts` covers accepted manifest parsing and malformed metadata rejection.
