import { describe, expect, it, vi } from "vitest";
import {
  followRecentJourneyAdmission,
  shouldFollowRecentJourneyAdmission,
} from "../app/recentJourneyAdmissionFollower";
import { markJourneyRecent } from "../domain/journeyRegistry";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";
import appSource from "../app/App.tsx?raw";


describe("Recent Journey admission follower", () => {
  it("moves only the admitted Journey to the bounded top and keeps sibling order stable", () => {
    const current = {
      pinnedJourneyIds: ["pinned"],
      activeJourneyId: "beta",
      recentJourneyIds: ["alpha", "beta", "gamma", "delta"],
    };
    expect(markJourneyRecent(current, "gamma", 4)).toEqual({
      ...current,
      recentJourneyIds: ["gamma", "alpha", "beta", "delta"],
    });
    expect(markJourneyRecent(current, "alpha", 4).recentJourneyIds).toEqual([
      "alpha", "beta", "gamma", "delta",
    ]);
    expect(markJourneyRecent(current, "epsilon", 4).recentJourneyIds).toEqual([
      "epsilon", "alpha", "beta", "gamma",
    ]);
  });

  it("round-trips admitted Recent order through the bounded preference authority", () => {
    const preferences = {
      ...defaultJourneyPreferenceState,
      ...markJourneyRecent({
        pinnedJourneyIds: [],
        activeJourneyId: "gamma",
        recentJourneyIds: ["alpha", "beta", "gamma"],
      }, "gamma"),
    };
    const persisted = createPersistedJourneyPreferences(preferences, new Date("2026-09-03T00:00:00.000Z"));
    expect(parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(persisted)))?.preferences.recentJourneyIds).toEqual([
      "gamma", "alpha", "beta",
    ]);
  });

  it("follows only the Recent viewport without taking focus authority", () => {
    const scrollTo = vi.fn();
    const viewport = { scrollTo };
    expect(shouldFollowRecentJourneyAdmission({ order: "recent", pinnedOnly: false })).toBe(true);
    expect(followRecentJourneyAdmission(viewport, { order: "recent", pinnedOnly: false }, false)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    scrollTo.mockClear();
    expect(followRecentJourneyAdmission(viewport, { order: "recent", pinnedOnly: false }, true)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
    expect("focus" in viewport).toBe(false);
  });

  it("coordinates the viewport only after admitted work without selecting or focusing", () => {
    expect(appSource).toContain("recordAdmittedJourneyActivity(ownerJourneyId, admittedAt)");
    expect(appSource).toContain("window.requestAnimationFrame(() =>");
    expect(appSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
    expect(appSource).toContain("followRecentJourneyAdmission(");
    expect(appSource).toContain("ref={journeyListRef}");
    expect(appSource).not.toContain("journeyListRef.current?.focus");
  });

  it("does not move Pinned, Tree, or a missing viewport", () => {
    const scrollTo = vi.fn();
    expect(followRecentJourneyAdmission({ scrollTo }, { order: "recent", pinnedOnly: true }, false)).toBe(false);
    expect(followRecentJourneyAdmission({ scrollTo }, { order: "tree", pinnedOnly: false }, false)).toBe(false);
    expect(followRecentJourneyAdmission(null, { order: "recent", pinnedOnly: false }, false)).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
