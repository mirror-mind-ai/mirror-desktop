import { describe, expect, it } from "vitest";
import {
  activateJourneyTree,
  defaultNewJourneyParentId,
  sidebarToggleLabel,
  toggleJourneySidebar,
} from "../app/journeySidebarPresentation";

describe("Journey sidebar presentation", () => {
  it("uses the selected Journey as creation parent only in the active Tree view", () => {
    expect(defaultNewJourneyParentId("tree", false, "mirror-dev")).toBe("mirror-dev");
    expect(defaultNewJourneyParentId("tree", true, "mirror-dev")).toBe("");
    expect(defaultNewJourneyParentId("recent", false, "mirror-dev")).toBe("");
  });

  it("collapses Tree into Recent instead of compressing its hierarchy", () => {
    expect(toggleJourneySidebar({ sidebarCompact: false, journeyListOrder: "tree", pinnedOnly: false })).toEqual({
      sidebarCompact: true,
      journeyListOrder: "recent",
      pinnedOnly: false,
    });
  });

  it("preserves usable Recent and Pinned views while toggling the rail", () => {
    expect(toggleJourneySidebar({ sidebarCompact: false, journeyListOrder: "recent", pinnedOnly: true })).toEqual({
      sidebarCompact: true,
      journeyListOrder: "recent",
      pinnedOnly: true,
    });
    expect(toggleJourneySidebar({ sidebarCompact: true, journeyListOrder: "recent", pinnedOnly: false })).toEqual({
      sidebarCompact: false,
      journeyListOrder: "recent",
      pinnedOnly: false,
    });
  });

  it("expands the sidebar whenever Tree is activated", () => {
    expect(activateJourneyTree()).toEqual({ sidebarCompact: false, journeyListOrder: "tree", pinnedOnly: false });
  });

  it("announces the inverse sidebar action", () => {
    expect(sidebarToggleLabel(false)).toBe("Collapse Journey sidebar");
    expect(sidebarToggleLabel(true)).toBe("Expand Journey sidebar");
  });
});
