[< CV-006](../index.md)

# CV-006.DS-001 - Release Candidate and Provenance

**Status:** ✅ Done

## Outcome

A maintainer can promote one clean authorized source revision into a uniquely versioned macOS release candidate whose tag, bundle artifact, checksum, provenance and release notes agree without publishing an in-app update channel.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-006.DS-001.TS-1 | Version and Tag Authority | Technical Story | The release process defines one canonical version source, tag format, clean-state preflight and immutable revision authority before artifact creation | ✅ Done |
| CV-006.DS-001.US-1 | Build a Versioned macOS Artifact | User Story | A maintainer can produce architecture-specific macOS artifacts whose filenames, bundle metadata and checksums identify the selected version and source revision | ✅ Done |
| CV-006.DS-001.TS-2 | Release Notes and Provenance Receipt | Technical Story | The release record binds tag, revision, artifact name, checksum, build host, checks and notes in a privacy-safe durable receipt | ✅ Done |
| CV-006.DS-001.US-2 | Promote or Roll Back a Release Candidate | User Story | A maintainer can decide whether a validated candidate becomes the distributed release and can point consumers back to an earlier trusted version when needed | ✅ Done |

## Done Condition

This Delivery Story is done when a clean authorized revision can be assigned a unique release version, tagged immutably, built into a macOS artifact whose identity and checksum match that version and revision, documented through release notes and a provenance receipt, and either promoted or rejected with a rollback path. Generated binaries are not committed to ordinary source history, and no self-update, signing, notarization or public access widening is implied by this story.

## Boundary

This story creates release candidate provenance and a manual promotion boundary only. It does not implement in-app update discovery, automatic installation, app-store distribution, cross-platform packaging, public repository access, signing or notarization unless a later explicit decision adds those requirements.
