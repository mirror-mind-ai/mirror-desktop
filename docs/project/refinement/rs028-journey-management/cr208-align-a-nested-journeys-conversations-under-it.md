[< RS028](index.md)

# CR208: Align a Nested Journey's Conversations Under It

**Status:** in_progress
**Driver:** assistant
**Delivery:** `main` (`75382d16`)
**Group:** follow-up to group A, found 2026-11-06

## Friction

In the Tree view, the conversations opened under Livro Liderança Soberana (two levels deep) drew
their vertical guide at the root's column, far left of the Journey they belong to (Navigator,
2026-11-06, screenshot).

## Cause

`.journey-list.tree-mode .focused-conversation-sidebar` had a fixed `margin-left: 20px`, while the
tree rows indent by `--journey-depth` × 16px.

## Change

The group receives the Journey's depth (`depth` prop, set only in Tree view) as `--journey-depth`,
and its margin is `calc(20px + depth × 16px)`.

## Check

Open the conversations of a root Journey, of a child and of a grandchild (Livro Liderança Soberana).
Each group's guide and its "Conversations" heading start under its own Journey.
