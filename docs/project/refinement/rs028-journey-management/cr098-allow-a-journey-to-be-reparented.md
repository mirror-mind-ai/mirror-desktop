[< RS028](index.md)

# CR098: Allow a Journey to Be Reparented

**Status:** done
**Driver:** @alissonvale
**Delivery:** absorbed by [CR203](cr203-reparent-a-journey-by-dragging-it.md), `main` (`61a434cc`)
**Group:** C, absorbed by CR203

## Friction

The Journey edit form does not let the Navigator change a Journey's parent. A Journey can therefore
be created in the wrong place in the hierarchy but cannot be corrected through the application.

## Outcome

The Journey edit surface lets the Navigator select a valid different parent, including the root when
that is a valid choice, and persists the hierarchy change without altering the Journey's identity,
conversations, documents or descendants.

## First Investigation

Characterise the current form and mutation contract before choosing a design: establish whether the
parent field is absent only from presentation or whether the native mutation rejects it; enumerate
cycle, self-parenting, missing-parent and active-runtime safeguards; and verify the durable Journey
registry after reload.

## Acceptance

- An eligible Journey can move to another eligible parent or root from its edit form.
- Invalid hierarchy mutations are refused with an actionable explanation and leave the existing tree
  unchanged.
- The Journey keeps its exact identity and associated data after move and restart.
- Moving one Journey never changes another Journey's authority or active run.

## Boundaries

No implicit move, no bulk restructuring, and no mutation while the exact Journey's own active work
would make that unsafe. This CR does not decide the separate cross-Journey editing policy in CR099.

## Closed as absorbed (2026-11-06)

The outcome is met without the surface this CR imagined. Reparenting is reachable two ways: the Move
Journey form, which always carried a Parent field and a sibling position, and the drag CR203 made
usable. The edit form stays about identity, and says so.

What this CR still paid for: the Move form listed **every** Journey as a candidate parent, including
the moved Journey's own descendants, which the Core refuses as `invalid_parent`. Offering a choice
that cannot work is worse than not offering it, so `eligibleParentJourneys` now removes the moved
Journey and its subtree from the list. That was this CR's real remaining defect.
