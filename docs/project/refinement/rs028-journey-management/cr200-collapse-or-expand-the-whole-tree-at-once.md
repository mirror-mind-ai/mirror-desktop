[< RS028](index.md)

# CR200: Collapse or Expand the Whole Tree at Once

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `main` (`21ffb4b8`), RS028 group A
**Group:** A, reading the tree

## Friction

The tree can only be collapsed or expanded one branch at a time. With a deep family, getting back to
an overview takes many clicks.

## Outcome

Two actions, Collapse all and Expand all, act on the whole tree in one gesture and keep the
selected Journey visible.

## First Investigation

`collapsedJourneyIds` and `filterCollapsedJourneyTree` (`App.tsx`, `journeyRegistry.ts`) already
hold the per-branch state, and CR133 made it survive reload. Decide where the actions live (tree
header or the tree's menu) and whether Collapse all keeps the selected Journey's ancestors open.

## Acceptance

- Collapse all leaves only roots visible, except the path to the selected Journey if so decided.
- Expand all opens every branch.
- Both choices persist like a single-branch toggle does (CR133).

## Boundaries

Tree view only. No change to conversation-list disclosure inside a Journey.

## Delivered (2026-11-05)

On `main` in `21ffb4b8`; the development check is owed (RS028, Group A Check).

- Collapse all and Expand all sit in the tree tools row under the view switch.
- Collapse all keeps the selected Journey's ancestors open, so the selection stays on screen; its own
  children close like any other branch.
- **Finding:** closed branches survived only a tree reload (CR133), not a restart; they lived in
  memory. They are now saved as `collapsedJourneyIds`, so both gestures survive a restart.
