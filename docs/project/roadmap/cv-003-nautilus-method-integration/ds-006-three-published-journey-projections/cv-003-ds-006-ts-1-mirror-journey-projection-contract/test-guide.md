# Test Guide — CV-003.DS-006.TS-1

## Purpose

Prove the contract package is self-sufficient, internally consistent and able to distinguish unavailable, conformant, nonconformant and unsafe Mirror implementations without implementing Mirror Core here.

## Independent Reading

Give the package to a reviewer without this conversation. Pass when they can identify the public capability, Ariad model, namespace/publication rules, security and atomicity requirements, lifecycle refresh, evidence restrictions, release gate and remaining Nautilus ownership.

## Schema and Fixture Consistency

Validate every fixture against its declared schema. Pass when valid fixtures conform, invalid fixtures fail intentionally, Operational hierarchy includes CV/DS/US/TS plus exploration/refinement, and all content is synthetic.

## Probe Conformance

Run self-tests with the conformant fake adapter. Pass when the probe emits `passed`, validates Operational output, publishes within its synthetic namespace and proves invalid attempts preserve the last valid state.

## Missing and Incompatible Capability

Test missing and wrong-version fake adapters, then current pre-contract Mirror with an isolated home. Pass when missing support yields `contract_unavailable`, wrong version yields `nonconformant`, and no traceback replaces machine-readable output.

## Security

Fake adapters accept traversal, absolute paths, symlink escape or foreign namespace publication. Pass when every acceptance makes the probe emit `unsafe`.

## Atomicity

Fake adapters publish manifest early, corrupt output or mishandle invalid candidates. Pass when the probe reports failure and verifies prior snapshot and manifest preservation.

## Production Safety

Point the probe at production `MIRROR_HOME` without production-return mode. Pass when it refuses before invoking Mirror. Do not exercise production-return mode during this story.

## Return Gate

Inspect `RETURN-CONTRACT.md` and its blocked sample. Pass when release metadata alone remains blocked and only unchanged probe hash plus installed-runtime `passed` can open the gate.

## Commands

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

## Expected Pre-Release Result

```json
{
  "contractVersion": "1.0",
  "result": "contract_unavailable",
  "gate": "blocked"
}
```

## Evidence Restrictions

Do not record production data, prompts, responses, transcript bodies, raw reasoning, secrets, arbitrary environment values or real Journey content in fixtures.

## Pass Condition

Schemas, fixtures, probe, fake adapter and self-tests are coherent; self-tests pass; current Mirror is reported unavailable through isolation; frontend regression remains green; and no Mirror source or production state changes.

## Fail Condition

The package depends on this conversation, imports Mirror internals, allows unsafe behavior to pass, disagrees with its fixtures, touches production, or implements Mirror Core.
