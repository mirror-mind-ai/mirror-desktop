import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";

describe("Journey thread readiness surface", () => {
  it("renders a centered not-started state without a generic composer", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "absent", legacyStatePresent: true }, onStart: () => undefined }));
    expect(html).toContain("This Journey has not started in Nautilus");
    expect(html).toContain("Existing conversations remain preserved");
    expect(html).toContain("Start this Journey");
    expect(html).not.toContain("textarea");
  });

  it("renders model-free provisioning progress and retry", () => {
    const starting = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "absent", legacyStatePresent: false }, starting: true, startingPhase: "creating_mirror_conversation" }));
    expect(starting).toContain("Creating Mirror conversation");
    const verifying = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "absent", legacyStatePresent: false }, starting: true, startingPhase: "verifying_authority" }));
    expect(verifying).toContain("Verifying dedicated authority");
    expect(starting).not.toContain("Start this Journey");
    const failed = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "absent", legacyStatePresent: false }, error: "native_pair_failed", onStart: () => undefined }));
    expect(failed).toContain("Retry starting this Journey");
  });

  it("renders loading and inconsistent states", () => {
    expect(renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "loading" } }))).toContain("Checking Journey conversation");
    expect(renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Nautilus", state: { kind: "inconsistent", reasonCodes: ["invalid_record"], legacyStatePresent: false } }))).toContain("needs recovery");
  });
});
