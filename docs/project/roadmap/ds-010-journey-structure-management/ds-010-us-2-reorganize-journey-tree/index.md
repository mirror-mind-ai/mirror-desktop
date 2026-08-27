[< DS-010](../index.md)

# DS-010.US-2 — Reorganize Journey Tree

**Status:** 🟢 Done
**Type:** User Story

---

## User Story

As the Navigator,
I want to reorganize Journeys directly in Tree mode,
So that the canonical hierarchy can evolve with the work without external metadata editing.

## Outcome

Drag-and-drop and a keyboard-accessible equivalent move a Journey before, after or inside another valid location with clear drop intent, bounded auto-scroll and confirmation through verified native reload.

## Acceptance Behavior

```text
Given a current canonical Journey tree
When I move one Journey to a valid parent and sibling position
Then Mirror persists only that structural change and the verified tree reflects it without altering Journey identity or conversation authority.
```

## Scope

- Drag handles and pointer/keyboard movement.
- Before, after, inside and root placement.
- Drop indicators, auto-scroll and cancellation.
- Cycle, stale-version and invalid-target rejection.
- Stable sibling-order persistence.

## Out Of Scope

- Renaming, deleting, merging or duplicating Journeys.
- Changing project path, pins, semantic content or dedicated generations.
- Automatic hierarchy suggestions.

## Validation

Move roots and nested nodes across representative depths using pointer and keyboard, verify stable order after restart/reload, and prove cycle/stale/failure cases leave the prior hierarchy intact.
