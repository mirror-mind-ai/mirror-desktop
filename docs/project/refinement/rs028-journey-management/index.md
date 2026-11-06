[< Refinement Workbench](../index.md)

# RS028 — Journey Management

**Status:** active

## Framing

Created by the Navigator on 2026-11-03, reorganizing the backlog: improvements to how the Navigator
creates, places and edits Journeys. CR098 and CR099 were captured in RS021 (UX Pre-Beta Evolution)
and moved here, because they are product features of one theme rather than pre-beta polish.

On 2026-11-05 the Navigator made this RS the next priority, added six captures (CR199 to CR204),
asked for grouped delivery and validation, and widened CR099: no tree operation is blocked by a
running turn without a very strong reason.

Related, already done: [CR100](../rs021-ux-pre-beta-evolution/cr100-make-journey-image-updates-supported.md)
(Journey image updates) and
[CR130](../rs021-ux-pre-beta-evolution/cr130-stop-offering-a-journey-edit-that-cannot-succeed.md)
(no Journey edit offered that cannot succeed).

## Change Requests

| CR | Group | Status | Note |
|----|-------|--------|------|
| [CR199: Keep Inactive Journeys Out of the Tree Until Asked](cr199-keep-inactive-journeys-out-of-the-tree-until-asked.md) | A | in_progress | on `main`, check owed |
| [CR200: Collapse or Expand the Whole Tree at Once](cr200-collapse-or-expand-the-whole-tree-at-once.md) | A | in_progress | on `main`, check owed |
| [CR201: Show a Journey's Folder in Its Tooltip](cr201-show-a-journeys-folder-in-its-tooltip.md) | A | in_progress | on `main`, check owed; always shown |
| [CR202: Say Which Folder the Agent Is Working In](cr202-say-which-folder-the-agent-is-working-in.md) | B | captured | needs one native read |
| [CR197: A Moved Journey Folder Sends the Turn to the Neutral Folder Without a Word](../rs026-after-the-0-3-cutover/cr197-a-moved-journey-folder-sends-the-turn-to-the-neutral-folder-without-a-word.md) | B | captured | owned by RS026, delivered here |
| [CR099: Allow Safe Editing During Another Journey's Work](cr099-allow-safe-editing-during-another-journeys-work.md) | C | captured | widened 2026-11-05 to every tree operation |
| [CR203: Reparent a Journey by Dragging It](cr203-reparent-a-journey-by-dragging-it.md) | C | captured | drag exists but is gated and crude |
| [CR098: Allow a Journey to Be Reparented](cr098-allow-a-journey-to-be-reparented.md) | C | captured | absorbed by CR203 |
| [CR204: Delete a Journey With Everything Under It](cr204-delete-a-journey-with-everything-under-it.md) | D | captured | needs a Core call; decided: records and optional folder go, children refuse |

## Groups

Each group is built, checked and validated together, in the development app bound to
`ensaio-5c-2`.

1. **A, reading the tree** (CR199, CR200, CR201). Renderer only and low risk; one check.
2. **B, where the agent works** (CR202, CR197). One native resolution, shown and enforced.
3. **C, reshaping the tree** (CR099, CR203, CR098). CR099 first, because a drag gated by any
   running turn is not a usable feature.
4. **D, deleting a Journey and its data** (CR204). Last: irreversible, needs the Core PR. The Navigator
   decided on 2026-11-05: all records go, the folder only by a checkbox, and a Journey with
   children is refused.

## Group A Check

CR199, CR200 and CR201, in the development app bound to `ensaio-5c-2`, in the Tree view:

1. Completed, paused and planned Journeys are gone, and a button under the view switch reads
   "Show N inactive". An inactive Journey that holds an active child is still there, dimmed. (CR199)
2. "Show N inactive" brings them back, dimmed; "Hide inactive" takes them away again. Searching for
   a hidden Journey finds it, and selecting it keeps it on screen. (CR199)
3. Collapse all leaves only the roots, plus the path to the selected Journey. Expand all opens
   everything. (CR200)
4. Quit and reopen the app: the filter and the closed branches are as you left them. (CR199, CR200)
5. Hovering any Journey shows its folder on a second line, starting with `~`, or "No folder set".
   (CR201)

## Order

A, B, C, D, accepted by the Navigator on 2026-11-05. Group A is in progress.
