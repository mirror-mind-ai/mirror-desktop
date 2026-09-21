import { describe, expect, it } from "vitest";
import { deriveDelayedVisibilityTransition } from "../app/useDelayedVisibility";

const timing = { showDelayMs: 300, minimumVisibleMs: 700 };

describe("delayed transient visibility", () => {
  it("keeps a short check hidden until the grace period expires", () => {
    expect(deriveDelayedVisibilityTransition({
      requested: true, visible: false, now: 1_000, ...timing,
    })).toEqual({ action: "show", delayMs: 300 });
    expect(deriveDelayedVisibilityTransition({
      requested: false, visible: false, now: 1_200, ...timing,
    })).toEqual({ action: "none", delayMs: 0 });
  });

  it("keeps an already visible notice stable for its minimum duration", () => {
    expect(deriveDelayedVisibilityTransition({
      requested: false, visible: true, visibleSince: 1_000, now: 1_250, ...timing,
    })).toEqual({ action: "hide", delayMs: 450 });
    expect(deriveDelayedVisibilityTransition({
      requested: false, visible: true, visibleSince: 1_000, now: 1_800, ...timing,
    })).toEqual({ action: "hide", delayMs: 0 });
  });

  it("does not reschedule a notice that is already visible and still requested", () => {
    expect(deriveDelayedVisibilityTransition({
      requested: true, visible: true, visibleSince: 1_000, now: 1_400, ...timing,
    })).toEqual({ action: "none", delayMs: 0 });
  });
});
