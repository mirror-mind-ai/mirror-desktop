# Delivery Story Plan - CV-005.DS-003

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Reproducible Private Alpha

## Objective

Turn the completed Mirror Desktop product and portable runtime boundaries into one reproducible private macOS alpha route that lets an authorized collaborator preflight a clean machine, clone private source, build a local bundle, bind their own Mirror installation, complete and recover one disposable Journey conversation, submit bounded evidence, and retain Nautilus Harness as rollback without receiving another user's state.

## Child Work Packages

- CV-005.DS-003.TS-1
- CV-005.DS-003.US-1
- CV-005.DS-003.US-2
- CV-005.DS-003.TS-2

## Scope

This Delivery Story will:

- establish one canonical collaborator guide under `docs/alpha/` and link it from the repository README without duplicating the development-channel guide;
- state the supported alpha contract clearly: authorized access to the private repository, macOS host, separately configured compatible Mirror installation, local provider readiness and source-built unsigned bundle;
- add a non-secret `npm run alpha:preflight` command that runs before dependency installation or full build where practical and reports host architecture, macOS version, source revision, repository identity, lockfile presence and required tool readiness;
- check Git, Node, npm, Rust, Cargo, `uv`, Pi, Xcode Command Line Tools and Tauri build prerequisites through bounded version or presence probes;
- accept explicit Mirror root, home and user inputs for runtime preflight without discovering arbitrary homes, reading SQLite, printing credentials or embedding one developer's coordinates;
- validate the selected Mirror Core against the application-owned compatibility contract and verify only safe path metadata for `memory.db`;
- provide human-readable preflight output for repair and an explicit bounded JSON evidence mode that omits absolute user paths and environment values;
- define a deterministic clone and build route using the private canonical origin, `npm ci`, committed JavaScript and Cargo lockfiles, automated gates and a host-architecture stable Tauri build;
- verify the produced `.app` and `.dmg` locations, bundle name, `CFBundleIdentifier`, executable architecture and unsigned alpha expectations;
- guide first launch through the DS-002 `Unbound` surface, explicit runtime selection, validation and channel-local save;
- guide an authorized collaborator through import of their own Journey registry, one disposable Journey, one completed Pi and Mirror turn, application restart and continuity recovery;
- define evidence that records revisions, versions, check results, bundle identity, bounded binding status, disposable Journey identifiers and continuity outcome while excluding prompts, responses, database contents, identity documents and credentials;
- define safe failure reporting, local build removal and rollback to an independently installed Nautilus Harness without deleting either product's app data or any Mirror home;
- conduct one internal rehearsal and one external authorized-collaborator validation with no unpublished oral steps;
- record collaborator feedback and exact pass or blocker evidence in the Delivery Story validation artifact.

## Supported Alpha Contract

The planned collaborator starts with:

```text
private GitHub read access
macOS 12 or newer on x86_64 or arm64
Git and Xcode Command Line Tools
Node.js 20 or newer with npm
stable Rust and Cargo capable of consuming Cargo.lock
uv and Pi available from supported executable locations
a separately configured Mirror Core >=0.31.14,<0.32.0
an existing personal Mirror home with memory.db
local provider authentication already configured outside Mirror Desktop
```

The source-built alpha requires macOS 12 or newer because external validation found that the locked JavaScript toolchain and embedded WebKit/Wry route do not operate correctly on Big Sur. Unsupported macOS, architecture, absent tools, incompatible Core or incomplete runtime inputs fail before dependency installation or an expensive build.

## Canonical Artifact Set

- `docs/alpha/private-macos-alpha.md`: one end-to-end collaborator route;
- `docs/alpha/evidence-template.md`: copyable bounded report;
- `docs/alpha/rollback.md`: non-destructive removal and Nautilus rollback;
- `scripts/private_alpha_preflight.mjs`: preflight and JSON evidence producer;
- focused script tests using temporary fixtures and injected command results;
- `package.json` command `alpha:preflight`;
- DS lifecycle artifacts under the existing roadmap package.

A small application-owned compatibility file may be introduced so Rust binding validation and JavaScript preflight consume one range rather than duplicating `>=0.31.14,<0.32.0`.

## Non-Goals

This Delivery Story will not:

- publish, upload or commit `.app` or `.dmg` binaries;
- create a GitHub release or CI distribution pipeline;
- push commits or invite, remove or manage GitHub collaborators;
- sign, notarize, staple or submit software to Apple;
- bypass Gatekeeper with a machine-wide security exception;
- support Windows, Linux, cross-compilation, auto-update or an installer-managed Mirror Core;
- install or update Mirror Core, initialize identity, seed a personal database or configure provider credentials;
- copy any maintainer Mirror home, database, credential, conversation or identity document to a collaborator;
- migrate, rename, remove or reset Nautilus Harness or its app data;
- make the alpha bundle a public or generally supported release;
- modify `/Users/alissonvale/mirror` or any collaborator's Mirror source;
- treat this machine's successful build as a substitute for the required external collaborator result.

## Implementation Sequence

### CV-005.DS-003.TS-1 - macOS Alpha Build Preflight

Define the preflight contract first. Characterize safe probes, version normalization, architecture handling, lockfile checks, private origin identity, explicit runtime arguments, compatibility validation, human diagnostics, redacted JSON and failure exit codes. Keep command execution injectable so tests never depend on the developer machine.

### CV-005.DS-003.US-1 - Build Mirror Desktop From Source

Write the canonical private-clone route around the preflight. Use `npm ci`, all repository gates and a stable `--locked` Tauri build. Verify bundle identity and architecture without installing it. Explain the expected unsigned Gatekeeper interaction narrowly and avoid broad security-disable commands.

### CV-005.DS-003.US-2 - Operate My First Alpha Journey

Continue the guide through first launch, explicit personal runtime binding, registry import, disposable Journey selection or creation, one completed turn and restart recovery. Record identifiers and result statuses only. The collaborator must never paste conversation content or private runtime paths into evidence.

### CV-005.DS-003.TS-2 - Alpha Evidence and Rollback Runbook

Create the bounded evidence template, failure report and non-destructive rollback route. Rehearse locally, then give the repository revision and guide to one authorized collaborator. Incorporate only reproducibility fixes within scope and retain their accepted or blocked result as validation evidence.

## Acceptance Behavior

```text
Given an authorized collaborator has private repository access
And their Mac has a separately configured compatible Mirror installation
When they follow only the canonical alpha guide from a fresh clone
Then preflight reports actionable readiness without exposing private state
And committed lockfiles produce a host-architecture Mirror Desktop bundle
And the bundle identifies as ai.mirrormind.desktop under Mirror Desktop
And first launch lets them bind only their own Mirror installation
And their own Journey registry can be imported
And one disposable Journey completes a Pi and Mirror turn
And restart restores that Journey continuity
And their bounded report contains no credential, conversation content, identity document or database material
And removing the local alpha leaves Mirror, Mirror Desktop app data and Nautilus Harness intact
```

## Validation Route

Automated gates:

```text
npm ci
npm run alpha:preflight -- --mirror-root <fixture-or-local-root> --mirror-home <fixture-or-local-home> --mirror-user <slug>
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check --locked
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
npm run tauri:build:user -- -- --locked
```

Focused tests cover missing tools, unsupported platform and architecture, malformed versions, incompatible Core, absent lockfiles, wrong origin, unsafe or missing runtime paths, database escape, redacted JSON, command failure and successful host readiness.

Desktop E2E is required. The internal rehearsal verifies bundle metadata, host architecture, first launch, binding, registry import and restart without installing over the daily-use app. The external rehearsal must use an authorized collaborator's own Mac, Mirror home and disposable Journey. Its duration is expected to be 30 to 60 minutes depending on uncached dependency and Rust compilation. The collaborator is warned before build and retains control of every machine mutation.

## External Validation Boundary

The DS cannot reach Done from maintainer-only evidence. If no authorized external collaborator is available, implementation may reach Navigator Validation with an explicit external-validation blocker, but the Done condition remains unmet. Repository access invitation, push and delivery of a revision remain separate Navigator-authorized operations.

The collaborator returns only the filled bounded evidence template. Any accidental credential, prompt, response, database excerpt or identity content must be removed rather than committed.

## Implementation Contract

- Use TDD for preflight behavior and any application behavior change.
- Keep the four child stories traceable within this aggregate plan.
- Prefer a parser and injectable probe layer over shell-string execution.
- Never invoke a shell with collaborator-provided paths; use argument arrays.
- Reject partial runtime input and canonicalize before comparing confinement.
- Keep one compatibility authority shared with DS-002 binding validation.
- Do not weaken runtime binding, executable allowlists or stable/development isolation to simplify the guide.
- Use committed lockfiles and fail on unexpected lockfile mutation.
- Keep generated bundles and evidence containing local coordinates untracked.
- Do not claim Gatekeeper, signing or notarization guarantees outside the unsigned private-alpha boundary.
- Stop for a separate Journey decision if the route requires Mirror Core modification.
- Stop at Navigator Validation after local implementation. Plan approval does not authorize push, collaborator invitation, release, installation or publication.

## Approval Boundary

Approval authorizes local implementation of preflight code, tests and private-alpha documentation, plus an internal source-build rehearsal. It does not authorize push, external repository access changes, sending a revision to a collaborator, installing over `/Applications/Mirror Desktop.app`, release creation or public distribution. External validation begins only after separate Navigator authorization naming the collaborator route.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
