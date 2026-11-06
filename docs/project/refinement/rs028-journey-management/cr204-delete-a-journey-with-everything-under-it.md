[< RS028](index.md)

# CR204: Delete a Journey With Everything Under It

**Status:** captured
**Driver:** —
**Delivery:** —
**Group:** D, removing a subtree

## Friction

Delete Journey works only on an empty leaf. The Core's `removeJourney`
(`mirror-ts/ts/src/journey/journeyRemoval.ts`) refuses a Journey with child Journeys or with any
associated record: conversations, memories, tasks, attachments, journey paths, runtime sessions,
explorer and refinement stories, change requests and cursors. A Journey no longer needed must be
emptied by hand, child by child.

## Outcome

The Navigator can delete a Journey and its descendants in one act, after a confirmation that lists
what will go, with a Mirror backup taken first.

## First Investigation

This needs a new Core call; the app cannot do it alone, and it goes in the single Core PR. Decide
with the Navigator, before any design, what happens to each associated record: erased, kept
detached, or moved to the parent. Memories and conversations are the Navigator's history; erasing
them is irreversible outside a backup. Also decide what happens to the folders on disk (the default
should be nothing) and to a running agent anywhere in the subtree (refuse).

## Acceptance

- The confirmation names the Journeys and the counts of each record kind that the act affects.
- A backup exists before the first write, and the deletion is one transaction.
- A subtree with a running agent is refused with the Journey named.
- After deletion and restart, no record points at a removed Journey, and no folder was touched.

## Boundaries

No deletion of files on disk. No cascade without the confirmation. The Core change follows the Core's
own gates.
