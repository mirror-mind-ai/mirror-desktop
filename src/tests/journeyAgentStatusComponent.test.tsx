import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAgentStatusIndicator } from "../app/JourneyAgentStatusIndicator";

describe("Journey agent status", () => {
  it.each(["idle", "working", "finishing", "finished"] as const)("renders %s as status rather than a false button", (status) => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="sidebar" />,
    );
    expect(html).toContain(`journey-agent-status ${status} placement-sidebar`);
    expect(html).toContain('role="status"');
    expect(html).toContain(`Mirror Desktop agent ${status === "finished" ? "finished" : `is ${status}`}`);
    expect(html).not.toContain("<button");
  });

  it.each([
    ["idle", "Idle"],
    ["working", "Working"],
    ["finishing", "Finishing"],
    ["finished", "Ready"],
  ] as const)("names %s beside the header icon", (status, label) => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="header" />,
    );
    expect(html).toContain("placement-header");
    expect(html).toContain('class="journey-agent-status-label"');
    expect(html).toContain(`>${label}</span>`);
  });
});
