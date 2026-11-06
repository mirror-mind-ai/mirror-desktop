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
| [CR199: Keep Inactive Journeys Out of the Tree Until Asked](cr199-keep-inactive-journeys-out-of-the-tree-until-asked.md) | A | captured | renderer only |
| [CR200: Collapse or Expand the Whole Tree at Once](cr200-collapse-or-expand-the-whole-tree-at-once.md) | A | captured | renderer only |
| [CR201: Show a Journey's Folder in Its Tooltip](cr201-show-a-journeys-folder-in-its-tooltip.md) | A | captured | renderer only, an option in Settings |
| [CR202: Say Which Folder the Agent Is Working In](cr202-say-which-folder-the-agent-is-working-in.md) | B | captured | needs one native read |
| [CR197: A Moved Journey Folder Sends the Turn to the Neutral Folder Without a Word](../rs026-after-the-0-3-cutover/cr197-a-moved-journey-folder-sends-the-turn-to-the-neutral-folder-without-a-word.md) | B | captured | owned by RS026, delivered here |
| [CR099: Allow Safe Editing During Another Journey's Work](cr099-allow-safe-editing-during-another-journeys-work.md) | C | captured | widened 2026-11-05 to every tree operation |
| [CR203: Reparent a Journey by Dragging It](cr203-reparent-a-journey-by-dragging-it.md) | C | captured | drag exists but is gated and crude |
| [CR098: Allow a Journey to Be Reparented](cr098-allow-a-journey-to-be-reparented.md) | C | captured | absorbed by CR203 |
| [CR204: Delete a Journey With Everything Under It](cr204-delete-a-journey-with-everything-under-it.md) | D | captured | needs a Core call and Navigator decisions |

## Groups

Each group is built, checked and validated together, in the development app bound to
`ensaio-5c-2`.

1. **A, reading the tree** (CR199, CR200, CR201). Renderer only and low risk; one check.
2. **B, where the agent works** (CR202, CR197). One native resolution, shown and enforced.
3. **C, reshaping the tree** (CR099, CR203, CR098). CR099 first, because a drag gated by any
   running turn is not a usable feature.
4. **D, removing a subtree** (CR204). Last: irreversible, needs the Core PR and the Navigator's
   decisions on what happens to conversations, memories and tasks.

## Order

A, B, C, D, proposed by the Driver on 2026-11-05 and awaiting the Navigator's word.
