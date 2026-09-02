import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyRuntimeIndicator } from "../app/JourneyRuntimeIndicator";

function renderIndicator(phase: "running" | "finalizing"): string {
  return renderToStaticMarkup(
    <JourneyRuntimeIndicator journeyName="Mirror Development" phase={phase} />,
  );
}

describe("Journey runtime indicator", () => {
  it("renders exact running ownership as an accessible animated Working badge", () => {
    const html = renderIndicator("running");

    expect(html).toContain("journey-runtime-state running");
    expect(html).toContain("Working");
    expect(html).toContain('aria-label="Mirror Development is working"');
  });

  it("keeps finalization distinct as Recording", () => {
    const html = renderIndicator("finalizing");

    expect(html).toContain("journey-runtime-state finalizing");
    expect(html).toContain("Recording");
    expect(html).toContain('aria-label="Mirror Development is recording the completed turn"');
  });

  it("renders a dedicated decorative activity dot without changing the status text", () => {
    const html = renderIndicator("running");

    expect(html).toContain('class="journey-runtime-dot"');
    expect(html).toContain('aria-hidden="true"');
  });
});
