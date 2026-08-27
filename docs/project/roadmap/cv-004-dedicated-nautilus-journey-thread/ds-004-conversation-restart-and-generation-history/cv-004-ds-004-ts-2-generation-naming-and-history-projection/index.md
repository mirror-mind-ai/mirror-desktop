[< Parent](../index.md)

# CV-004.DS-004.TS-2 — Generation Naming and History Projection

**Status:** 🟡 Planned  
**Type:** Technical Story

## Outcome

Each generation has deterministic presentation metadata and an independently preserved Harness projection, while bounded newest-first history clearly distinguishes the single active generation from inactive predecessors.

## Acceptance Behavior

```text
Given a thread has multiple generations
When history is projected
Then exactly one generation is active
And inactive generations retain bounded native metadata and projection ownership
And names never substitute for native-ID authority
```

## Scope

- Deterministic bounded generation names.
- Generation-scoped dedicated projection namespace and safe flat-file migration.
- Newest-first bounded history view model.
- Read-only inactive-generation metadata.

## Out of Scope

- Detailed historical transcript browser, search or export.
- Reactivation or merge.

## Validation

Naming tables, namespace migration tests, history ordering tests and authority checks proving inactive generations cannot accept turns.
