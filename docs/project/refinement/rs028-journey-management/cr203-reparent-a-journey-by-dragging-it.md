[< RS028](index.md)

# CR203: Reparent a Journey by Dragging It

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `main` (`61a434cc`, `77b55a8a`, `710e3bab`), RS028 group C
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
