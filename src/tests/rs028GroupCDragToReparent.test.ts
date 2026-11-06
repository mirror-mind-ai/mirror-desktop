import { describe, expect, it } from "vitest";
import {
  dropZoneFromOffset,
  eligibleParentJourneys,
  planJourneyDrop,
  type JourneyDropZone,
} from "../domain/journeyDropTarget";
import appSource from "../app/App.tsx?raw";
import { flattenJourneyRegistry } from "../domain/journeyRegistry";
import type { JourneyRegistry } from "../domain/journeyRegistry";

/**
 * vida-tecnica
 *   nautilus        (0)
 *     app           (0)
 *       site        (0)
 *     framework     (1)
 *   finances        (1)
 * vida-criativa
 */
const registry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "fixture",
  syncedAt: "2026-11-06T10:00:00.000Z",
  roots: [
    {
      id: "vida-tecnica",
      name: "Vida Técnica",
      siblingPosition: 0,
      children: [
        {
          id: "nautilus",
          name: "Nautilus",
          siblingPosition: 0,
          children: [
            { id: "app", name: "Nautilus App", siblingPosition: 0, children: [{ id: "site", name: "Site", siblingPosition: 0 }] },
            { id: "framework", name: "Nautilus Framework", siblingPosition: 1 },
          ],
        },
        { id: "finances", name: "Finanças", siblingPosition: 1 },
      ],
    },
    { id: "vida-criativa", name: "Vida Criativa", siblingPosition: 1 },
  ],
};

const plan = (draggedJourneyId: string, targetJourneyId: string, zone: JourneyDropZone) =>
  planJourneyDrop({ draggedJourneyId, targetJourneyId, zone, registry });

describe("CR203: where a dragged Journey lands", () => {
  it("reads the zone from where the pointer is inside the row", () => {
    // A quarter at each edge, the half in the middle: a row is easier to hit than its border.
    expect(dropZoneFromOffset(0, 40)).toBe("before");
    expect(dropZoneFromOffset(9, 40)).toBe("before");
    expect(dropZoneFromOffset(10, 40)).toBe("into");
    expect(dropZoneFromOffset(20, 40)).toBe("into");
    expect(dropZoneFromOffset(29, 40)).toBe("into");
    expect(dropZoneFromOffset(30, 40)).toBe("after");
    expect(dropZoneFromOffset(40, 40)).toBe("after");
  });

  it("treats a row of no height as a drop into it, rather than dividing by zero", () => {
    expect(dropZoneFromOffset(0, 0)).toBe("into");
  });

  it("makes a Journey the last child when dropped into another", () => {
    expect(plan("finances", "nautilus", "into")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 2,
      description: "Move Finanças into Nautilus, after its 2 Journeys.",
      progress: "Moving Finanças into Nautilus, after its 2 Journeys…",
      completion: "Moved Finanças into Nautilus, after its 2 Journeys.",
    });
  });

  it("makes a Journey the first child of a Journey that has none", () => {
    expect(plan("finances", "site", "into")).toEqual({
      outcome: "move",
      parentId: "site",
      position: 0,
      description: "Move Finanças into Site, as its first Journey.",
      progress: "Moving Finanças into Site, as its first Journey…",
      completion: "Moved Finanças into Site, as its first Journey.",
    });
  });
});

describe("CR203: placing a Journey among siblings", () => {
  it("inserts above the target, taking the target's own place", () => {
    expect(plan("vida-criativa", "framework", "before")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 1,
      description: "Move Vida Criativa into Nautilus, above Nautilus Framework.",
      progress: "Moving Vida Criativa into Nautilus, above Nautilus Framework…",
      completion: "Moved Vida Criativa into Nautilus, above Nautilus Framework.",
    });
  });

  it("inserts below the target", () => {
    expect(plan("vida-criativa", "app", "after")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 1,
      description: "Move Vida Criativa into Nautilus, below Nautilus App.",
      progress: "Moving Vida Criativa into Nautilus, below Nautilus App…",
      completion: "Moved Vida Criativa into Nautilus, below Nautilus App.",
    });
  });

  it("counts positions after the dragged Journey leaves its old place, as the Core does", () => {
    // `app` sits at 0 under `nautilus`. Dropping it below `framework` (at 1) must give 1, not 2:
    // the Core removes the moving Journey from the list before it splices it back in.
    expect(plan("app", "framework", "after")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 1,
      description: "Move Nautilus App into Nautilus, below Nautilus Framework.",
      progress: "Moving Nautilus App into Nautilus, below Nautilus Framework…",
      completion: "Moved Nautilus App into Nautilus, below Nautilus Framework.",
    });
    // Upwards in the same parent needs no such correction.
    expect(plan("framework", "app", "before")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 0,
      description: "Move Nautilus Framework into Nautilus, above Nautilus App.",
      progress: "Moving Nautilus Framework into Nautilus, above Nautilus App…",
      completion: "Moved Nautilus Framework into Nautilus, above Nautilus App.",
    });
  });

  it("drops a Journey beside a root, which makes it a root", () => {
    expect(plan("finances", "vida-criativa", "after")).toEqual({
      outcome: "move",
      parentId: null,
      position: 2,
      description: "Move Finanças to the root, below Vida Criativa.",
      progress: "Moving Finanças to the root, below Vida Criativa…",
      completion: "Moved Finanças to the root, below Vida Criativa.",
    });
    expect(plan("finances", "vida-tecnica", "before")).toEqual({
      outcome: "move",
      parentId: null,
      position: 0,
      description: "Move Finanças to the root, above Vida Técnica.",
      progress: "Moving Finanças to the root, above Vida Técnica…",
      completion: "Moved Finanças to the root, above Vida Técnica.",
    });
  });
});

describe("CR203: dropping into the parent a Journey already has", () => {
  it("sends it to the end, which is a reordering and not a no-op", () => {
    // `app` is the first of two children of `nautilus`. Dropping it into `nautilus` asks for the
    // last place, so it really moves. Only a Journey already last there is unchanged.
    expect(plan("app", "nautilus", "into")).toEqual({
      outcome: "move",
      parentId: "nautilus",
      position: 1,
      description: "Move Nautilus App into Nautilus, after its 1 Journey.",
      progress: "Moving Nautilus App into Nautilus, after its 1 Journey…",
      completion: "Moved Nautilus App into Nautilus, after its 1 Journey.",
    });
  });
});

describe("CR203: the drop that does nothing", () => {
  it("reports a drop onto the Journey's own place as unchanged, rather than as a move", () => {
    expect(plan("app", "framework", "before")).toEqual({ outcome: "unchanged" });
    expect(plan("app", "app", "before")).toEqual({ outcome: "unchanged" });
    expect(plan("app", "app", "after")).toEqual({ outcome: "unchanged" });
    // Already the last child of the row it was dropped into.
    expect(plan("framework", "nautilus", "into")).toEqual({ outcome: "unchanged" });
    expect(plan("vida-criativa", "vida-tecnica", "after")).toEqual({ outcome: "unchanged" });
  });
});

describe("CR203: the drops that are refused, on screen, before Mirror is asked", () => {
  it("refuses a Journey into itself", () => {
    expect(plan("nautilus", "nautilus", "into")).toEqual({
      outcome: "refused",
      reason: "A Journey cannot be moved into itself.",
    });
  });

  it("refuses a Journey into one of its own descendants", () => {
    expect(plan("nautilus", "site", "into")).toEqual({
      outcome: "refused",
      reason: "Nautilus cannot be moved into Site, which is already inside it.",
    });
    expect(plan("nautilus", "app", "into")).toEqual({
      outcome: "refused",
      reason: "Nautilus cannot be moved into Nautilus App, which is already inside it.",
    });
  });

  it("refuses a sibling drop whose new parent would be inside the dragged Journey", () => {
    // Dropping `nautilus` beside `site` means becoming a child of `app`, inside `nautilus`.
    expect(plan("nautilus", "site", "after")).toEqual({
      outcome: "refused",
      reason: "Nautilus cannot be moved into Nautilus App, which is already inside it.",
    });
  });

  it("refuses a Journey the tree does not know, rather than guessing a parent", () => {
    expect(plan("gone", "nautilus", "into")).toEqual({
      outcome: "refused",
      reason: "That Journey is no longer in the tree. Reload the Journey tree and try again.",
    });
    expect(plan("app", "gone", "into")).toEqual({
      outcome: "refused",
      reason: "That Journey is no longer in the tree. Reload the Journey tree and try again.",
    });
  });
});

describe("CR203: the drop zone that makes a Journey a root", () => {
  it("puts a nested Journey at the top of the tree", () => {
    expect(planJourneyDrop({ draggedJourneyId: "app", targetJourneyId: null, zone: "root", registry })).toEqual({
      outcome: "move",
      parentId: null,
      position: 0,
      description: "Move Nautilus App to the root, as the first Journey.",
      progress: "Moving Nautilus App to the root, as the first Journey…",
      completion: "Moved Nautilus App to the root, as the first Journey.",
    });
  });

  it("reports a root dropped at the top where it already is as unchanged", () => {
    expect(planJourneyDrop({ draggedJourneyId: "vida-tecnica", targetJourneyId: null, zone: "root", registry })).toEqual({
      outcome: "unchanged",
    });
  });

  it("still moves a root that is not the first one", () => {
    expect(planJourneyDrop({ draggedJourneyId: "vida-criativa", targetJourneyId: null, zone: "root", registry })).toEqual({
      outcome: "move",
      parentId: null,
      position: 0,
      description: "Move Vida Criativa to the root, as the first Journey.",
      progress: "Moving Vida Criativa to the root, as the first Journey…",
      completion: "Moved Vida Criativa to the root, as the first Journey.",
    });
  });
});

describe("CR098, absorbed: the parents the form may offer", () => {
  it("leaves out the moved Journey and everything inside it", () => {
    const offered = eligibleParentJourneys(registry, "nautilus", flattenJourneyRegistry(registry)).map((journey) => journey.id);
    expect(offered).toEqual(["vida-tecnica", "finances", "vida-criativa"]);
  });

  it("offers every Journey when nothing is being moved, as Create does", () => {
    const all = flattenJourneyRegistry(registry).map((journey) => journey.id);
    expect(eligibleParentJourneys(registry, undefined, flattenJourneyRegistry(registry)).map((journey) => journey.id)).toEqual(all);
  });

  it("offers every other Journey when the moved one is not in the tree", () => {
    expect(eligibleParentJourneys(registry, "gone", flattenJourneyRegistry(registry)).map((journey) => journey.id))
      .toEqual(flattenJourneyRegistry(registry).map((journey) => journey.id));
  });
});

describe("CR203: the surface uses one decision and can speak for itself", () => {
  it("offers the root as a drop target only while a drag is happening", () => {
    // Inside the tree tools slot, which exists only in Tree view, and only while a drag lasts.
    const slot = appSource.slice(appSource.indexOf('<div className="journey-tree-tools-slot">'), appSource.indexOf("Drop here to make it a root Journey"));
    expect(slot).toContain("{draggedJourneyId ? (");
    expect(appSource).toContain('const treeToolsVisible = journeyListOrder === "tree"');
  });

  it("keeps the ineligible parents out of the Move form", () => {
    expect(appSource).toContain("eligibleParentJourneys(journeyRegistry, journeyAdminDialog.journeyId, flattenJourneyRegistry(journeyRegistry))");
  });
});
