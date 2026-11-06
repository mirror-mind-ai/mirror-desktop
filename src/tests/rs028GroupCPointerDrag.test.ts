// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clickEndsADrag,
  dragGhostSentence,
  dropTargetUnderPointer,
  exceedsDragThreshold,
  isDragCancelKey,
  JOURNEY_DRAG_THRESHOLD_PX,
  shouldBeginJourneyDrag,
  type JourneyRowGeometry,
} from "../domain/journeyPointerDrag";
import appSource from "../app/App.tsx?raw";

const styleSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

/** Three rows of 40px, stacked from y=100, with the root zone just above them. */
const rows: JourneyRowGeometry[] = [
  { journeyId: "first", top: 100, height: 40 },
  { journeyId: "second", top: 140, height: 40 },
  { journeyId: "third", top: 180, height: 40 },
];
const rootZone = { top: 60, bottom: 96 };

describe("CR203: a drag the application drives itself", () => {
  /**
   * Two attempts at the HTML5 gesture failed in the development app: nothing started, and the
   * pointer painted a text selection. The gesture is now built from pointer events, which this
   * codebase already uses for the sidebar resize handle, so its decisions can be tested here
   * instead of being guessed at through WKWebView.
   */
  it("waits for the pointer to move before deciding a press is a drag", () => {
    const origin = { x: 200, y: 300 };
    expect(exceedsDragThreshold(origin, { x: 200, y: 300 })).toBe(false);
    expect(exceedsDragThreshold(origin, { x: 202, y: 301 })).toBe(false);
    expect(exceedsDragThreshold(origin, { x: 200 + JOURNEY_DRAG_THRESHOLD_PX, y: 300 })).toBe(true);
    expect(exceedsDragThreshold(origin, { x: 200, y: 300 - JOURNEY_DRAG_THRESHOLD_PX })).toBe(true);
    // A threshold at all is the point: a press that never moves must stay a click that selects
    // the Journey, not a drag that moves it.
    expect(JOURNEY_DRAG_THRESHOLD_PX).toBeGreaterThan(0);
  });
});

describe("CR203: which row the pointer is over", () => {
  it("reads the zone from where inside the row the pointer is", () => {
    expect(dropTargetUnderPointer({ point: { x: 50, y: 105 }, rows })).toEqual({ journeyId: "first", zone: "before" });
    expect(dropTargetUnderPointer({ point: { x: 50, y: 120 }, rows })).toEqual({ journeyId: "first", zone: "into" });
    expect(dropTargetUnderPointer({ point: { x: 50, y: 135 }, rows })).toEqual({ journeyId: "first", zone: "after" });
    expect(dropTargetUnderPointer({ point: { x: 50, y: 160 }, rows })).toEqual({ journeyId: "second", zone: "into" });
    expect(dropTargetUnderPointer({ point: { x: 50, y: 219 }, rows })).toEqual({ journeyId: "third", zone: "after" });
  });

  it("takes the row whose band contains the pointer, including its top edge", () => {
    expect(dropTargetUnderPointer({ point: { x: 50, y: 140 }, rows })).toEqual({ journeyId: "second", zone: "before" });
    expect(dropTargetUnderPointer({ point: { x: 50, y: 180 }, rows })).toEqual({ journeyId: "third", zone: "before" });
  });

  it("answers the root zone when the pointer is in it", () => {
    expect(dropTargetUnderPointer({ point: { x: 50, y: 70 }, rows, rootZone })).toEqual({ journeyId: null, zone: "root" });
  });

  it("answers nothing when the pointer is over neither, so a drop outside the tree does nothing", () => {
    expect(dropTargetUnderPointer({ point: { x: 50, y: 10 }, rows, rootZone })).toBeUndefined();
    expect(dropTargetUnderPointer({ point: { x: 50, y: 400 }, rows, rootZone })).toBeUndefined();
    expect(dropTargetUnderPointer({ point: { x: 50, y: 70 }, rows })).toBeUndefined();
  });

  it("prefers a row over the root zone when the two overlap, because the row is the finer target", () => {
    expect(
      dropTargetUnderPointer({ point: { x: 50, y: 105 }, rows, rootZone: { top: 60, bottom: 400 } }),
    ).toEqual({ journeyId: "first", zone: "before" });
  });

  it("cannot land on a row of no height, whose band is empty", () => {
    expect(dropTargetUnderPointer({ point: { x: 50, y: 100 }, rows: [{ journeyId: "flat", top: 100, height: 0 }] }))
      .toBeUndefined();
  });
});

describe("CR203: which presses begin a drag", () => {
  const press = { button: 0, treeView: true, dragAllowed: true, onControl: false };

  it("begins on a primary press on a row in Tree view", () => {
    expect(shouldBeginJourneyDrag(press)).toBe(true);
  });

  it("refuses a secondary button, which opens the Journey menu", () => {
    expect(shouldBeginJourneyDrag({ ...press, button: 2 })).toBe(false);
    expect(shouldBeginJourneyDrag({ ...press, button: 1 })).toBe(false);
  });

  it("refuses outside Tree view, where there is no hierarchy to reshape", () => {
    expect(shouldBeginJourneyDrag({ ...press, treeView: false })).toBe(false);
  });

  it("refuses when the tree says this Journey cannot be dragged", () => {
    expect(shouldBeginJourneyDrag({ ...press, dragAllowed: false })).toBe(false);
  });

  it("refuses a press that landed on a control inside the row, such as the collapse arrow", () => {
    expect(shouldBeginJourneyDrag({ ...press, onControl: true })).toBe(false);
  });
});

describe("CR203: the click that ends a drag", () => {
  it("is swallowed when the press moved, so the moved Journey is not also selected", () => {
    expect(clickEndsADrag({ moved: true })).toBe(true);
  });

  it("is let through when the press never moved, so a click still selects the Journey", () => {
    expect(clickEndsADrag({ moved: false })).toBe(false);
    expect(clickEndsADrag(null)).toBe(false);
    expect(clickEndsADrag(undefined)).toBe(false);
  });
});

describe("CR203: the surface drives the gesture with pointer events", () => {
  it("captures the pointer and stops using the browser's own drag", () => {
    expect(appSource).toContain("setPointerCapture(event.pointerId)");
    expect(appSource).toContain("onPointerDown={(event) => beginJourneyDrag(event, journey.id)}");
    expect(appSource).toContain("onPointerMove={continueJourneyDrag}");
    expect(appSource).toContain("onPointerUp={finishJourneyDrag}");
    expect(appSource).toContain("onPointerCancel={cancelJourneyDrag}");
    // The four answers `shouldBeginJourneyDrag` needs are read from the event, not assumed.
    expect(appSource).toContain("button: event.button,");
    expect(appSource).toContain('treeView: journeyListOrder === "tree",');
    expect(appSource).toContain('dragAllowed: treeOperation("drag", journeyId).allowed,');
    expect(appSource).toContain('onControl: (event.target as HTMLElement).closest("button") !== null,');
    // The HTML5 gesture is gone, not left behind to compete with this one.
    expect(appSource).not.toContain("onDragStart=");
    expect(appSource).not.toContain("onDragOver=");
    expect(appSource).not.toContain("draggable={");
  });

  it("marks each row so the pointer can be matched to a Journey", () => {
    expect(appSource).toContain("data-journey-id={journey.id}");
    expect(appSource).toContain('[data-journey-id]');
  });

  it("plans the drop from one decision, rather than appending as the last child", () => {
    expect(appSource).toContain("planJourneyDrop({ draggedJourneyId: drag.journeyId, targetJourneyId: aimed.journeyId, zone: aimed.zone, registry: journeyRegistry })");
    // The gesture before this CR, gone: a drop no longer counts the target's children.
    expect(appSource).not.toContain("const position = journey.children?.length ?? 0;");
  });

  it("gives the drag its own place to report a refusal from Mirror, not the dialog's", () => {
    expect(appSource).toContain('(message) => setJourneyDropMessage({ kind: "refused", text: message })');
    expect(appSource).toContain("onFailure?: (message: string) => void");
    expect(appSource).toContain("onFailure?.(message)");
  });

  it("says where the Journey went after the drop, so leaving the visible tree does not read as deletion", () => {
    // The Navigator lost Vida Acadêmica2 this way on 2026-11-06: an unintended drop moved it into
    // a collapsed subtree, and the tree showed nothing about it.
    expect(appSource).toContain('setJourneyDropMessage({ kind: "move", text: plan.completion })');
  });

  it("opens a collapsed parent that just received a Journey", () => {
    expect(appSource).toContain("opened.delete(parentId);");
  });

  it("suppresses text selection everywhere while the drag lasts, not only on the row", () => {
    // The press travels over conversation titles and panels that are still selectable; WebKit
    // keeps extending a selection into them unless the whole window refuses it for the gesture.
    expect(appSource).toContain('document.body.classList.add("is-dragging-journey")');
    expect(appSource).toContain("window.getSelection()?.removeAllRanges()");
    expect(appSource).toContain('document.body.classList.remove("is-dragging-journey")');
    const body = styleSource.slice(styleSource.indexOf("body.is-dragging-journey,"), styleSource.indexOf(".journey-drag-ghost"));
    expect(body).toContain("user-select: none !important");
    expect(body).toContain("cursor: grabbing !important");
  });

  it("shows the dragged Journey's name travelling with the pointer", () => {
    expect(appSource).toContain("className={`journey-drag-ghost ${journeyDropTarget?.plan.outcome ?? \"none\"}`}");
    const ghost = styleSource.slice(styleSource.indexOf(".journey-drag-ghost"), styleSource.indexOf(".journey-drop-hint.completed"));
    expect(ghost).toContain("position: fixed");
    expect(ghost).toContain("pointer-events: none");
  });

  it("does not select the Journey on the click that ends a drag", () => {
    expect(appSource).toContain("if (consumeJourneyDragClick()) return;");
  });

  it("swallows only the click of this release, never a later real click", () => {
    // A release outside the row produces no click on it; the flag must not survive to eat the next.
    expect(appSource).toContain("window.setTimeout(() => { journeyDragClickRef.current = false; }, 0);");
  });

  it("stops WebKit from starting its own drag or painting a selection on the row", () => {
    const row = styleSource.slice(styleSource.indexOf(".journey-item {"), styleSource.indexOf(".journey-item::before"));
    expect(row).toContain("-webkit-user-drag: none");
    expect(row).toContain("user-select: none");
  });
});

describe("CR203: nothing in the tree moves while a Journey is being dragged", () => {
  /**
   * Fourth field report, 2026-11-06: the root zone and the plan line were inserted above the tree
   * in the same instant the drag began, after the rows had been measured. Every row then sat about
   * 70px below where the gesture believed it was, so a drop landed on the row above the one under
   * the pointer; this is the likely path by which Vida Acadêmica2 went into alissonvale.com. The
   * plan line also changed height with its sentence, so the tree jumped while the hand moved.
   */
  it("measures the rows on every move, so no shift can leave the gesture aiming at stale rows", () => {
    expect(appSource).toContain("const aimed = dropTargetUnderPointer({ point, rows: measureJourneyRows(), rootZone: journeyRootDropZone() });");
    expect(appSource).not.toContain("drag.rows = measureJourneyRows();");
  });

  it("lays the root zone over the tree tools instead of inserting it above the tree", () => {
    expect(appSource).toContain('<div className="journey-tree-tools-slot">');
    const slot = styleSource.slice(styleSource.indexOf(".journey-tree-tools-slot {"), styleSource.indexOf(".journey-tree-tools-slot .journey-root-drop-zone {") + 400);
    expect(slot).toContain("position: relative");
    expect(slot).toContain("position: absolute");
  });

  it("speaks the plan beside the pointer, not in a line that pushes the tree", () => {
    expect(appSource).toContain("dragGhostSentence(journeyDropTarget?.plan)");
    expect(appSource).not.toContain("{draggedJourneyId && journeyDropTarget ? (");
  });
});

describe("CR203: what travels with the pointer", () => {
  it("names the plan, the refusal or the absence of a change", () => {
    expect(dragGhostSentence({ outcome: "move", parentId: "a", position: 0, description: "Move X into A, as its first Journey.", completion: "" }))
      .toBe("Move X into A, as its first Journey.");
    expect(dragGhostSentence({ outcome: "refused", reason: "A Journey cannot be moved into itself." }))
      .toBe("A Journey cannot be moved into itself.");
    expect(dragGhostSentence({ outcome: "unchanged" })).toBe("It is already there.");
  });

  it("tells the hand how to give up when it is over nothing", () => {
    expect(dragGhostSentence(undefined)).toBe("Release here to cancel. Esc also cancels.");
  });
});

describe("CR203: a drag can be cancelled", () => {
  it("answers Escape, and nothing else, as the cancel key", () => {
    expect(isDragCancelKey("Escape")).toBe(true);
    expect(isDragCancelKey("Enter")).toBe(false);
    expect(isDragCancelKey(" ")).toBe(false);
  });

  it("listens for the key only while a drag lasts, and abandons without moving anything", () => {
    expect(appSource).toContain('window.addEventListener("keydown", cancelOnKey, true);');
    expect(appSource).toContain('window.removeEventListener("keydown", cancelOnKey, true);');
    expect(appSource).toContain("if (isDragCancelKey(event.key))");
    const abandon = appSource.slice(appSource.indexOf("function abandonJourneyDrag()"), appSource.indexOf("function releaseJourneyDrag()"));
    expect(abandon).toContain("drag.abandoned = true;");
    expect(abandon).not.toContain("executeJourneyMutation");
    // The release that follows an abandoned drag still arrives, and must not drop.
    expect(appSource).toContain("const dropping = drag.started && !drag.abandoned;");
    expect(appSource).toContain("if (!dropping || !aimed) return;");
  });
});

describe("CR203: the text selection never starts, rather than being undone after", () => {
  it("refuses selectstart from the moment a press may become a drag until it is released", () => {
    // user-select applied when the drag begins does not stop a selection WebKit began at the
    // press; refusing the selection's start does.
    expect(appSource).toContain('document.addEventListener("selectstart", refuseSelectionStart);');
    expect(appSource).toContain('document.removeEventListener("selectstart", refuseSelectionStart);');
  });
});
