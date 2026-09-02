import { describe, expect, it } from "vitest";
import {
  deriveOrderedSidebarJourneys,
  deriveSidebarJourneys,
  filterCollapsedJourneyTree,
  filterPinnedJourneys,
  findJourneyById,
  flattenJourneyRegistry,
  journeyBreadcrumb,
  markJourneyRecent,
  orderSearchResults,
  reconcileReloadedJourneyState,
  searchJourneyRegistry,
  validateJourneyRegistry,
  type JourneyRegistry,
} from "../domain/journeyRegistry";
import { fixtureJourneyRegistry } from "../fixtures/journeyRegistry";

describe("hierarchical Journey registry", () => {
  it("flattens hierarchical Journeys while preserving breadcrumbs and depth", () => {
    const flattened = flattenJourneyRegistry(fixtureJourneyRegistry);

    expect(flattened.map((journey) => journey.id)).toContain("nautilus-harness");
    expect(journeyBreadcrumb(fixtureJourneyRegistry, "nautilus-harness")).toEqual([
      "Vida Criativa",
      "Nautilus",
      "Nautilus Harness",
    ]);
    expect(findJourneyById(fixtureJourneyRegistry, "livro-lideranca-soberana")?.depth).toBe(1);
  });

  it("searches across names, ids, descriptions and breadcrumbs", () => {
    expect(searchJourneyRegistry(fixtureJourneyRegistry, "livro").map((journey) => journey.id)).toEqual([
      "livro-lideranca-soberana",
    ]);
    expect(searchJourneyRegistry(fixtureJourneyRegistry, "vida criativa").map((journey) => journey.id)).toEqual([
      "vida-criativa",
      "nautilus",
      "nautilus-harness",
      "amplia",
    ]);
    expect(searchJourneyRegistry(fixtureJourneyRegistry, "runtime").map((journey) => journey.id)).toEqual([
      "mirror-dev",
    ]);
    expect(searchJourneyRegistry(fixtureJourneyRegistry, "   ")).toEqual([]);
  });

  it("preserves valid sidebar state when a refreshed registry keeps the active Journey", () => {
    const result = reconcileReloadedJourneyState(fixtureJourneyRegistry, {
      selectedJourneyId: "nautilus-harness",
      pinnedJourneyIds: ["nautilus-harness", "removed"],
      recentJourneyIds: ["removed", "amplia"],
      collapsedJourneyIds: new Set(["nautilus", "removed"]),
    });

    expect(result).toEqual({
      selectedJourneyId: "nautilus-harness",
      pinnedJourneyIds: ["nautilus-harness"],
      recentJourneyIds: ["amplia"],
      collapsedJourneyIds: new Set(["nautilus"]),
    });
    expect(reconcileReloadedJourneyState(fixtureJourneyRegistry, {
      selectedJourneyId: "removed",
      pinnedJourneyIds: ["removed", "amplia"],
      recentJourneyIds: ["removed", "nautilus-harness"],
      collapsedJourneyIds: new Set(["removed", "nautilus"]),
    })).toEqual({
      selectedJourneyId: "vida-criativa",
      pinnedJourneyIds: ["amplia"],
      recentJourneyIds: ["nautilus-harness"],
      collapsedJourneyIds: new Set(["nautilus"]),
    });
    expect(reconcileReloadedJourneyState({
      schemaVersion: "0.2.0",
      sourceVersion: "a".repeat(64),
      source: "mirror",
      syncedAt: "2026-08-28T00:00:00Z",
      roots: [],
    }, {
      selectedJourneyId: "removed",
      pinnedJourneyIds: [],
      recentJourneyIds: [],
      collapsedJourneyIds: new Set(),
    })).toBeUndefined();
  });

  it("validates duplicate Journey ids", () => {
    const registry: JourneyRegistry = {
      schemaVersion: "0.1.0",
      source: "fixture",
      syncedAt: "2026-08-22T00:00:00.000Z",
      roots: [
        { id: "same", name: "Root" },
        { id: "same", name: "Other" },
      ],
    };

    expect(validateJourneyRegistry(registry)).toContain("Duplicate Journey id: same");
  });

  it("keeps pinned Journeys and the active Journey visible in the sidebar", () => {
    const sidebar = deriveSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: ["livro-lideranca-soberana"],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: [],
    });

    expect(sidebar.map((journey) => [journey.id, journey.reasonVisible])).toEqual([
      ["nautilus-harness", "active"],
      ["livro-lideranca-soberana", "pinned"],
    ]);
  });

  it("filters any ordered Journey projection to pinned IDs without reordering it", () => {
    const tree = deriveOrderedSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: ["amplia", "nautilus"],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: [],
    }, "tree");

    expect(filterPinnedJourneys(tree).map((journey) => journey.id)).toEqual(["nautilus", "amplia"]);
    expect(filterPinnedJourneys(tree.map((journey) => ({ ...journey, pinned: false })))).toEqual([]);
  });

  it("shows active and recent Journeys in recency order when nothing is pinned", () => {
    const sidebar = deriveSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: [],
      activeJourneyId: "livro-lideranca-soberana",
      recentJourneyIds: ["nautilus-harness", "mirror-dev"],
    });

    expect(sidebar.map((journey) => [journey.id, journey.reasonVisible])).toEqual([
      ["nautilus-harness", "recent"],
      ["mirror-dev", "recent"],
      ["livro-lideranca-soberana", "active"],
    ]);
  });

  it("orders pinned Journeys by recency instead of forcing pin order in Recent mode", () => {
    const sidebar = deriveSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: ["livro-lideranca-soberana", "nautilus-harness"],
      activeJourneyId: "amplia",
      recentJourneyIds: ["nautilus-harness", "amplia"],
    });

    expect(sidebar.map((journey) => journey.id)).toEqual([
      "nautilus-harness",
      "amplia",
      "livro-lideranca-soberana",
    ]);
  });

  it("moves a Journey to the front of bounded recent preferences", () => {
    expect(markJourneyRecent({
      pinnedJourneyIds: [],
      activeJourneyId: "amplia",
      recentJourneyIds: ["mirror-dev", "amplia", "nautilus-harness"],
    }, "amplia", 3).recentJourneyIds).toEqual([
      "amplia",
      "mirror-dev",
      "nautilus-harness",
    ]);
  });

  it("falls back to root Journeys if no pinned, active or recent Journey can be resolved", () => {
    const sidebar = deriveSidebarJourneys(
      fixtureJourneyRegistry,
      {
        pinnedJourneyIds: [],
        activeJourneyId: "missing",
        recentJourneyIds: [],
      },
      2,
    );

    expect(sidebar.map((journey) => [journey.id, journey.reasonVisible])).toEqual([
      ["vida-criativa", "fallback"],
      ["lideranca-soberana", "fallback"],
    ]);
  });

  it("keeps the Recent order scoped to active and recent Journeys", () => {
    const sidebar = deriveOrderedSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: [],
      activeJourneyId: "livro-lideranca-soberana",
      recentJourneyIds: ["nautilus-harness", "mirror-dev"],
    }, "recent");

    expect(sidebar.map((journey) => [journey.id, journey.reasonVisible])).toEqual([
      ["nautilus-harness", "recent"],
      ["mirror-dev", "recent"],
      ["livro-lideranca-soberana", "active"],
    ]);
  });

  it("hides descendants of collapsed Journey nodes without disturbing later roots", () => {
    const tree = deriveOrderedSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: [],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: [],
    }, "tree");

    expect(filterCollapsedJourneyTree(tree, new Set(["nautilus"])).map((journey) => journey.id)).toEqual([
      "vida-criativa",
      "nautilus",
      "amplia",
      "lideranca-soberana",
      "livro-lideranca-soberana",
      "mirror-dev",
      "softwarezen",
      "ariad",
    ]);
  });

  it("orders all Journeys by hierarchy for Tree mode", () => {
    const sidebar = deriveOrderedSidebarJourneys(fixtureJourneyRegistry, {
      pinnedJourneyIds: [],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: [],
    }, "tree");

    expect(sidebar.map((journey) => [journey.id, journey.depth])).toEqual([
      ["vida-criativa", 0],
      ["nautilus", 1],
      ["nautilus-harness", 2],
      ["amplia", 1],
      ["lideranca-soberana", 0],
      ["livro-lideranca-soberana", 1],
      ["mirror-dev", 0],
      ["softwarezen", 0],
      ["ariad", 0],
    ]);
  });

  it("preserves Recent search result positions when selection changes the active Journey", () => {
    const results = searchJourneyRegistry(fixtureJourneyRegistry, "vida");
    const recentJourneyIds = ["nautilus-harness", "amplia"];
    const beforeSelection = orderSearchResults(results, {
      pinnedJourneyIds: [],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds,
    }, "recent");
    const afterSelection = orderSearchResults(results, {
      pinnedJourneyIds: [],
      activeJourneyId: "amplia",
      recentJourneyIds,
    }, "recent");

    expect(afterSelection.map((journey) => journey.id)).toEqual(beforeSelection.map((journey) => journey.id));
    expect(afterSelection.map((journey) => journey.id).slice(0, 2)).toEqual(recentJourneyIds);
  });

  it("keeps Tree search results in hierarchy order", () => {
    const results = searchJourneyRegistry(fixtureJourneyRegistry, "vida");

    expect(orderSearchResults(results, { pinnedJourneyIds: [], recentJourneyIds: [] }, "tree").map((journey) => journey.name)).toEqual([
      "Vida Criativa",
      "Nautilus",
      "Nautilus Harness",
      "Amplia",
    ]);
  });
});
