import { describe, expect, it } from "vitest";
import {
  collapseAllJourneyIds,
  filterCollapsedJourneyTree,
  filterInactiveJourneyTree,
  flattenJourneyRegistry,
  isInactiveJourney,
  journeyItemTitle,
  type JourneyRegistry,
} from "../domain/journeyRegistry";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
  sanitizeJourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";

// RS028 group A: CR199 (inactive Journeys out of the tree), CR200 (collapse or expand all) and
// CR201 (the folder in the tooltip). One fixture carries every shape the three need: an inactive
// parent above an active child, an inactive leaf, a whole inactive branch, a hand-written status,
// and a Journey without a folder.
const registry: JourneyRegistry = {
  schemaVersion: "0.2.0",
  source: "fixture",
  syncedAt: "2026-11-05T00:00:00Z",
  roots: [
    {
      id: "family", name: "Family", status: "completed", projectPath: "/Users/nav/family",
      children: [
        { id: "app", name: "App", status: "active", projectPath: "/Users/nav/family/app" },
        { id: "old-ext", name: "Old Extension", status: "completed" },
      ],
    },
    {
      id: "archive", name: "Archive", status: "paused",
      children: [{ id: "deep-old", name: "Deep Old", status: "planned", children: [{ id: "deeper", name: "Deeper", status: "completed" }] }],
    },
    { id: "handwritten", name: "Handwritten", status: "on hold by hand" },
    { id: "no-status", name: "No Status" },
    { id: "live", name: "Live", status: " Active ", children: [{ id: "live-child", name: "Live Child", status: "active" }] },
  ],
};
const flat = flattenJourneyRegistry(registry);
const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

describe("CR199: which statuses count as inactive", () => {
  it("treats completed, paused and planned as inactive, case and space insensitive", () => {
    expect(["completed", "paused", "planned", " Completed "].map((status) => isInactiveJourney({ status }))).toEqual([true, true, true, true]);
  });

  it("treats active, a missing status and a status Mirror does not know as active, so nothing disappears by accident", () => {
    expect([{ status: "active" }, {}, { status: "on hold by hand" }, { status: "" }].map(isInactiveJourney)).toEqual([false, false, false, false]);
  });
});

describe("CR199: keeping inactive Journeys out of the tree", () => {
  it("hides inactive Journeys whose whole branch is inactive", () => {
    const visible = filterInactiveJourneyTree(flat, new Set());
    expect(ids(visible)).toEqual(["family", "app", "handwritten", "no-status", "live", "live-child"]);
  });

  it("keeps an inactive ancestor of a visible Journey, dimmed, so the child is not orphaned on screen", () => {
    const visible = filterInactiveJourneyTree(flat, new Set());
    expect(visible.find((journey) => journey.id === "family")?.dimmed).toBe(true);
    expect(visible.find((journey) => journey.id === "app")?.dimmed).toBe(false);
  });

  it("keeps the selected Journey visible even when it is inactive, with its ancestors", () => {
    const visible = filterInactiveJourneyTree(flat, new Set(["deeper"]));
    expect(ids(visible)).toEqual(["family", "app", "archive", "deep-old", "deeper", "handwritten", "no-status", "live", "live-child"]);
    expect(visible.filter((journey) => journey.dimmed).map((journey) => journey.id)).toEqual(["family", "archive", "deep-old", "deeper"]);
  });

  it("says whether a shown Journey still has a shown child, so its disclosure toggle can follow the filter", () => {
    const visible = filterInactiveJourneyTree(flat, new Set());
    const byId = new Map(visible.map((journey) => [journey.id, journey]));
    expect(byId.get("family")?.hasVisibleChildren).toBe(true);
    expect(byId.get("live")?.hasVisibleChildren).toBe(true);
    expect(byId.get("app")?.hasVisibleChildren).toBe(false);
  });

  it("gives no disclosure to a shown Journey whose children are all hidden", () => {
    const visible = filterInactiveJourneyTree(flat, new Set(["archive"]));
    expect(visible.find((journey) => journey.id === "archive")?.hasVisibleChildren).toBe(false);
  });

  it("counts what it hid, so the control can say how many are out of view", () => {
    expect(filterInactiveJourneyTree(flat, new Set()).hiddenCount).toBe(4);
    expect(filterInactiveJourneyTree(flat, new Set(["deeper"])).hiddenCount).toBe(1);
  });

  it("leaves the registry's own children untouched, because a drop appends after the real last child", () => {
    const visible = filterInactiveJourneyTree(flat, new Set());
    expect(visible.find((journey) => journey.id === "family")?.children?.map((child) => child.id)).toEqual(["app", "old-ext"]);
  });

  it("composes with collapsing: a collapsed visible branch still hides its visible children", () => {
    const visible = filterCollapsedJourneyTree(filterInactiveJourneyTree(flat, new Set()), new Set(["family"]));
    expect(ids(visible)).toEqual(["family", "handwritten", "no-status", "live", "live-child"]);
  });
});

describe("CR200: collapsing or expanding the whole tree at once", () => {
  it("collapses every Journey that has children", () => {
    expect([...collapseAllJourneyIds(flat)].sort()).toEqual(["archive", "deep-old", "family", "live"]);
  });

  it("keeps the path to the selected Journey open, so the selection stays on screen", () => {
    const collapsed = collapseAllJourneyIds(flat, "deeper");
    expect([...collapsed].sort()).toEqual(["family", "live"]);
    expect(ids(filterCollapsedJourneyTree(flat, collapsed))).toEqual(["family", "archive", "deep-old", "deeper", "handwritten", "no-status", "live"]);
  });

  it("collapses the selected Journey's own children, because only its ancestors must stay open", () => {
    expect([...collapseAllJourneyIds(flat, "family")].sort()).toEqual(["archive", "deep-old", "family", "live"]);
  });
});

describe("CR200 and CR199: the tree's choices survive a restart", () => {
  it("round-trips the collapsed branches and the inactive filter", () => {
    const saved = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, collapsedJourneyIds: ["family"], hideInactiveJourneys: false });
    const parsed = parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(saved)));
    expect(parsed?.preferences.collapsedJourneyIds).toEqual(["family"]);
    expect(parsed?.preferences.hideInactiveJourneys).toBe(false);
  });

  it("hides inactive Journeys by default, including for a file written before the filter existed", () => {
    expect(defaultJourneyPreferenceState.hideInactiveJourneys).toBe(true);
    // A copy: the persisted envelope holds the same object, and deleting from it would erase the default.
    const older = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState }) as unknown as { preferences: Record<string, unknown> };
    delete older.preferences.hideInactiveJourneys;
    delete older.preferences.collapsedJourneyIds;
    const parsed = parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(older)));
    expect(parsed?.preferences.hideInactiveJourneys).toBe(true);
    expect(parsed?.preferences.collapsedJourneyIds).toEqual([]);
  });

  it("degrades a bad value to the default without costing the pins", () => {
    const saved = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, pinnedJourneyIds: ["app"] }) as unknown as { preferences: Record<string, unknown> };
    saved.preferences.collapsedJourneyIds = "family";
    saved.preferences.hideInactiveJourneys = "yes";
    const parsed = parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(saved)));
    expect(parsed?.preferences.pinnedJourneyIds).toEqual(["app"]);
    expect(parsed?.preferences.collapsedJourneyIds).toEqual([]);
    expect(parsed?.preferences.hideInactiveJourneys).toBe(true);
  });

  it("forgets a collapsed branch that no longer exists", () => {
    const sanitized = sanitizeJourneyPreferenceState({ ...defaultJourneyPreferenceState, collapsedJourneyIds: ["family", "removed", "family"] }, registry);
    expect(sanitized.collapsedJourneyIds).toEqual(["family"]);
  });
});

describe("CR201: the Journey's folder in its tooltip", () => {
  const home = "/Users/nav";

  it("always shows the folder, abbreviated to the home", () => {
    expect(journeyItemTitle({ name: "App", projectPath: "/Users/nav/family/app" }, "", home)).toBe("App\n~/family/app");
  });

  it("keeps the agent state on the first line", () => {
    expect(journeyItemTitle({ name: "App", projectPath: "/Users/nav/family/app" }, "Agent working, Pinned", home)).toBe("App — Agent working, Pinned\n~/family/app");
  });

  it("says so when no folder is set, instead of showing nothing", () => {
    expect(journeyItemTitle({ name: "Old", projectPath: undefined }, "", home)).toBe("Old\nNo folder set");
    expect(journeyItemTitle({ name: "Old", projectPath: "  " }, "", home)).toBe("Old\nNo folder set");
  });

  it("abbreviates only a real prefix of the home, never a sibling that shares its letters", () => {
    expect(journeyItemTitle({ name: "X", projectPath: "/Users/navigator/x" }, "", home)).toBe("X\n/Users/navigator/x");
    expect(journeyItemTitle({ name: "X", projectPath: "/Users/nav" }, "", home)).toBe("X\n~");
  });

  it("shows the full path while the home is not known yet", () => {
    expect(journeyItemTitle({ name: "App", projectPath: "/Users/nav/family/app" }, "", undefined)).toBe("App\n/Users/nav/family/app");
  });
});
