[< RS028](index.md)

# CR199: Keep Inactive Journeys Out of the Tree Until Asked

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `main` (`21ffb4b8`), RS028 group A
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

## Delivered (2026-11-05)

On `main` in `21ffb4b8`; the development check is owed (RS028, Group A Check).

- `filterInactiveJourneyTree` (`src/domain/journeyRegistry.ts`) hides a Journey only when it and
  everything below it is inactive. An inactive Journey that holds an active child, or that is the
  selection, stays and reads as dimmed. Its disclosure toggle follows what is shown.
- The filter applies to the **Tree** view only. Recent and Pinned already list chosen Journeys, and
  search shows every match, so a hidden Journey is still found and, once selected, stays on screen.
- The control under the view switch reads "Show N inactive" or "Hide inactive" and appears only
  when there is something to hide. On by default; saved as `hideInactiveJourneys`.
- An inactive Journey shown in the tree is dimmed whether the filter is on or off.
- Tests: `src/tests/rs028GroupATreeReading.test.ts`; seven mutations, all caught.
