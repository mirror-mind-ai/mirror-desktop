[< RS028](index.md)

# CR199: Keep Inactive Journeys Out of the Tree Until Asked

**Status:** captured
**Driver:** —
**Delivery:** —
**Group:** A, reading the tree

## Friction

Completed, paused and planned Journeys sit in the tree beside active ones with the same weight. As
the tree grows, the Navigator scrolls past finished work to find the work in progress.

## Outcome

The tree shows active Journeys by default and offers one visible control to show the others. The
choice persists across restarts. A hidden Journey stays reachable by search and keeps its data.

## First Investigation

The registry item already carries `status` (`src/domain/journeyRegistry.ts`). Decide, with the
Navigator, what an active descendant under an inactive parent shows (the parent must stay visible
as a dimmed ancestor, or the child is orphaned on screen); whether the selected Journey stays visible
when its status is inactive; and whether Recent and Pinned views follow the same filter. A status
Mirror does not know (written by hand) counts as active, so nothing disappears by accident.

## Acceptance

- With the filter on, no `completed`, `paused` or `planned` Journey appears unless it is the
  ancestor of a visible one, and then it reads as dimmed.
- One control turns the filter off and on; the choice survives a restart.
- Search still finds a hidden Journey, and selecting it shows it.
- No Journey is changed in Mirror by hiding it.

## Boundaries

Presentation only. No new status, no write to Mirror, no change to which statuses Mirror accepts.
