import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyAgentStatusIndicator } from "../app/JourneyAgentStatusIndicator";

const ALL_STATUSES = ["idle", "working", "finishing", "finished", "interrupted", "failed"] as const;

const spokenState: Record<(typeof ALL_STATUSES)[number], string> = {
  idle: "is idle",
  working: "is working",
  finishing: "is finishing",
  finished: "finished",
  interrupted: "was interrupted",
  failed: "failed",
};

describe("Journey agent status", () => {
  it.each(ALL_STATUSES)("renders %s as status rather than a false button", (status) => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="sidebar" />,
    );
    expect(html).toContain(`journey-agent-status ${status} placement-sidebar`);
    expect(html).toContain('role="status"');
    expect(html).toContain(`Mirror Desktop agent ${spokenState[status]}`);
    expect(html).not.toContain("<button");
  });

  // CR102: shape is what identifies a state, so no two states may render the same glyph. This is
  // the guardrail that keeps colour and motion from quietly becoming the carrier again.
  it("gives every state a glyph no other state produces", () => {
    const glyphs = ALL_STATUSES.map((status) => renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="sidebar" />,
    ).replace(`journey-agent-status ${status} placement-sidebar`, ""));
    expect(new Set(glyphs).size).toBe(ALL_STATUSES.length);
  });

  it.each([
    ["idle", "Idle"],
    ["working", "Working"],
    ["finishing", "Finishing"],
    ["finished", "Ready"],
    ["interrupted", "Interrupted"],
    ["failed", "Failed"],
  ] as const)("names %s beside the header icon", (status, label) => {
    const html = renderToStaticMarkup(
      <JourneyAgentStatusIndicator journeyName="Mirror Desktop" status={status} placement="header" />,
    );
    expect(html).toContain("placement-header");
    expect(html).toContain('class="journey-agent-status-label"');
    expect(html).toContain(`>${label}</span>`);
  });
});
