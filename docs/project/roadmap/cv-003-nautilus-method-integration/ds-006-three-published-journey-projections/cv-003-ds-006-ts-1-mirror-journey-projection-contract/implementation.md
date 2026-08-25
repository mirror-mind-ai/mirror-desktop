# Implementation — CV-003.DS-006.TS-1

## Summary

Materialized a self-contained consumer contract and return acceptance kit for Mirror Journey Projection Contract v1 without changing Mirror Core or production state.

## Delivered Package

```text
contracts/mirror-journey-projections/v1/
  README.md
  SPECIFICATION.md
  RETURN-CONTRACT.md
  PROBE-SHA256SUMS
  mirror-return.example.json
  schemas/
  fixtures/
  probe/
  tests/
```

## Contract Surface

The specification defines:

- `mirror.journey-projections` contract discovery and version `1.0`;
- Journey ID authority and registry-root resolution;
- canonical confinement, path rejection and implicit extension namespaces;
- deterministic UTF-8 serialization;
- schema validation and atomic snapshot/manifest publication;
- last-valid preservation and actionable divergence;
- Ariad Operational hierarchy, active work, Exploratory Stories and Refinement Stories;
- deterministic lifecycle refresh and explicit rebuild;
- stable extension-facing publish/inspect semantics;
- no model, network, private evidence or write-back behavior;
- constrained test-only probe preparation;
- compatibility and release-return gates.

## Consumer Probe

`probe/contract_probe.py` is a standard-library black-box executable. It classifies:

```text
contract_unavailable
nonconformant
unsafe
probe_error
passed
```

It verifies capability discovery, normative Operational output, extension publication, schema rejection, last-valid preservation, unsafe identifiers, namespace isolation and final manifest consistency.

The probe always refuses the production Mirror home. Production-return mode tests the installed binary with isolated data.

## TDD Evidence

The first run failed because `probe.contract_probe` did not exist. The implemented probe then passed 10 behavior tests. Schema and fixture consistency expanded the suite to 16 tests.

```text
python unittest: 16 passed
JSON parse validation: passed
probe --help: passed
current Mirror baseline: contract_unavailable, exit 10
npm test: 35 files, 237 tests passed
npm run build: passed
```

## Baseline Meaning

`contract_unavailable` is the required result before Mirror implements v1. It proves that the acceptance kit recognizes absence cleanly. It does not open the return gate.

## Boundaries Preserved

- `/Users/alissonvale/mirror` source is unchanged.
- Production `memory.db` was not opened or mutated.
- Mirror was not installed, migrated, released or updated.
- Protocol and Mirror Extension Git repositories were not initialized.
- No Nautilus consumer implementation began.
- Fixtures contain synthetic content only.
