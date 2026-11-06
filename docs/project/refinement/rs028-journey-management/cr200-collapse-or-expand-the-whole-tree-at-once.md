[< RS028](index.md)

# CR200: Collapse or Expand the Whole Tree at Once

**Status:** captured
**Driver:** —
**Delivery:** —
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
