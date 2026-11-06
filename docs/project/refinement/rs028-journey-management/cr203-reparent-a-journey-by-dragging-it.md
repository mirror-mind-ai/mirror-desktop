[< RS028](index.md)

# CR203: Reparent a Journey by Dragging It

**Status:** captured
**Driver:** —
**Delivery:** —
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
