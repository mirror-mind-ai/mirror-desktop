import { describe, expect, it } from "vitest";
import { reduceActionDisclosure, resolveActionOpen } from "../app/actionDisclosureState";

describe("action disclosure authority", () => {
  it("forces active actions open and collapses them when the last tool settles", () => {
    expect(resolveActionOpen({ manuallyOpen: false, active: true })).toBe(true);
    expect(reduceActionDisclosure({ manuallyOpen: true, wasActive: true }, { type: "activity_changed", active: false })).toEqual({
      manuallyOpen: false,
      wasActive: false,
    });
  });

  it("allows manual disclosure only after settlement", () => {
    expect(reduceActionDisclosure({ manuallyOpen: false, wasActive: true }, { type: "toggle_requested", open: false })).toEqual({
      manuallyOpen: false,
      wasActive: true,
    });
    expect(reduceActionDisclosure({ manuallyOpen: false, wasActive: false }, { type: "toggle_requested", open: true })).toEqual({
      manuallyOpen: true,
      wasActive: false,
    });
  });
});
