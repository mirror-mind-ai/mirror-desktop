[< CV-005](../index.md)

# CV-005.DS-003 - Reproducible Private Alpha

**Status:** 🟡 Planned

## Outcome

An explicitly authorized macOS collaborator can move from private repository access to a locally built and usable Mirror Desktop bundle through one documented, validated and reversible route.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-005.DS-003.TS-1 | macOS Alpha Build Preflight | Technical Story | One non-secret preflight reports source revision, host architecture, required tool availability, compatible Mirror runtime and expected bundle coordinates before a full build | 🟡 Planned |
| CV-005.DS-003.US-1 | Build Mirror Desktop From Source | User Story | An authorized collaborator can clone the private repository, install documented dependencies, run required checks and generate the local macOS application bundle | 🟡 Planned |
| CV-005.DS-003.US-2 | Operate My First Alpha Journey | User Story | The collaborator can open their own Journey registry, start or resume a disposable Journey, complete one Pi and Mirror turn, restart and recover continuity | 🟡 Planned |
| CV-005.DS-003.TS-2 | Alpha Evidence and Rollback Runbook | Technical Story | The validation route records bounded version and result evidence, protects private data and preserves uninstall or rollback to the existing app without destructive cleanup | 🟡 Planned |

## Supported Route

The alpha route supports a local build on the collaborator's own macOS host architecture. The canonical guide must distinguish source prerequisites, runtime prerequisites, build commands, bundle location, first launch, runtime binding, validation and removal. It must not instruct users to copy another person's Mirror state or bypass macOS security through an unexplained broad exception.

## Validation Route

An invited collaborator follows the guide without unpublished oral steps and returns:

- source revision and host architecture;
- versions or pass status from the documented preflight;
- frontend, Rust and bundle check results;
- confirmed Mirror Desktop product and bundle identity;
- confirmed personal runtime binding with secret values omitted;
- one disposable Journey turn and restart observation;
- any blocking error through bounded diagnostic text.

## Done Condition

This Delivery Story is done when the repository contains one canonical alpha guide and preflight; all required deterministic checks pass; a local macOS bundle is produced under Mirror Desktop identity; at least one authorized collaborator validates the complete route on an external user environment; their personal Mirror data remains confined; failure and removal instructions preserve existing installations; and the accepted evidence is recorded without credentials, conversation content or private database material.

## Boundary

This story does not publish downloadable binaries, sign or notarize an artifact, open the repository publicly, automate GitHub collaborator management, support cross-compilation, or claim Windows and Linux readiness. A future distribution capability may reuse the evidence without treating this private alpha as public release infrastructure.
