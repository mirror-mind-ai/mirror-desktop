[< RS028](index.md)

# CR204: Delete a Journey With Everything Under It

**Status:** done
**Driver:** Navigator
**Delivery:** Core CR200 on branch `nautilus-core-requests` (`ac9a84da`); app `a33a4575`, `cf9c8a70`
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

## Navigator decisions (2026-11-06)

The rules for each record, agreed before the Core call was written, under one principle: **trade
refusal for transparency**. Where Nautilus or Mirror cannot judge data it does not own, it shows it
and lets the person decide, rather than block.

1. A record that belongs to the Journey itself goes: Conversations, memories, tasks, attachments,
   stories, change requests, cursors, Journey paths, the scene orientation.
2. What belongs to a deleted Conversation or memory goes with it: messages, embeddings, provider call
   records, memory access records.
3. A record of another Journey that only points at something deleted stays, with that link cleared.
   The production home showed why: 956 memories sit under a Journey other than their Conversation's.
4. Extension rows go when an `ext_*` table's `journey_id` or `journey` column names the Journey
   exactly, and the confirmation names the owning extension. When the extension mechanism exists, an
   extension can take this cleanup over.

## Built (2026-11-06)

- **Core CR200** (`mirror-ts`, branch `nautilus-core-requests`, `ac9a84da`, not pushed):
  `previewJourneyDeletion` counts every rule without writing and hashes it;
  `deleteJourneyWithRecords` acts only on that digest, in one immediate transaction, behind a named
  backup it verifies first, and refuses child Journeys by name. The app pins that commit; the alpha
  preflight refuses to release an unreleased Core.
- **The confirmation** (`src/domain/journeyDeletion.ts`, `src/app/JourneyDeletionList.tsx`) lists
  what goes from Mirror, extension rows per owner, what other Journeys keep, and Nautilus's own files;
  the button names the count. A changed list previews again.
- **Nautilus's own files** (`src-tauri/src/journey_deletion.rs`): the Journey's thread, thread
  operation, Conversation history and segments, Conversation list, settlement timings, turn journal,
  custom image and Pi sessions are **moved** to `deleted-journeys/<stamp>-<id>/` in the home's state
  folder, not erased: the app's counterpart of Mirror's backup. Until now their existence refused the
  deletion of nearly every Journey ever used.
- **Work in flight refuses**, read natively: a turn, compaction or thread operation in the Journey,
  or turns of it still waiting to be saved into Mirror.
- **The project folder**, only with the box ticked: its contents are deleted (the folder stays), never
  through a link, and refused when it is the home folder or holds it, a volume or system folder, a
  standard home folder, a folder holding Nautilus's or Mirror's data, or one holding another Journey's
  folder. It is decided before Mirror is asked, so a refused folder deletes nothing. The files are
  deleted, not moved to the Trash; the confirmation says so.
- Tests: `rs028GroupDDeleteJourney` (10), the native module (10), the bridge's mapping and refusals,
  and the real-host test driving the new Core end to end. Mutations: 14 on the domain, 21 on the native
  module, all caught but one equivalent.

## Validation (2026-11-06)

The Navigator ran the Group D check in the development app and validated it, with two corrections
applied in `cf9c8a70`: the line under the tree after a deletion listed the backup and the
moved-aside folder by full path, crowded the sidebar and vanished in three seconds, so a clean
deletion now says nothing (the tree is the answer) and only an unfinished step is written, staying
until read; and the confirmation's "Deleted from Mirror:" read as already done, so the list now says
what **will be** deleted and kept. The CR ships when Core CR200 is released and pinned.
