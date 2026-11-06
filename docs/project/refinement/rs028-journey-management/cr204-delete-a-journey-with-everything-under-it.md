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

The Navigator can delete a Journey and every record that belongs to it in one act, after a
confirmation that lists what will go, with a Mirror backup taken first. A checkbox, off by default,
also deletes the contents of the Journey's project path.

## First Investigation

This needs a new Core call; the app cannot do it alone, and it goes in the single Core PR. Decide
with the Navigator, before any design, what happens to each associated record: erased, kept
detached, or moved to the parent. Memories and conversations are the Navigator's history; erasing
them is irreversible outside a backup. Also decide what happens to the folders on disk (the default
should be nothing) and to a running agent anywhere in the subtree (refuse).

## Navigator decisions (2026-11-05)

- **Everything goes.** Conversations, memories, tasks, attachments and every other associated record
  are deleted with the Journey. Organizing the tree and the data is the person's own act, and the
  product grants that autonomy even at the risk of a mistaken loss.
- **The folder is the person's choice.** A checkbox in the confirmation, off by default, deletes the
  contents of the Journey's project path as well.
- **The one friction kept:** a Journey with child Journeys cannot be deleted. Its children must be
  moved or deleted first, so the act is never a silent cascade through the tree.

These decisions replace the title's "everything under it" for child Journeys: the cascade runs
through a Journey's records, not through its descendants.

## Acceptance

- The confirmation names the Journeys and the counts of each record kind that the act affects.
- A backup exists before the first write, and the deletion is one transaction.
- A Journey with child Journeys is refused, naming them.
- A Journey with a running agent is refused with the Journey named.
- After deletion and restart, no record points at the removed Journey.
- With the checkbox off, no file on disk is touched; with it on, the project path's contents are gone
  and nothing outside that folder is touched. A project path that is the home, a volume root or an
  ancestor of another Journey's folder is refused.

## Boundaries

No deletion of files on disk unless the checkbox is ticked. No deletion without the confirmation. The Core change follows the Core's
own gates.
