[< Parent](../index.md)

# CV-005.DS-003.TS-1 - macOS Alpha Build Preflight

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to fail before an expensive or unsafe private-alpha build,
As the maintainer producing a private alpha artifact,
I want one bounded preflight for source, build host, tools and rehearsal readiness,
So that I know whether this commit can produce a trustworthy Mirror Desktop bundle before private delivery.

## Outcome

`npm run alpha:preflight` gives the maintainer actionable human diagnostics and privacy-safe JSON evidence for build-host architecture, revision, origin, lockfiles, build tools and explicit compatible Mirror rehearsal coordinates. It is not a tester installation or onboarding prerequisite.

## Acceptance Behavior

```text
Given a maintainer checkout and explicit local Mirror root, home and user
When preflight probes the build host through argument-safe commands
Then supported macOS architecture, tools, lockfiles and Core compatibility pass visibly
And missing, partial, unsafe or incompatible prerequisites fail nonzero
And JSON evidence contains bounded versions and statuses but no absolute user paths, credentials or database content
```

## Scope

- Injectable command and filesystem probes.
- macOS `x86_64` and `arm64` recognition.
- Git origin and revision, lockfiles and tool readiness.
- Node 20+, npm, Rust, Cargo, `uv`, Pi and Xcode tools.
- Explicit runtime path metadata and shared Core compatibility authority.
- Human and redacted JSON output.

## Out Of Scope

- Installing or updating prerequisites.
- Reading SQLite or provider credentials.
- Filesystem-wide Mirror discovery.
- Bundle publication or signing.

## Validation

Fixture-driven tests cover every ready and blocked state without depending on the maintainer machine, followed by one real-host preflight whose JSON passes privacy review.
