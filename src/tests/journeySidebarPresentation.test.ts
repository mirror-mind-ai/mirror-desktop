import { describe, expect, it } from "vitest";
import {
  defaultNewJourneyParentId,
  sidebarToggleLabel,
} from "../app/journeySidebarPresentation";

describe("Journey sidebar presentation", () => {
  it("uses the selected Journey as creation parent only in the active Tree view", () => {
    expect(defaultNewJourneyParentId("tree", false, "mirror-dev")).toBe("mirror-dev");
    expect(defaultNewJourneyParentId("tree", true, "mirror-dev")).toBe("");
    expect(defaultNewJourneyParentId("recent", false, "mirror-dev")).toBe("");
  });

  it("announces the inverse sidebar action", () => {
    expect(sidebarToggleLabel(false)).toBe("Collapse Journey sidebar");
    expect(sidebarToggleLabel(true)).toBe("Expand Journey sidebar");
  });
});
