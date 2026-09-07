[< Parent](../index.md)

# CV-006.DS-001.US-1 - Build a Versioned macOS Artifact

**Status:** ✅ Done
**Type:** User Story

## User Story

As the Mirror Desktop maintainer,
I want the release route to name macOS artifacts by product, version and architecture,
So that a candidate bundle can be recognized and checked against its intended release identity.

## Outcome

The release-candidate contract derives artifact names such as `Mirror Desktop_0.1.0_x64.dmg`, `Mirror Desktop_0.1.0_aarch64.dmg` and future `universal` variants, then binds them to version, revision and checksum in the provenance receipt.

## Acceptance Behavior

```text
Given a release version and supported macOS architecture
When the artifact identity is derived
Then the filename includes Mirror Desktop, version, architecture and dmg extension
And unsupported architecture labels are rejected
And the build guide verifies bundle name, bundle identifier, executable architecture and SHA-256 before promotion
```

## Scope

- Architecture-specific artifact naming.
- Bundle identity and checksum verification guidance.
- Manual stable Tauri build route reuse.

## Out Of Scope

- Cross-compilation.
- Universal binary construction beyond naming support.
- Signing, notarization or publication.

## Validation

`src/tests/releaseCandidate.test.mjs` covers artifact naming. `docs/release/versioned-macos-release.md` records the manual build and verification route.
