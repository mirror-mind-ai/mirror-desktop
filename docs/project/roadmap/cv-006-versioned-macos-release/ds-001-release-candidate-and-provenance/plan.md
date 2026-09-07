# Delivery Story Plan — CV-006.DS-001

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Release Candidate and Provenance

## Objective

Establish a repeatable versioned macOS release-candidate process for Mirror Desktop where one clean authorized revision has a unique version and immutable Git tag, produces matching macOS artifacts and checksums, records privacy-safe provenance and release notes, and supports an explicit promote-or-rollback decision without creating self-update, signing, notarization or public access authority.

## Child Work Packages

- CV-006.DS-001.TS-1
- CV-006.DS-001.US-1
- CV-006.DS-001.TS-2
- CV-006.DS-001.US-2

## Scope

This Delivery Story will:

- define `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` as the coordinated release version sources;
- define `vX.Y.Z` as the immutable Git tag format for release version `X.Y.Z`;
- add a read-only release-candidate inspection command that reports version, tag, revision, artifact name, architecture, checksum and boundary status;
- define architecture-specific macOS artifact naming for `x64`, `aarch64` and future universal bundles;
- document the manual build, verification, provenance, promotion and rollback route;
- record that generated binaries remain release artifacts and are not committed into ordinary source history;
- keep release candidate creation separate from signing, notarization, public release publication and self-update.

## Non-Goals

This Delivery Story will not:

- create, push or publish a Git tag automatically;
- upload artifacts to GitHub Releases or any public storage;
- sign, notarize, staple or submit software to Apple;
- implement in-app release discovery, download, verification or installation;
- introduce Windows, Linux or cross-compilation support;
- commit generated `.app`, `.dmg` or private provenance files to ordinary source history;
- change Mirror Core compatibility, runtime binding or Journey data behavior.

## Acceptance Behavior

```text
Given a clean authorized Mirror Desktop revision with matching source versions
When the maintainer inspects the release candidate
Then the command derives one release version, one `vX.Y.Z` tag, one source revision and one architecture-specific artifact identity
And the provenance receipt shape binds artifact name, SHA-256, revision, checks and release boundaries without private coordinates
When the maintainer follows the documented route
Then gates, bundle verification, release notes, promotion decision and rollback target are reviewable
And no tag, release, push, signing, notarization, self-update or public access widening happens implicitly
```

## Validation Route

Run focused release-candidate tests, the TypeScript build, and the read-only release-candidate inspection command. Review `docs/release/versioned-macos-release.md` and the generated roadmap artifacts for consistency with CV-006 boundaries. Desktop E2E is not required for this story unless a release candidate is actually promoted for distribution; this story establishes the candidate/provenance process and keeps external release actions behind separate Navigator authorization.

## Implementation Contract

Use TDD for the release-candidate contract. Prefer deterministic local inspection and document-owned release authority over remote mutation. Scripts must be read-only unless a later command is explicitly named as mutating. Keep all shell invocations argument-safe, avoid private paths in persisted receipts, and preserve CV-007 self-update as future work.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
