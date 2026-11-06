[< RS028](index.md)

# CR203: Reparent a Journey by Dragging It

**Status:** done
**Driver:** @alissonvale
**Delivery:** `main` (`61a434cc`, `77b55a8a`, `710e3bab`, `ffd7dc4d`, `1e4cecb2`, `9df394ed`), RS028 group C
**Group:** C, reshaping the tree

## Friction

Dragging already exists but does not read as a feature. `App.tsx` makes a tree item `draggable`
only when `runtimeBusy` is false, so while any agent works in any Journey it does nothing (CR099).
A drop always appends as the last child of the target: there is no drop to the root, no ordering
among siblings, no visual target and no confirmation. The Move Journey dialog exists beside it.

## Outcome

The Navigator drags a Journey onto another to make it a child, between two to place it among
siblings, or to the top of the tree to make it a root. The target is visible while dragging, an
invalid drop (onto itself or a descendant) is refused on screen, and the result is the same
`move_journey` the dialog uses.

## First Investigation

Confirm that WKWebView delivers HTML5 drag events with the Tauri file-drop handler on; measure the
current gesture first. Enumerate the refusals the Core's `moveJourney` returns (`invalid_parent`)
and map each to a sentence. Decide with the Navigator whether a drop asks for confirmation.

## Acceptance

- Child, sibling and root drops each produce the expected tree after reload and restart.
- A drop onto the Journey itself or a descendant does not mutate and says why.
- A moved Journey keeps its id, conversations, folder and descendants.
- With CR099 delivered, dragging works while another Journey's agent is working.

## Boundaries

Absorbs CR098's outcome: the edit form need not change the parent once the dialog and the drag both
do. No bulk move.

## Delivered (2026-11-06)

On `main` in `61a434cc`; the Group C Check, part two, is owed.

- `src/domain/journeyDropTarget.ts` answers the gesture as data. `dropZoneFromOffset` gives a
  quarter of the row to each edge and the half in the middle to "into", because a border is harder
  to aim at than a band. `planJourneyDrop` returns `move`, `unchanged` or `refused`, and the move
  carries the sentence the Navigator reads while dragging.
- **Positions follow the Core, read rather than assumed.** `placeInGroup` in
  `ts/src/journey/journeyCalls.ts` filters the moving Journey out of its sibling list and *then*
  splices it at `position`, so an index is counted on the list without it. A downward move inside
  one parent therefore needs no +1 correction, and a test pins both directions.
- The row under the pointer paints `drop-into`, `drop-before`, `drop-after` or `drop-refused`, a
  dashed zone above the tree accepts a drop to the root, and a line below the tools says what the
  drop would do. All three read the same plan the drop acts on.
- Refused before Mirror is asked: into itself, into a descendant, or beside a Journey whose parent
  is inside the dragged subtree. The Journey is named in the sentence.
- A drag that Mirror still refuses now has a reader: `executeJourneyMutation` takes an `onFailure`
  sink, because its `journeyAdminMessage` is only rendered inside a dialog and a drag has none.
- Six mutations caught: "after" behaving as "before", the dragged Journey not removed from the list
  first, only direct children refusing, the middle zone shrinking, nothing ever being unchanged, and
  a zero-height row dividing by zero.

## Decisions (reversible, taken by the Driver)

- **No confirmation on a drop.** The CR left this open for the Navigator. A drag is undone by
  dragging back, the plan is shown in words before the drop, and CR204's reading was that organizing
  the tree is the person's own autonomy. A dialog on every drop would make the gesture slower than
  the Move form it replaces.
- **The root zone inserts as the first root**, because the zone sits at the top of the tree and a
  drop should land where it was aimed.
- **Dropping into the parent a Journey already has** sends it to the end of that parent. It is a
  reordering, not a no-op, and the sentence says so.

## The gesture had to be rebuilt (2026-11-06)

The CR's own investigation asked to "confirm that WKWebView delivers HTML5 drag events". It does
not, for this row, and the question was answered by the Navigator's hands rather than by my reading.

1. First report: "não está arrastando, ao invés de arrastar o cursor seleciona o texto". Diagnosis:
   WebKit gives a press on selectable text to the text selection unless the element is named as a
   drag source. Fix attempted in `77b55a8a`: `-webkit-user-drag: element` plus `user-select: none`.
2. Second report: "ainda não deu certo".

At that point the honest move was to stop guessing at the engine. `710e3bab` rebuilds the gesture on
pointer capture, which this application already uses for `FocusedSidebarResizeHandle`, so it is a
mechanism with evidence in this codebase rather than a hope about WKWebView.

**What the rebuild bought beyond a working drag.** Every decision now lives in
`src/domain/journeyPointerDrag.ts`, where a test can reach it: `shouldBeginJourneyDrag` (primary
button, Tree view, CR099's per-Journey permission, and not a press on a control inside the row),
`exceedsDragThreshold` (a press that never travels stays a click that selects the Journey),
`dropTargetUnderPointer` (which row and which band) and `clickEndsADrag` (the click that ends a drag
must not also select the Journey it moved). Under HTML5 these were handler lines that no test in
this repository could exercise. Eight mutations are caught, including three that survived the first
round and drove this extraction: swallowing every click, dragging from a control, and dragging with
the secondary button.

**Still owed to the Navigator's hands:** that the pointer gesture starts at all. The rows are
measured once at the start, because a captured pointer cannot scroll the list; auto-scrolling a long
tree during a drag is not delivered and is the next thing to feel missing.

## Third field report: the gesture starts but has no hand (2026-11-06)

The pointer rebuild made the gesture start: the Navigator saw the dashed zone and the plan
sentence. Three defects remained, and one of them cost a Journey its visibility.

1. **The window kept selecting text.** `user-select: none` on the row was not enough: the press
   travels over conversation titles and panels that are still selectable, and WebKit keeps
   extending a selection into them. Now, when a press becomes a drag, the selection it may have
   begun is cleared and `body.is-dragging-journey` refuses selection everywhere and shows a
   grabbing cursor, the same device `is-resizing-sidebar` already uses.
2. **Nothing travelled with the hand.** A ghost with the Journey's name now follows the pointer,
   positioned through a ref so the tree does not re-render on every move.
3. **An unintended drop read as a deletion.** Vida Acadêmica2 was dropped into `alissonvale-com`
   and vanished into that collapsed subtree. The database was right and silent: the move was real,
   registered at `2026-11-06T05:20:02Z` in the `ensaio-5c-2` home, and nothing was lost. Now a drop
   that lands says where the Journey went, the sentence stays until the next gesture, and a
   collapsed parent that just received a Journey is opened.

**Strategy judgment, asked by the Navigator:** the pointer-capture base is right; the evidence is
that the gesture now starts where HTML5 never did. What was wrong was treating the gesture as done
when only its decisions were delivered: a drag is also a feel (cursor, ghost, refusal of
selection) and an ending that speaks. Falsifier for this round: pressing and moving must never
paint a selection anywhere in the window, and every landed drop must leave a green sentence naming
the destination.

## Fourth field report: the tree moved under the hand (2026-11-06)

A screenshot from the Navigator showed a selection painted over the rows above the dragged one,
the plan line shifting the tree as its sentence changed length, and no way to give a drag up
(no place to release it, and Escape did nothing).

The screenshot also showed a cause the Navigator had not named. **The root zone and the plan line
were inserted above the tree in the instant the drag began, after the rows had been measured.**
Every row then sat about 70px below where the gesture believed it was, so a drop landed on the
row above the one under the pointer. This is the likely path by which Vida Acadêmica2 went into
`alissonvale-com` in the third report: not a misplaced hand, a gesture aiming at stale rows.

Answers in `1e4cecb2`:

- **Nothing in the tree moves during a drag.** The root zone is laid over the tree tools; the plan
  is spoken in the ghost beside the pointer; and the rows are measured on every move, so no later
  shift (a message, a parent opening) can make the gesture aim at stale rows again.
- **The selection is refused from the press**, through `selectstart`. `user-select` applied when
  the drag is recognised was too late, because WebKit begins the selection at the press.
- **A drag can be cancelled.** Escape abandons it while the button is held; the pointer stays
  captured, so the release that follows is consumed without moving anything. Releasing over
  nothing also cancels, and the ghost says so ("Release here to cancel. Esc also cancels."). A lost
  capture ends the gesture.
- **The click-swallowing flag lives only until its release's click**, so a release outside the row
  can no longer eat the next real click.

Seven mutations caught. Falsifiers for the Navigator: no selection anywhere during a drag; nothing
in the tree moves while the pointer moves; the row highlighted is exactly the row under the
pointer; Escape mid-drag leaves the tree untouched.

## Fifth field report: the wait after the drop (2026-11-06)

The Navigator confirmed the gesture works. What remained: two or three seconds between the release
and the reloaded tree (the move, then a full reread of Mirror's tree), a silence that read as a
failure. Delivered in `9df394ed`, as the Navigator proposed: "Moving X into Y…" under a wait cursor for
as long as Mirror writes, then "Moved X into Y." or the refusal. A refusal without words still ends
the wait with its own sentence, and no new drag can start while a move is in flight.

Found on the way: `executeJourneyMutation` restores the collapsed set captured at the drop, so a
parent opened at the drop was shut again by the answer. It is now opened after the answer.

The seconds themselves are not reduced here. Whether the move needs the full tree reread is a
question for the measurement, not for this CR.

## Validation (2026-11-06)

Validated by the Navigator after the fifth field report: "Boa, agora tá perfeito. Validado." The
gesture, the stillness of the tree under the hand, cancellation and the Moving/Moved wait all
passed in the development app bound to `ensaio-5c-2`.
