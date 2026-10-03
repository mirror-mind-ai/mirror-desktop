[< Roadmap](../index.md)

# CV-009 - Trusted macOS Distribution

**Status:** 🟡 Planned

## Outcome

Mirror Desktop can produce a repeatable macOS release artifact signed in Software Zen's Apple developer identity, accepted by Apple notarization, stapled for offline Gatekeeper verification and connected to the existing release provenance and updater trust boundaries without exposing credentials or widening distribution implicitly.

## Why This Matters

The completed alpha and trusted self-update work prove release identity, updater-artifact integrity and recovery. They do not establish that macOS recognizes the application bundle as software signed by its accountable publisher. Apple Developer ID signing and notarization close that distinct trust boundary for external macOS distribution.

## Operating Premise

Software Zen is the intended Apple Developer Program organization and responsible publisher. The VPS is the encrypted custody and release-coordination location. The maintainer's personal Mac is the initial manual macOS release runner because signing and `notarytool` require macOS and Xcode. Secrets may be injected into that runner only for an authorized release procedure; they must not enter source control, release artifacts or ordinary logs.

## Delivery Stories

| Code | Delivery Story | Outcome | Status |
|------|----------------|---------|--------|
| [CV-009.DS-001](ds-001-software-zen-publisher-and-credential-custody/index.md) | Software Zen Publisher and Credential Custody | The Apple organization identity, release roles, encrypted VPS custody and personal-Mac release-runner procedure are explicit, minimal and auditable | 🟡 Planned |
| [CV-009.DS-002](ds-002-signed-macos-release-runner/index.md) | Signed macOS Release Runner | An authorized clean revision can produce a Developer ID-signed, Hardened Runtime Mirror Desktop bundle with inspectable signing evidence | 🟡 Planned |
| [CV-009.DS-003](ds-003-notarized-artifact-verification-and-promotion/index.md) | Notarized Artifact Verification and Promotion | A signed release candidate can be notarized, stapled, verified on a clean macOS host and deliberately admitted to the existing distribution route | 🟡 Planned |

## Done Condition

An authorized maintainer can take a clean versioned release candidate through the documented Software Zen custody procedure, produce a Developer ID-signed and notarized macOS artifact, verify its signature, stapled ticket and Gatekeeper acceptance, and retain bounded evidence linking the final bytes to the existing version, tag, checksum and rollback coordinates.

## Boundary

This capability does not itself enroll Software Zen in Apple programs, create or rotate credentials, publish an artifact, create a tag, promote stable distribution, change updater key custody, distribute through the Mac App Store, support Windows or Linux signing, or authorize access to Mirror homes, databases, identities, Journeys, conversations or provider credentials. Each external account action and release action remains an explicit Navigator decision.
