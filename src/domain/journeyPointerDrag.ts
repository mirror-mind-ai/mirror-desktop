import { dropZoneFromOffset, type JourneyDropPlan, type JourneyDropZone } from "./journeyDropTarget";

/**
 * CR203: the drag gesture, driven by pointer events rather than by the browser's own.
 *
 * The HTML5 gesture was tried twice in the development app and never started: WKWebView gave the
 * press to the text selection, and naming the row as a `-webkit-user-drag` source did not change
 * it. Rather than keep guessing at the engine, the gesture is now built from pointer capture, the
 * same mechanism the sidebar resize handle already uses here. Every decision it makes lives in this
 * module, so it is answered by tests instead of by inspection of a window I cannot see.
 */
export const JOURNEY_DRAG_THRESHOLD_PX = 4;

export type PointerPoint = { x: number; y: number };

/** The rows, as the tree measures them at the moment of the pointer move being judged. */
export type JourneyRowGeometry = { journeyId: string; top: number; height: number };

export type PointerDropTarget = { journeyId: string | null; zone: JourneyDropZone };

/**
 * A press becomes a drag only after the pointer travels. Without this, every click on a Journey
 * would be a zero-distance drag and selecting a Journey would stop working.
 */
export function exceedsDragThreshold(
  origin: PointerPoint,
  point: PointerPoint,
  threshold = JOURNEY_DRAG_THRESHOLD_PX,
): boolean {
  return Math.abs(point.x - origin.x) >= threshold || Math.abs(point.y - origin.y) >= threshold;
}

export function dropTargetUnderPointer(input: {
  point: PointerPoint;
  rows: readonly JourneyRowGeometry[];
  rootZone?: { top: number; bottom: number };
}): PointerDropTarget | undefined {
  const { point, rows, rootZone } = input;
  // A row of no height has an empty band, so it can never contain the pointer.
  const row = rows.find((candidate) => point.y >= candidate.top && point.y < candidate.top + candidate.height);
  if (row) {
    return { journeyId: row.journeyId, zone: dropZoneFromOffset(point.y - row.top, row.height) };
  }
  if (rootZone && point.y >= rootZone.top && point.y <= rootZone.bottom) {
    return { journeyId: null, zone: "root" };
  }
  return undefined;
}

/**
 * Whether a press on a Journey row should begin a drag at all. Kept here rather than in the handler
 * so each refusal is a test instead of a line somebody has to read.
 */
export function shouldBeginJourneyDrag(input: {
  /** `0` is the primary button; a right-click opens the menu and must not drag. */
  button: number;
  treeView: boolean;
  dragAllowed: boolean;
  /** The press landed on a control inside the row, such as the collapse arrow. */
  onControl: boolean;
}): boolean {
  return input.button === 0 && input.treeView && input.dragAllowed && !input.onControl;
}

/**
 * Whether the click that follows a pointer sequence should be swallowed. A press that moved was a
 * drag, and the Journey it moved must not also be selected by the same gesture.
 */
export function clickEndsADrag(drag: { moved: boolean } | null | undefined): boolean {
  return drag?.moved ?? false;
}

/**
 * What travels beside the pointer. The plan is spoken there rather than in a line above the tree,
 * because a line whose height follows its sentence pushed the tree up and down under the hand.
 */
export function dragGhostSentence(plan: JourneyDropPlan | undefined): string {
  if (!plan) return "Release here to cancel. Esc also cancels.";
  if (plan.outcome === "move") return plan.description;
  if (plan.outcome === "refused") return plan.reason;
  return "It is already there.";
}

export function isDragCancelKey(key: string): boolean {
  return key === "Escape";
}
