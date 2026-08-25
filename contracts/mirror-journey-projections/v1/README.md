# Mirror Journey Projection Contract v1 Acceptance Kit

This package is the consumer-owned specification and black-box return probe for the Mirror capability required by Nautilus three-altitude Journey projections.

It is acceptance input for a separate Mirror Builder session. It is not a Mirror implementation and must not be copied into Mirror Core as production code.

## Reading Order

1. `SPECIFICATION.md`
2. `schemas/*.schema.json`
3. `fixtures/expected/*.json`
4. `probe/contract_probe.py`
5. `tests/test_contract_probe.py`
6. `RETURN-CONTRACT.md`

## Boundaries

The receiving Mirror session may implement the contract using its own architecture, but it must preserve public behavior, security, atomicity, Ariad semantics and the production return gate.

The session must not edit this package to make its implementation pass. Contract changes return to Nautilus for explicit review.

This package contains synthetic data only. Do not replace it with production Journey, transcript or database content.

## Self-Tests

From the Harness repository:

```bash
python3 -m unittest discover \
  -s contracts/mirror-journey-projections/v1/tests \
  -p 'test_*.py'
```

The tests exercise the probe against stateful fake Mirror modes, including missing capability, incompatible version, malformed Operational output, unsafe path acceptance, partial publication and subprocess failure.

## Probe Integrity

The transfer hash baseline is recorded in `PROBE-SHA256SUMS`.

```bash
cd contracts/mirror-journey-projections/v1
shasum -a 256 -c PROBE-SHA256SUMS
```

The receiving Mirror session must not alter these files to obtain conformance.

## Probe Help

```bash
python3 contracts/mirror-journey-projections/v1/probe/contract_probe.py --help
```

## Pre-Release Probe

Use an isolated temporary Mirror home. Never point pre-release validation at production state.

```bash
TEMP_HOME="$(mktemp -d)"
python3 contracts/mirror-journey-projections/v1/probe/contract_probe.py \
  --mirror-command-json '["uv","run","python","-m","memory"]' \
  --mirror-root /Users/alissonvale/mirror \
  --mirror-home "$TEMP_HOME" \
  --journey-fixture contracts/mirror-journey-projections/v1/fixtures/journey
```

Before Mirror implements v1, the expected machine result is `contract_unavailable` and the gate remains blocked.

## Mirror Session Instruction

Use this package to:

- create the Mirror roadmap and approved delivery plan;
- implement through TDD;
- make the unchanged probe pass;
- run full Mirror CI;
- publish a versioned central release;
- back up and update production safely;
- complete `RETURN-CONTRACT.md` through a separate `mirror-return.json` record.

Do not begin Nautilus consumption from the Mirror session.

## Return to Nautilus

After installation, rerun the unchanged probe against the installed executable using an isolated home. Only `result: passed` plus complete return evidence opens the gate for Nautilus Protocol, Method, Extension and Harness work.
