# Plan — CV-003.DS-006.TS-1

## Objective

Produce a consumer-driven `Mirror Journey Projection Contract v1` and executable return kit sufficient for a separate Mirror Builder session to implement, validate, release and install the required capability without this conversation. Do not implement or modify Mirror Core.

## Deliverable Shape

```text
contracts/mirror-journey-projections/v1/
  README.md
  SPECIFICATION.md
  RETURN-CONTRACT.md
  schemas/
    envelope.schema.json
    manifest.schema.json
    operational.schema.json
    extension-projection.schema.json
  fixtures/
    journey/                       synthetic Ariad Journey
    candidates/                   valid and invalid extension documents
    expected/
      operational.json
      manifest.json
  probe/
    __init__.py
    contract_probe.py
  tests/
    __init__.py
    fake_mirror.py
    test_contract_probe.py
```

Use Python standard library tooling so the acceptance kit remains portable and independent of Harness internals.

## Specification Contract

`SPECIFICATION.md` must use normative language and define observable behavior for:

### Capability discovery

- stable contract identifier and version;
- machine-readable discovery through public CLI or equivalent stable boundary;
- backward-compatible version negotiation;
- bounded unsupported-contract diagnostics.

### Journey authority and storage

- callers supply `journeyId`, never an authoritative root;
- Mirror resolves the registered Journey root;
- canonical confinement after filesystem resolution;
- rejection of absolute paths, traversal, symlink escape and namespace confusion;
- extension-scoped namespace ownership and deterministic relative locations;
- published read models never mutate Ariad or Journey truth.

### Publication

- JSON schema validation before publication;
- snapshot IDs, source revisions and UTC timestamps;
- temporary write plus atomic replace;
- last-valid preservation on invalid input, interruption or failure;
- manifest changes only after snapshot durability;
- deterministic serialization for deterministic content;
- quiet success and actionable divergence;
- no model invocation, network access or hidden synthesis.

### Ariad Operational Projection v1

Define a deterministic read model containing:

- Journey identity and Ariad producer metadata;
- nested roadmap roots with CV, DS, US and TS nodes;
- titles, statuses, outcomes and relative artifact references;
- active item, checkpoint and pending confirmation when present;
- Exploratory Stories with status, summary, attractors, experiments and handoff references;
- Refinement Stories with nested Change Requests;
- source fingerprint and generated timestamp;
- no prompts, responses, transcript bodies, raw reasoning, secrets or arbitrary environment values.

Ariad documents and durable lifecycle records remain mutation truth. `operational.json` is only the canonical published read model for consumers.

### Lifecycle refresh

- deterministic refresh after successful Ariad mutations represented by the model;
- explicit rebuild command;
- no Pi, Mirror Mode, persona or provider invocation;
- previous valid projection remains readable on refresh failure;
- failure becomes actionable projection divergence;
- committed Ariad truth is not silently rolled back by projection failure.

### Extension-facing capability

Define a public stable API or command boundary allowing a future Nautilus extension to:

- publish and inspect only its namespace;
- validate envelope and supplied domain schema;
- reference source snapshot IDs;
- publish Tactical and Strategic without importing Mirror internals;
- avoid direct production database access;
- receive structured success and error results.

Mirror Core remains domain-neutral outside Ariad-owned Operational semantics. Nautilus Method meaning stays outside Core.

## Schemas

Provide JSON Schema Draft 2020-12 documents for the shared envelope, current manifest, Ariad Operational content and generic extension projection with source snapshot references.

Schemas must constrain identifiers, versions, UTC timestamps and relative paths. Strictness and compatibility rules must be explicit. Expected fixtures use fixed synthetic IDs and timestamps.

## Synthetic Fixture

Create a private-data-free Journey containing:

- one CV and one DS;
- one US and one TS;
- planned, in-progress and done statuses;
- one active work checkpoint;
- one active Exploratory Story with attractor and experiment;
- one completed handoff reference;
- one Refinement Story with one Change Request;
- relative plan, validation and done references.

Expected Operational output must demonstrate hierarchy, metadata, provenance and exclusions without real Journey content.

## Consumer Probe

Implement `probe/contract_probe.py` with the Python standard library. It must:

- accept an explicit Mirror command prefix/configuration;
- use only a supplied isolated Mirror home and fixture workspace;
- refuse the configured production `MIRROR_HOME` unless explicit later production-return mode is selected;
- discover support and contract version;
- request Operational rebuild and inspect output;
- compare normalized output with the expected fixture;
- publish and inspect a valid synthetic extension projection;
- attempt invalid schema, traversal, absolute path, symlink escape and foreign namespace cases;
- prove rejected attempts leave prior snapshot and manifest unchanged;
- emit machine-readable results and concise diagnostics;
- distinguish `contract_unavailable`, `nonconformant`, `unsafe`, `probe_error` and `passed`;
- never install, migrate, release or modify Mirror source.

The probe is a black-box consumer. It must not import Mirror internal modules.

## Probe Self-Tests

Create a fake Mirror command adapter that simulates:

- conformant behavior;
- missing capability;
- wrong version;
- malformed Operational output;
- unsafe path acceptance;
- manifest publication before snapshot durability;
- invalid candidate rejection with last-valid preservation;
- structured subprocess failure.

Self-tests must pass before Mirror implements the contract. Running the real probe against the current installed Mirror must return `contract_unavailable`, not crash.

## Return Contract

`RETURN-CONTRACT.md` must require:

- Mirror version and Git commit;
- release tag and central publication;
- CI evidence;
- contract and extension API versions;
- production backup and migration status;
- installed runtime version;
- unchanged probe hash;
- probe command and machine-readable result;
- Operational fixture result;
- declared deviations;
- explicit gate state, `blocked` or `open`.

Release metadata alone cannot open the gate. The unchanged probe must pass against the installed version.

## Documentation

`README.md` provides purpose, reading order, boundaries, self-test command, expected pre-release result, instruction to treat the package as acceptance input rather than implementation, and the production-return procedure.

Update CV-003 roadmap documentation for DS-006 without marking later Nautilus work ready.

## TDD and Validation

1. Add failing probe tests against fake behavior.
2. Implement only the consumer probe until they pass.
3. Add schema/fixture consistency tests.
4. Run the real probe against current Mirror with an isolated home and record expected `contract_unavailable`.
5. Confirm Mirror source and production state are unchanged.

## Required Checks

```bash
python3 -m unittest discover -s contracts/mirror-journey-projections/v1/tests -p 'test_*.py'
python3 contracts/mirror-journey-projections/v1/probe/contract_probe.py --help
python3 contracts/mirror-journey-projections/v1/probe/contract_probe.py \
  --mirror-root /Users/alissonvale/mirror \
  --mirror-home <isolated-temp-home> \
  --journey-fixture contracts/mirror-journey-projections/v1/fixtures/journey
npm test
npm run build
```

The pre-release real probe result must be `contract_unavailable` with its documented exit code. This validates the kit, not Mirror conformance.

## Non-Goals

- Do not alter `/Users/alissonvale/mirror`.
- Do not implement projection storage, Ariad compilation or extension APIs.
- Do not install, release or update Mirror.
- Do not read or mutate production `memory.db`.
- Do not initialize Protocol or Mirror Extension repositories yet.
- Do not implement Protocol, Method, synthesis or Harness readers.
- Do not attach private conversation evidence.
- Do not weaken the external production gate.

## Stop Conditions

- The probe requires importing Mirror internals.
- The contract cannot stay domain-neutral outside Ariad semantics.
- Tests require production state.
- The probe would mutate Mirror source or install packages.
- Public behavior cannot be specified without implementing Core.

## Approval Gate

Implementation remains blocked until the Navigator approves this plan.
