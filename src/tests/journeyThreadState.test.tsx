import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";

describe("Journey thread readiness surface", () => {
  it("renders a centered not-started state without a generic composer", () => {
    const html = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "absent" }, onStart: () => undefined }));
    expect(html).toContain("This Journey has not started in Nautilus");
    expect(html).not.toContain("Atelier conversation");
    expect(html).not.toContain("Select conversation");
    expect(html).toContain("Start this Journey");
    expect(html).not.toContain("textarea");
  });

  it("renders model-free provisioning progress and retry", () => {
    const starting = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "absent" }, starting: true, startingPhase: "creating_mirror_conversation" }));
    expect(starting).toContain("Creating Mirror conversation");
    const verifying = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "absent" }, starting: true, startingPhase: "verifying_authority" }));
    expect(verifying).toContain("Verifying dedicated authority");
    expect(starting).not.toContain("Start this Journey");
    const failed = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "absent" }, error: "native_pair_failed", onStart: () => undefined }));
    expect(failed).toContain("Retry starting this Journey");
  });

  it("distinguishes invalid authority from a runtime read failure", () => {
    const loading = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "loading" } }));
    expect(loading).toContain("Checking Journey conversation");
    expect(loading).not.toContain("Atelier conversation");
    const inconsistent = renderToStaticMarkup(createElement(JourneyThreadState, { journeyName: "Atelier", state: { kind: "inconsistent", reasonCodes: ["invalid_record"] } }));
    expect(inconsistent).toContain("needs recovery");
    expect(inconsistent).toContain("Nautilus found incomplete");
    const unavailable = renderToStaticMarkup(createElement(JourneyThreadState, {
      journeyName: "Atelier",
      state: { kind: "unavailable", reason: "runtime_read_failed" },
    }));
    expect(unavailable).toContain("could not be loaded");
    expect(unavailable).toContain("runtime_read_failed");
    expect(unavailable).not.toContain("needs recovery");
  });
});
