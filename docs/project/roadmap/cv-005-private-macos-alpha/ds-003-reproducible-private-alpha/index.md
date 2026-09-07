[< CV-005](../index.md)

# CV-005.DS-003 - Reproducible Private Alpha

**Status:** 🟠 In Progress

## Outcome

A maintainer can build and verify one revision-bound macOS bundle, deliver it privately to an explicitly authorized tester, and receive bounded evidence that the tester can connect their own Mirror, operate a Journey and recover continuity without receiving source access or another person's state.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-005.DS-003.TS-1 | macOS Alpha Build Preflight | Technical Story | One maintainer preflight reports source revision, build-host architecture, required tool availability, compatible Mirror runtime and expected bundle coordinates before a full build | 🟠 In Progress |
| CV-005.DS-003.US-1 | Produce a Private Alpha Bundle | User Story | A maintainer can build, inspect and checksum an unsigned host-native bundle from a clean authorized revision without publishing it | 🟠 In Progress |
| CV-005.DS-003.US-2 | Operate My First Alpha Journey | User Story | An authorized tester can receive the private bundle, connect their own Mirror, complete one Pi and Mirror turn, restart and recover continuity | 🟠 In Progress |
| CV-005.DS-003.TS-2 | Alpha Evidence and Rollback Runbook | Technical Story | The delivery records bounded revision and result evidence, protects private data and preserves removal or rollback to the existing app without destructive cleanup | 🟠 In Progress |

## Phase-One Route

The current alpha route separates two roles:

1. the maintainer checks out an authorized revision, runs preflight and repository gates, builds the stable `.app` and `.dmg`, verifies identity and architecture, computes a checksum and transmits the artifact through an explicitly authorized private channel;
2. the tester verifies the received checksum, opens the unsigned app through the narrow app-specific macOS flow, connects their own Mirror installation, operates one Journey turn, restarts and returns privacy-safe evidence.

Source access and a local build toolchain are not tester prerequisites. The bundle remains unsigned, unnotarized and unpublished. The supported phase-one host remains macOS 12 or newer on the bundle's matching architecture.

## Distribution Evolution

This story is the first of three intentionally separate distribution moments:

1. **Maintainer-built private alpha — current:** manual, authorized delivery of a revision-bound bundle.
2. **Versioned release artifact — future:** a release process associates the bundle and checksum with an immutable Git tag/revision. Binary storage and release transport are decided there; this story does not commit generated bundles to source history or create a public release.
3. **Application self-update — future:** Mirror Desktop verifies, downloads and applies an authorized compatible release through an explicit update contract.

Each transition requires its own threat model, provenance and rollback design. Private delivery does not silently imply release publication or self-update authority.

## Validation Route

The maintainer records:

- source revision, clean state and build-host architecture;
- preflight, frontend, Rust, Python and locked bundle results;
- bundle identity, executable architecture, bundled resources and SHA-256 checksum.

The authorized tester records:

- bounded test-host macOS version and architecture;
- checksum match and confirmed Mirror Desktop identity;
- validated runtime binding with private coordinates omitted;
- registry import, one disposable Journey turn and restart observation;
- rollback inspection and any bounded diagnostic.

## Recorded Evidence

- [Internal alpha rehearsal](internal-rehearsal.md) — supported-host source build and continuity rehearsal.
- [External Big Sur compatibility experiment](external-bigsur-experiment.md) — copied-bundle portability, complete turn and restart continuity below the supported host minimum; accepted as experimental evidence only.

## Done Condition

This Delivery Story is done when the repository contains one canonical phase-one build, private-delivery and evaluation guide; all deterministic maintainer checks pass; a revision-bound local macOS bundle is produced under Mirror Desktop identity; at least one explicitly authorized tester validates the delivered bundle on an external supported macOS environment; private Mirror data remains confined to that environment; checksum, failure and removal instructions preserve existing installations; and accepted evidence is recorded without credentials, private coordinates, conversation content or database material.

## Boundary

This story does not publish downloadable binaries, commit generated bundles to source history, create a GitHub release, sign or notarize an artifact, open the repository publicly, automate access management, implement self-update, support cross-compilation, or claim Windows and Linux readiness. Future release and self-update capabilities must consume this evidence without treating private transmission as release infrastructure.
