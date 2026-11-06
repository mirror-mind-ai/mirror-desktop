// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clickEndsADrag,
  dropTargetUnderPointer,
  exceedsDragThreshold,
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
    expect(appSource).toContain("{ journeyId: drag.journeyId, parentId: plan.parentId, position: plan.position }, false, setJourneyDropMessage)");
    expect(appSource).toContain("onFailure?: (message: string) => void");
    expect(appSource).toContain("onFailure?.(message)");
  });

  it("does not select the Journey on the click that ends a drag", () => {
    expect(appSource).toContain("if (consumeJourneyDragClick()) return;");
  });

  it("stops WebKit from starting its own drag or painting a selection on the row", () => {
    const row = styleSource.slice(styleSource.indexOf(".journey-item {"), styleSource.indexOf(".journey-item::before"));
    expect(row).toContain("-webkit-user-drag: none");
    expect(row).toContain("user-select: none");
  });
});
