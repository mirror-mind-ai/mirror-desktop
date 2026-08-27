import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AriadOperationalObservatory } from "../app/AriadOperationalObservatory";
import type { OperationalProjection } from "../domain/journeyProjections";

const projection: OperationalProjection = {
  journeyId: "nautilus-harness",
  snapshotId: "op-1",
  sourceRevision: "sha256:op",
  content: {
    activeWork: { activeItem: "CV-003.DS-007", status: "delivery_story_plan_approved" },
    roadmap: {
      roots: [{
        id: "CV-003.DS-007",
        title: "Ariad Operational Observatory",
        type: "delivery_story",
        status: "in_progress",
        outcome: "Operational exposes a read-only Ariad observatory.",
        children: [],
      }],
    },
    refinementStories: [{ id: "RS007", title: "Sidebar Refinement", status: "active", active: true, changeRequests: [] }],
    exploratoryStories: [{ id: "04b6f311", title: "Ariad Structure Observatory", status: "promoted", summary: "Map, not editor.", attractors: [], experiments: [] }],
  },
};

describe("AriadOperationalObservatory", () => {
  it("renders Ariad Home as a read-only Operational surface", () => {
    const html = renderToStaticMarkup(<AriadOperationalObservatory journeyId="nautilus-harness" journeyName="Nautilus Harness" projection={projection} />);

    expect(html).toContain('aria-label="Ariad observatory"');
    expect(html).toContain("Ariad Observatory");
    expect(html).toContain("Next Safe Movement");
    expect(html).toContain("Delivery");
    expect(html).toContain("Refinement");
    expect(html).toContain("Exploration");
    expect(html).toContain("Selected Matter");
    expect(html).toContain('class="ariad-roadmap-status status-in-progress"');
    expect(html).toContain('aria-label="Status: In progress"');
    expect(html).not.toContain(">in_progress<");
    expect(html).toContain("read-only");
  });

  it("renders an unavailable boundary when the projection is missing", () => {
    const html = renderToStaticMarkup(<AriadOperationalObservatory journeyId="nautilus-harness" journeyName="Nautilus Harness" />);

    expect(html).toContain("Unavailable");
    expect(html).toContain("Operational Ariad projection is unavailable");
    expect(html).toContain("No source data was inferred");
  });
});
