import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentTurn } from "../app/AgentTurn";
import type { AgentTurnPresentation } from "../app/conversationTurnPresentation";

const surface = {
  id: "surface-1",
  kind: "ariad_surface",
  timestamp: "2026-09-11T00:00:00.000Z",
  title: "Ariad surface: PLAN",
  source: { system: "mirror" as const, table: "messages", id: "assistant-1" },
  content: "<<<ARIAD:PLAN>>>\ncanonical\n<<<END:PLAN>>>",
};

function render(presentation: AgentTurnPresentation, proximity: "active" | "latest_completed" | "historical" = "latest_completed") {
  return renderToStaticMarkup(
    <AgentTurn
      message={{ id: "assistant-1", role: "assistant", content: "ignored", createdAt: "2026-09-11T00:00:00.000Z" }}
      speaker={{ label: "Agent", avatar: "π", kind: "agent" }}
      presentation={presentation}
      proximity={proximity}
    />,
  );
}

describe("AgentTurn", () => {
  it("renders semantic groups once in fixed composition order", () => {
    const html = render({
      agentActions: {
        status: "working",
        operations: [{ id: "read-1", name: "read", status: "running", output: surface.content }],
        reasoningSummaries: [{ id: "reasoning-1", content: "Inspecting", status: "completed" }],
        activityOrder: [
          { type: "reasoning_summary", id: "reasoning-1" },
          { type: "operation", id: "read-1" },
        ],
      },
      systemSurfaces: [surface],
      remainingActivity: [],
      agentComment: "Consolidated answer",
    });

    expect(html.match(/Agent Actions/g)).toHaveLength(2);
    expect(html.match(/System Surfaces/g)).toHaveLength(2);
    expect(html.match(/Agent Comments/g)).toHaveLength(2);
    expect(html.indexOf("Agent Actions")).toBeLessThan(html.indexOf("System Surfaces"));
    expect(html.indexOf("System Surfaces")).toBeLessThan(html.indexOf("Agent Comments"));
    expect(html.match(/canonical/g)).toHaveLength(1);
    expect(html).toContain("Consolidated answer");
    expect(html).toContain('aria-label="Agent Actions"');
    expect(html).toContain('aria-label="System Surfaces"');
    expect(html).toContain('aria-label="Agent Comments"');
  });

  it("enables semantic code-block copy controls for Agent Comments", () => {
    const html = render({
      systemSurfaces: [],
      remainingActivity: [],
      agentComment: "```json\n{\"ready\":true}\n```",
    });

    expect(html.match(/aria-label="Copy code block"/g)).toHaveLength(1);
    expect(html).toContain("{&quot;ready&quot;:true}");
  });

  it("keeps completed tool evidence but omits the redundant successful run outcome", () => {
    const html = render({
      agentActions: {
        status: "completed",
        operations: [{ id: "read-1", name: "read", status: "completed", output: "loaded" }],
        reasoningSummaries: [],
        activityOrder: [{ type: "operation", id: "read-1" }],
      },
      systemSurfaces: [],
      remainingActivity: [],
      agentComment: "Done",
    });

    expect(html).toContain('<span class="runtime-operation-status">completed</span>');
    expect(html).not.toContain('<div class="runtime-terminal-status"');
  });

  it.each([
    ["failed", "Failed"],
    ["cancelled", "Cancelled"],
  ] as const)("retains the meaningful %s terminal outcome", (status, label) => {
    const html = render({
      agentActions: {
        status,
        operations: [],
        reasoningSummaries: [],
        activityOrder: [],
        terminalMessage: `${label} by runtime`,
      },
      systemSurfaces: [],
      remainingActivity: [],
      agentComment: "Outcome explained",
    });

    expect(html).toContain('<div class="runtime-terminal-status"');
    expect(html).toContain(label);
  });

  it("omits unsupported empty semantic regions", () => {
    const html = render({
      systemSurfaces: [],
      remainingActivity: [],
      agentComment: "Comment only",
    });

    expect(html).not.toContain("Agent Actions");
    expect(html).not.toContain("System Surfaces");
    expect(html).toContain("Agent Comments");
  });

  it("compacts historical anatomy around comments with truthful recoverable counts", () => {
    const html = render({
      agentActions: {
        status: "completed",
        operations: [{ id: "read-1", name: "read", status: "completed" }],
        reasoningSummaries: [{ id: "summary-1", content: "Inspecting", status: "completed" }],
        activityOrder: [
          { type: "reasoning_summary", id: "summary-1" },
          { type: "operation", id: "read-1" },
        ],
      },
      systemSurfaces: [surface],
      remainingActivity: [],
      agentComment: "Historical answer",
    }, "historical");

    expect(html.indexOf("Agent Comments")).toBeLessThan(html.indexOf("Show turn details"));
    expect(html).toContain("Show turn details · 1 action · 1 surface");
    expect(html).toContain('class="historical-turn-disclosure"');
    expect(html).not.toMatch(/<details class="historical-turn-disclosure" open/);
  });

  it("keeps surface-only assistant turns visible", () => {
    const html = render({
      systemSurfaces: [surface],
      remainingActivity: [],
      agentComment: "",
    });

    expect(html).toContain('class="message assistant speaker-agent"');
    expect(html).toContain("System Surfaces");
    expect(html).not.toContain("Agent Comments");
  });
});
