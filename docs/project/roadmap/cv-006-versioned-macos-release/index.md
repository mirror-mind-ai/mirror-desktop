[< Roadmap](../index.md)

# CV-006 - Versioned macOS Release

**Status:** 🟡 Planned

## Outcome

Mirror Desktop produces a versioned macOS bundle whose immutable artifact, checksum and provenance are attached to an exact Git tag and source revision through a repeatable release process.

## Why This Matters

CV-005 proves that a maintainer-built bundle can cross the machine boundary and operate safely. The next distribution moment replaces ad hoc private transmission with a durable release identity: version, source revision, artifact, integrity evidence and release notes agree.

## Candidate Scope

- Define application version and Git tag authority.
- Produce immutable architecture-specific or universal macOS artifacts.
- Attach checksums, provenance and release notes to the exact tag/revision.
- Choose release artifact storage and retention explicitly.
- Define promotion from validated candidate to released artifact.
- Preserve rollback to an earlier trusted version.
- Decide signing and notarization requirements before widening access.

## Boundary

This capability does not implement in-app discovery or self-update. Generated `.app` and `.dmg` binaries should be stored as release artifacts rather than committed into ordinary source history unless a later explicit repository-storage decision demonstrates why Git object storage is appropriate.

## Done Condition

A clean authorized revision can produce a uniquely versioned macOS artifact; the artifact and checksum are durably associated with one immutable Git tag; provenance and release notes are reviewable; promotion and rollback are documented; and consumers no longer depend on an unversioned private file transfer.
