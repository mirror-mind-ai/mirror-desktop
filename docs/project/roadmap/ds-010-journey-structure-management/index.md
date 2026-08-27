[< Roadmap](../index.md)

# DS-010 — Journey Structure Management

**Status:** 🟡 Planned

---

## Outcome

Navigator can create, position and configure Journeys directly from the Harness while Mirror remains the sole canonical authority for Journey identity, hierarchy, stable sibling order and project association.

## Why This Matters

The Harness can now render and reload a dense Journey hierarchy, but changing that hierarchy still requires leaving the desktop. Creating a Journey, moving it in the tree and assigning its project path are not isolated interface refinements: they are one administrative capability with shared transactional, authority, validation and recovery requirements.

The desktop should make these operations deliberate without making a Journey synonymous with a repository or a Nautilus conversation. A new Journey begins as canonical Mirror identity and metadata only. Its dedicated Nautilus thread remains governed by the separate explicit **Start this Journey** lifecycle.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [DS-010.TS-1](ds-010-ts-1-canonical-journey-mutation-contract/index.md) | Canonical Journey Mutation Contract | Technical Story | Define versioned authority, hierarchy/order invariants, stale-source rejection and rollback semantics shared by every Journey administration operation | 🟡 Planned |
| [DS-010.TS-2](ds-010-ts-2-atomic-mirror-mutation-gateway/index.md) | Atomic Mirror Mutation Gateway | Technical Story | Execute bounded model-free Mirror identity mutations and publish a verified replacement registry without exposing partial desktop state | 🟡 Planned |
| [DS-010.US-1](ds-010-us-1-create-journey/index.md) | Create Journey | User Story | Create a canonical root from the Tree control menu or a child from an item context menu with its parent preselected, using name, slug, description, tree position and optional project path | 🟡 Planned |
| [DS-010.US-2](ds-010-us-2-reorganize-journey-tree/index.md) | Reorganize Journey Tree | User Story | Reparent and reorder Journeys with drag-and-drop plus keyboard parity while preserving all non-structural authority | 🟡 Planned |
| [DS-010.US-3](ds-010-us-3-assign-journey-project-path/index.md) | Assign Journey Project Path | User Story | Assign, replace or clear a Journey's canonical local project association through an explicit safe desktop action | 🟡 Planned |

## Shared Product Contract

```text
Harness intent
  validate against exact registry version
    one model-free canonical Mirror transaction
      verify native result
        export and validate replacement registry
          publish desktop projection
```

Names, text, paths and visual position never establish authority. Native Journey IDs and exact source-version evidence do.

## Done Condition

DS-010 is done when the Navigator can create a Journey, move it within the canonical hierarchy, establish stable sibling order and assign or clear its project path from the Harness; every operation validates exact native authority, rejects cycles/stale input/invalid paths, commits atomically in Mirror, reloads and verifies the registry before reporting success, preserves unrelated Journey identity and dedicated conversation state, provides keyboard-accessible equivalents, and invokes no provider.

## Boundaries

- Mirror remains canonical authority for Journey identity and metadata.
- Harness coordinates explicit administration and projects the verified result.
- Creating a Journey does not create a repository, files, Pi session, Mirror conversation or Nautilus thread.
- Moving a Journey changes only parentage and sibling order.
- Assigning `project_path` grants no filesystem mutation authority.
- No operation infers identity or paths from names, recency or filesystem discovery.
- No provider, Pi run or conversational turn participates in administration.
- Automatic watchers, implicit synchronization, deletion and Journey merging remain out of scope.

## Refinement Sources

- `CR019 — Reorganize the Journey tree with drag and drop`
- `CR020 — Assign and change a Journey project path from the Harness`
- `CR021 — Create a Journey from the Tree context menu`
