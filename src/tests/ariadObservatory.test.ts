import { describe, expect, it } from "vitest";
import { createAriadObservatoryModel } from "../domain/ariadObservatory";
import type { OperationalProjection } from "../domain/journeyProjections";

const projection: OperationalProjection = {
  journeyId: "nautilus-harness",
  snapshotId: "op-1",
  sourceRevision: "sha256:op",
  content: {
    activeWork: { activeItem: "CV-003.DS-007", status: "delivery_story_plan_approved" },
    roadmap: {
      roots: [{
        id: "CV-003",
        title: "Nautilus Method Integration",
        type: "capability_value",
        status: "in_progress",
        children: [{
          id: "CV-003.DS-007",
          title: "Ariad Operational Observatory",
          type: "delivery_story",
          status: "planned",
          outcome: "Operational exposes a read-only Ariad observatory.",
          path: "docs/project/roadmap/cv-003/ds-007/index.md",
          children: [],
        }],
      }],
    },
    refinementStories: [{
      id: "RS007",
      title: "Journey Sidebar Navigation Refinement",
      status: "active",
      active: true,
      changeRequests: [{
        id: "CR017",
        title: "Pinned-only filter",
        status: "implemented",
        active: true,
        problem: "Sorting hides important journeys.",
        expectedBehavior: "Pinned filter is visible.",
      }],
    }],
    exploratoryStories: [{
      id: "04b6f311",
      title: "Ariad Structure Observatory",
      status: "promoted",
      summary: "Ariad view as read-only homepage.",
      attractors: [{ title: "Map, not editor", status: "proposed" }],
      experiments: [{ title: "Read-only view", status: "proposed" }],
      handoff: { path: "docs/project/explorations/ariad-operational-observatory/handoff-info.md", status: "confirmed" },
    }],
  },
};

describe("Ariad observatory read model", () => {
  it("composes read-only Ariad state from Operational projection", () => {
    const model = createAriadObservatoryModel("nautilus-harness", projection);

    expect(model.availability).toBe("ready");
    expect(model.activeWork?.activeItem).toBe("CV-003.DS-007");
    expect(model.delivery.summary).toBe("2 roadmap items");
    expect(model.refinement.summary).toBe("1 refinement story");
    expect(model.exploration.summary).toBe("1 exploratory story");
    expect(model.defaultSelection?.id).toBe("CV-003.DS-007");
    expect(model.boundary).toContain("Read-only");
  });

  it("represents missing Operational projection as unavailable instead of inferred", () => {
    const model = createAriadObservatoryModel("nautilus-harness", undefined);

    expect(model.availability).toBe("unavailable");
    expect(model.delivery.roots).toEqual([]);
    expect(model.boundary).toContain("No source data was inferred");
  });
});
