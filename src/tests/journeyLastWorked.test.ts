import { describe, expect, it } from "vitest";
import { recordJourneyLastWorked, relativeLastWorkedLabel } from "../app/journeyLastWorked";
import appSource from "../app/App.tsx?raw";

const NOW = Date.parse("2026-09-02T15:00:00.000Z");

describe("Journey last-worked presentation", () => {
  it.each([
    [undefined, undefined],
    ["invalid", undefined],
    ["2026-09-02T14:59:30.000Z", "just now"],
    ["2026-09-02T14:58:00.000Z", "2 minutes ago"],
    ["2026-09-02T13:00:00.000Z", "2 hours ago"],
    ["2026-08-31T15:00:00.000Z", "2 days ago"],
    ["2026-07-02T15:00:00.000Z", "2 months ago"],
  ])("formats %s as %s", (timestamp, expected) => {
    expect(relativeLastWorkedLabel(timestamp, NOW)).toBe(expected);
  });

  it("updates work activity only from an admitted live run", () => {
    expect(appSource).toContain('mode === "live" && !workActivityRecorded && event.type === "run_status" && event.status === "starting"');
    expect(appSource).toContain("recordJourneyLastWorked(current, ownerJourneyId, admittedAt)");
    expect(appSource).toContain('!pinnedOnly && journeyListOrder === "recent" && !sidebarCompact');
  });

  it("records exact admitted work without mutating sibling Journeys", () => {
    expect(recordJourneyLastWorked({ alpha: "2026-09-01T00:00:00.000Z" }, "beta", "2026-09-02T15:00:00.000Z")).toEqual({
      alpha: "2026-09-01T00:00:00.000Z",
      beta: "2026-09-02T15:00:00.000Z",
    });
  });
});
