# Delivery Story Plan - CV-005.DS-003

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Reproducible Private Alpha

## Objective

Turn the completed product and portable runtime boundaries into one reproducible phase-one route: a maintainer builds and verifies an authorized macOS bundle, delivers it privately with revision and checksum evidence, and an authorized tester binds their own Mirror, completes one Journey turn, restarts safely and retains rollback without source access or foreign private state.

## Child Work Packages

- CV-005.DS-003.TS-1
- CV-005.DS-003.US-1
- CV-005.DS-003.US-2
- CV-005.DS-003.TS-2

## Scope

This Delivery Story will:

- maintain one canonical guide separating maintainer build/delivery from tester evaluation;
- keep `npm run alpha:preflight` as a non-secret maintainer build-host and rehearsal gate;
- use `npm ci`, committed lockfiles, automated gates and a host-architecture stable Tauri build;
- verify `.app` and `.dmg` locations, product identity, executable architecture and required bundled resources;
- bind each delivered artifact to its exact source revision and SHA-256 checksum;
- require explicit authorization and a private transmission channel without publishing or committing the binary;
- guide first launch through runtime selection, native validation, required model selection and automatic real Journey import;
- provide a bounded route for one disposable Journey turn and application restart on an external supported host;
- record bounded build and operation evidence while excluding private paths, users, Journey names, prompts, responses, database contents, identity documents and credentials;
- preserve Mirror state, Mirror Desktop app data and Nautilus Harness during rollback;
- record the Big Sur copied-bundle result as experimental compatibility evidence, not supported-host validation.

## Phase-One Contract

The maintainer starts with:

```text
canonical private source access
macOS 12 or newer on x86_64 or arm64
Git and Xcode Command Line Tools
Node.js 20 or newer with npm
stable Rust and Cargo capable of consuming Cargo.lock
uv and Pi
compatible configured Mirror Core for preflight and rehearsal
explicit authorization to transmit one selected artifact
```

The tester starts with:

```text
macOS 12 or newer matching the delivered x86_64 or arm64 artifact
compatible configured Mirror Core >=0.31.14,<0.32.0
an existing Mirror home with memory.db
Pi and Node in bounded supported locations
provider authentication already owned by Pi
the private dmg, exact source revision and expected SHA-256
```

Repository access and build tools are not tester prerequisites. Unsupported build hosts, absent maintainer tools, incompatible Core, architecture mismatch or checksum mismatch fail before delivery or launch as appropriate.

## Distribution Sequence

### Moment 1 - Maintainer-built private alpha

This Delivery Story. The maintainer builds locally and transmits one verified unsigned artifact manually through an authorized private channel. No release publication or update authority exists.

### Moment 2 - Versioned Git release artifact

A future capability associates a bundle and checksum with an immutable Git tag and source revision through a designed release process. The preferred artifact transport is release storage rather than committing generated binaries into source history, but that decision belongs to the release capability.

### Moment 3 - Application self-update

A later capability lets Mirror Desktop discover, authenticate, verify compatibility, download and apply an authorized release with explicit rollback. It cannot infer update authority from phase-one private transmission.

## Canonical Artifact Set

- `docs/alpha/private-macos-alpha.md`: maintainer build/private delivery and tester evaluation route;
- `docs/alpha/evidence-template.md`: separated build and external operation receipt;
- `docs/alpha/rollback.md`: non-destructive artifact removal and Nautilus rollback;
- `scripts/private_alpha_preflight.mjs`: maintainer preflight and redacted JSON producer;
- `config/runtime-compatibility.json`: shared Core and supported-host compatibility authority;
- focused JavaScript, Rust and Python tests;
- DS lifecycle and evidence artifacts.

## Non-Goals

This Delivery Story will not:

- publish or upload `.app` or `.dmg` binaries;
- commit generated bundles to source history;
- create a GitHub release, tag automation or CI distribution pipeline;
- implement self-update;
- sign, notarize, staple or submit software to Apple;
- bypass Gatekeeper through machine-wide exceptions;
- support Windows, Linux, cross-compilation or installer-managed Mirror Core;
- install or update Mirror Core, initialize identity or configure provider credentials;
- transfer any Mirror home, database, credential, conversation or identity document;
- replace, migrate, remove or reset Nautilus Harness or durable application state.

## Implementation Sequence

### CV-005.DS-003.TS-1 - macOS Alpha Build Preflight

Retain the preflight as maintainer build-host evidence. Keep bounded architecture, source, lockfile, toolchain, compatibility, human diagnostics and redacted JSON behavior. Tester runtime readiness remains authoritative in native **Connect your Mirror**, not in a source-build prerequisite.

### CV-005.DS-003.US-1 - Produce a Private Alpha Bundle

Run preflight, locked gates and stable build on a clean authorized revision. Verify identity, architecture and resources; compute SHA-256; privacy-review the artifact receipt; and deliver only through a separately authorized private channel.

### CV-005.DS-003.US-2 - Operate My First Alpha Journey

The tester verifies checksum and architecture, opens the unsigned app narrowly, connects their own runtime, chooses a model, imports their registry, completes one harmless disposable turn and confirms restart continuity without source access.

### CV-005.DS-003.TS-2 - Alpha Evidence and Rollback Runbook

Join maintainer build receipt and external operation receipt without private coordinates or content. Prove the delivered artifacts can be removed while durable Mirror and predecessor state remain intact.

## Acceptance Behavior

```text
Given a maintainer has a clean authorized revision and build host
When maintainer preflight and locked gates pass
Then a host-native Mirror Desktop dmg is produced with verified identity and resources
And its exact revision and SHA-256 are recorded
When that artifact is privately delivered to an authorized tester on a matching supported Mac
Then the tester verifies checksum before launch
And app-specific unsigned opening does not weaken global security policy
And only the tester's validated Mirror becomes runtime authority
And a real registry and explicit Pi-owned model become ready
And one disposable Journey completes a Pi and Mirror turn
And restart restores continuity
And removal preserves Mirror, Mirror Desktop app data and Nautilus Harness
And the retained evidence contains no private coordinates, credentials, identity or conversation content
```

## Validation Route

The maintainer runs:

```text
npm ci
npm run alpha:preflight -- --mirror-root <maintainer-root> --mirror-home <maintainer-home> --mirror-user <maintainer-slug>
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check --locked
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
npm run tauri:build:user -- -- --locked
bundle identity, resource, architecture and checksum inspection
```

Desktop E2E remains required for broad alpha confidence. Internal rehearsal proves build and bundle metadata. Private handoff proves the artifact, checksum and bounded tester route were delivered without publication. External evaluation may later prove private artifact receipt, checksum match, first launch, binding, registry import, turn completion, restart and rollback on the tester's own compatible Mirror state. The tester does not compile.

## External Validation Boundary

The DS can reach Done from maintainer-side reproducibility, artifact verification, authorized private handoff and a bounded tester route. Returned tester evidence remains desirable alpha feedback and may be recorded later, but it is no longer a lifecycle gate for this Delivery Story. The completed Big Sur experiment remains useful portability evidence but does not expand the supported macOS 12+ contract.

Artifact transmission, repository publication, release creation, signing and installation into `/Applications` remain separately authorized actions. The tester returns only the bounded evidence template; accidental private material is removed rather than committed.

## Implementation Contract

- Use TDD for behavior changes.
- Keep generated bundles and evidence containing local coordinates untracked.
- Never invoke a shell with tester-provided paths; use argument arrays.
- Keep one compatibility authority shared with native binding validation.
- Do not weaken runtime binding, executable allowlists or stable/development isolation.
- Use committed lockfiles and fail on unexpected mutation.
- Keep private delivery, release publication and self-update as separate authorities.
- Do not claim signing, notarization, Big Sur support or public availability.
- Stop for a separate Journey decision if Mirror Core changes are required.

## Approval Boundary

This revised plan authorizes documentation and local validation of the phase-one route. It does not itself authorize transmitting another artifact, publishing a release, committing a binary, signing, notarizing, installing into `/Applications`, changing repository access or implementing self-update.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
