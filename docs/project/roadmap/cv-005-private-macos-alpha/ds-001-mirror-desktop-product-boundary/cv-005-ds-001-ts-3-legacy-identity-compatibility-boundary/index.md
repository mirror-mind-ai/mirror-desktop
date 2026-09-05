[< Parent](../index.md)

# CV-005.DS-001.TS-3 - Legacy Identity Compatibility Boundary

**Status:** ✅ Done
**Type:** Technical Story

## Technical Story

In order to establish a new product identity without rewriting valid history or method contracts,
as the persistence and compatibility boundary,
I want new Mirror Desktop coordinates separated from required Nautilus legacy readers,
so that new state is coherent and old state remains safe wherever compatibility is explicitly required.

## Outcome

The inventory identifies which persisted names remain stable, which new writes adopt Mirror Desktop coordinates and which legacy reads require characterization. Method-owned Nautilus projections remain intact, and no predecessor app data is silently migrated or deleted.

## Acceptance Behavior

```text
Given representative current and legacy identity records
When Mirror Desktop parses existing state and writes newly approved state
Then every changed coordinate follows the inventory's read and write policy
And required legacy records remain readable
And Nautilus method namespaces retain their meaning
And predecessor app-data roots are neither imported nor modified automatically
```

## Scope

- Persisted thread and generation envelopes affected by identity naming.
- Event, source interface, receipt and correlation coordinates classified by the inventory.
- New human-readable session and conversation naming.
- Legacy parsing characterization where a durable value changes.
- `nautilus-synthesis` Tactical and Strategic projection preservation.
- Explicit no-migration behavior for predecessor app-data roots.

## Out Of Scope

- Bulk migration of Nautilus Harness app data.
- Rewriting historical roadmap, conversations or receipts.
- Renaming genuine Nautilus method semantics.
- Runtime binding portability.

## Validation

Run characterization fixtures for every changed durable coordinate, prove new-write behavior separately from required legacy reads, inspect projection namespaces, and verify that no test or command modifies predecessor app-data paths.
