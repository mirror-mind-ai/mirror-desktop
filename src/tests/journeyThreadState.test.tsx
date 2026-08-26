import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";

describe("Journey thread readiness surface", () => {
  it("renders a centered not-started state without a generic composer", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "absent", legacyStatePresent: true } }));
    expect(html).toContain("This Journey has not started in Nautilus");
    expect(html).toContain("Existing conversations remain preserved");
    expect(html).not.toContain("textarea");
  });

  it("renders loading and inconsistent states", () => {
    expect(renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "loading" } }))).toContain("Checking Journey conversation");
    expect(renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "inconsistent", reasonCodes: ["invalid_record"], legacyStatePresent: false } }))).toContain("needs recovery");
  });
});
