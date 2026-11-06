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
| [CR199: Keep Inactive Journeys Out of the Tree Until Asked](cr199-keep-inactive-journeys-out-of-the-tree-until-asked.md) | A | done | validated 2026-11-05 |
| [CR200: Collapse or Expand the Whole Tree at Once](cr200-collapse-or-expand-the-whole-tree-at-once.md) | A | done | validated 2026-11-05 |
| [CR201: Show a Journey's Folder in Its Tooltip](cr201-show-a-journeys-folder-in-its-tooltip.md) | A | done | validated 2026-11-05; always shown |
| [CR202: Say Which Folder the Agent Is Working In](cr202-say-which-folder-the-agent-is-working-in.md) | B | done | validated 2026-11-06 |
| [CR197: A Moved Journey Folder Sends the Turn to the Neutral Folder Without a Word](../rs026-after-the-0-3-cutover/cr197-a-moved-journey-folder-sends-the-turn-to-the-neutral-folder-without-a-word.md) | B | done | owned by RS026, delivered and validated here |
| [CR099: Allow Safe Editing During Another Journey's Work](cr099-allow-safe-editing-during-another-journeys-work.md) | C | done | validated 2026-11-06 |
| [CR203: Reparent a Journey by Dragging It](cr203-reparent-a-journey-by-dragging-it.md) | C | done | validated 2026-11-06, after five field reports |
| [CR098: Allow a Journey to Be Reparented](cr098-allow-a-journey-to-be-reparented.md) | C | done | absorbed by CR203; the Move form's parent list fixed |
| [CR204: Delete a Journey With Everything Under It](cr204-delete-a-journey-with-everything-under-it.md) | D | done | validated 2026-11-06; ships with the Core CR200 release |
| [CR205: Make the Deletion List Legible and Name the Journey in the Title](cr205-make-the-deletion-list-legible-and-name-the-journey-in-the-title.md) | D | captured | found in v0.4.0-alpha.4: pale list on light themes |
| [CR208: Align a Nested Journey's Conversations Under It](cr208-align-a-nested-journeys-conversations-under-it.md) | A | done | built in `75382d16`; validated 2026-11-06 |
| [CR209: Make the Working Folder Line Readable on Light Themes](cr209-make-the-working-folder-line-readable-on-light-themes.md) | B | done | built in `75382d16`; validated 2026-11-06 |

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

CR199, CR200 and CR201, in the development app bound to `ensaio-5c-2`, in the Tree view.
**Passed, and the group was validated by the Navigator on 2026-11-05.**

1. Completed, paused and planned Journeys are gone, and a button under the view switch reads
   "Show N inactive". An inactive Journey that holds an active child is still there, dimmed. (CR199)
2. "Show N inactive" brings them back, dimmed; "Hide inactive" takes them away again. Searching for
   a hidden Journey finds it, and selecting it keeps it on screen. (CR199)
3. Collapse all leaves only the roots, plus the path to the selected Journey. Expand all opens
   everything. (CR200)
4. Quit and reopen the app: the filter and the closed branches are as you left them. (CR199, CR200)
5. Hovering any Journey shows its folder on a second line, starting with `~`, or "No folder set".
   (CR201)

## Group B Check (passed 2026-11-06)

CR202 and CR197, in the development app bound to `ensaio-5c-2`:

1. Select a Journey with a project path. Under its name the header reads "Working in ~/…", the same
   folder the Journey editor shows. (CR202)
2. Select a Journey without one. The line reads `~/Mirror Journeys/<id>` and is **not** marked as a
   failure, because that is where it belongs. (CR202)
3. With the app open, rename that Journey's folder on disk, then select another Journey and come
   back. The line turns amber, says the folder is unavailable, and its tooltip names the missing
   folder. (CR197, CR202)
4. Set the Journey's path in Mirror from the terminal, with the app open and **without** Reload
   Journey tree. Send a turn. It runs in the new folder, and the line shows it: the app asked Mirror
   rather than trusting its cache. (CR197)
5. Ask the agent `pwd` in that Journey. The answer is the folder the line shows. (CR202)
6. Click the path. The folder opens in Finder. In a Journey that has never had a turn and has no
   project path, the click says the folder does not exist yet instead of doing nothing. (CR202)

## Group C Check, part one (CR099, passed 2026-11-06)

In the development app bound to `ensaio-5c-2`, with a long turn running in one Journey:

1. While it streams, create, rename, move and repaint **another** Journey. All of it works.
2. Rename and move the **running** Journey itself. Both work, and the turn keeps going.
3. Drag a Journey onto another while the turn streams. The drag starts.
4. Use Reload Journey tree while the turn streams. The tree reloads and the turn keeps going.
5. Right-click the running Journey. Delete is disabled and says an agent is working in it.
6. Right-click its parent. Delete is disabled and names the Journey that is working.
7. Right-click an idle sibling with no children. Delete is available.
8. Change the running Journey's project path. It saves, says the new folder applies to the next
   turn, and the running turn stays where it started. CR202's line still shows the old folder until
   the next turn.

## Group C Check, part two (CR203, passed 2026-11-06)

In the development app bound to `ensaio-5c-2`, in Tree view:

0. Press a Journey row and move the pointer a few pixels. The dashed zone appears above the tree
   and the row dims. That is the gesture starting; it is driven by pointer capture, not by the
   browser's drag, after two HTML5 attempts never started in WKWebView.
1. Drag a Journey onto the middle of another. The row highlights, the line reads "Move X into Y,
   after its N Journeys", and the drop makes it the last child.
2. Drag onto the top quarter of a row. A line appears at the top of that row, the sentence says
   "above", and the drop puts it there.
3. Drag onto the bottom quarter. Same, saying "below".
4. Drag a nested Journey onto the dashed zone above the tree. It becomes the first root Journey.
5. Drag a Journey onto one of its own children. The row turns red, the line names the Journey, and
   the drop changes nothing.
6. Drag a Journey back onto the place it already occupies. The line says "It is already there." and
   no mutation is sent.
7. Reload the Journey tree, then restart the app. Every move survived both.
8. Open Move Journey on a Journey with children. Its own children are not offered as parents.
9. With a turn running in another Journey, repeat step 1. The drag still works (CR099).

## Group D Check (CR204, passed 2026-11-06)

In the development app bound to `ensaio-5c-2` (`npm run tauri:dev`). Prepare a throwaway Journey
`teste-exclusao` with one short conversation, and a folder `/private/tmp/teste-exclusao` holding a
file or two, set as its project path.

1. Right-click a Journey that has children. Delete is disabled and its tooltip names the children.
2. Right-click `teste-exclusao`, Delete Journey. While Mirror answers, "Asking Mirror what this
   Journey holds…"; then the list: what goes from Mirror (its conversation, messages, any memories),
   Nautilus's files moved aside, and the folder box, off. The button reads "Delete Journey and N
   records".
3. With a turn running in `teste-exclusao`, open the same dialog. It refuses, saying an agent is
   working, and the button stays disabled.
4. Tick the box. A warning says the files are deleted, not moved to the Trash, and the folder stays.
5. Confirm. The tree no longer shows the Journey, and nothing is written under it (after the check:
   a clean deletion is silent). `/private/tmp/teste-exclusao` exists and is empty.
6. Restart the app. The Journey does not come back.
7. Make a Journey whose project path is another Journey's folder, or a folder that holds one. Its box
   is disabled and says why.
8. Delete a Journey in which a memory of another Journey was made, if one exists: the list says that
   memory is kept, and afterwards it is still there.

## Order

A, B, C, D, accepted by the Navigator on 2026-11-05. Groups A, B and C are done (C validated 2026-11-06: CR099 and CR203 validated, CR098 absorbed). Group D (CR204) validated 2026-11-06; it ships only after Core CR200 is released and pinned.

## Finding, outside the Change Requests (2026-11-05)

The first development build after the folder move failed before any of this code ran:
`cargo` had kept 46 generated files in `src-tauri/target/debug` naming the repository's old path, so
the build script looked for Tauri's generated permissions under `.../mirror-mind-ai/mirror-desktop/`.
`cargo clean --profile dev` fixed it. The release profile is expected to carry the same stale paths
and will need the same treatment on its first build. This belongs to the Nautilus reorganization
(CV-013.DS-007), not to Journey Management, and is recorded here because this is where it surfaced.
