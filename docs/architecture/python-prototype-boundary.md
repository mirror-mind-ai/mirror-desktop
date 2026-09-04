# Python Prototype Boundary

**Status:** active

## Decision

Python scripts created during the predecessor DS-001 and DS-002 remain prototype and characterization references for non-Mirror bodies.

TypeScript is the implementation direction for Mirror Desktop application behavior and for Nautilus protocol behavior consumed by the desktop. Mirror extensions may remain Python because they belong to the Mirror runtime body.

## Prototype references

These files remain useful as behavior references while their TypeScript equivalents remain active:

- `scripts/show_identity.py`
- `scripts/show_mission.py`
- `src/protocol/schema.ts`
- `src/protocol/loadFixture.ts`
- `src/domain/nautilusViewModel.ts`
- `src/tests/protocol.test.ts`

The Nautilus names in these protocol fixtures describe method semantics rather than current application identity.

## TypeScript parity

TypeScript validation covers:

- Nautilus method identity fields;
- Mission id, title, purpose and formulated status;
- GUI view-model derivation;
- application and native runtime contracts outside the method model.

## Boundary

Do not add new non-Mirror Nautilus protocol behavior in Python. New Mirror Desktop application behavior belongs in TypeScript unless a later roadmap decision changes the architecture. Python bridge scripts may continue to call released Mirror operations through explicit bounded contracts.
