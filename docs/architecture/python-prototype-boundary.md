# Python Prototype Boundary

**Status:** active after DS-004

## Decision

The Python scripts created during DS-001 and DS-002 are prototype and characterization references for the non-Mirror bodies.

TypeScript is now the implementation direction for Nautilus app and protocol behavior in the Harness. The Mirror Extension may remain Python because it belongs to the Mirror runtime body.

## Prototype references

These files remain useful as behavior references until the TypeScript implementation is considered mature enough to replace them:

- `agentic-protocol/scripts/validate_identity.py`
- `agentic-protocol/scripts/validate_mission.py`
- `agentic-protocol/src/nautilus_protocol/identity.py`
- `harness/scripts/show_identity.py`
- `harness/scripts/show_mission.py`

## TypeScript parity now available in Harness

DS-004 introduced TypeScript validation for:

- Nautilus identity fields;
- Mission id;
- Mission title;
- Mission purpose;
- Mission status as `formulated`;
- GUI view model derivation.

The TypeScript parity lives in:

- `harness/src/protocol/schema.ts`
- `harness/src/protocol/loadFixture.ts`
- `harness/src/domain/nautilusViewModel.ts`
- `harness/src/tests/protocol.test.ts`

## Boundary

Do not add new non-Mirror Nautilus protocol behavior in Python. New app and protocol behavior should be implemented in TypeScript unless a later roadmap decision changes the architecture.
