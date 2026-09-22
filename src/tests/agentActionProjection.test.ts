import { describe, expect, it } from "vitest";
import { projectAgentActionGroups } from "../app/agentActionProjection";
import type { RuntimeProjectionState } from "../app/runtimeActivityModel";

function projection(overrides: Partial<RuntimeProjectionState> = {}): RuntimeProjectionState {
  return { status: "working", operations: [], reasoningSummaries: [], activityOrder: [], ...overrides };
}

describe("agent action projection", () => {
  it("assigns following sequential and concurrent tools to the exposed summary action", () => {
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [
        { id: "summary-1", content: "Inspecting sources", status: "completed" },
        { id: "summary-2", content: "Checking results", status: "streaming" },
      ],
      operations: [
        { id: "read-1", name: "read", status: "completed" },
        { id: "read-2", name: "read", status: "running" },
        { id: "bash-1", name: "bash", status: "running" },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-1" },
        { type: "operation", id: "read-1" },
        { type: "reasoning_summary", id: "summary-2" },
        { type: "operation", id: "read-2" },
        { type: "operation", id: "bash-1" },
      ],
    }));

    expect(groups.map((group) => ({ label: group.label, tools: group.operations.map((tool) => tool.id), active: group.active }))).toEqual([
      { label: "Inspecting sources", tools: ["read-1"], active: false },
      { label: "Checking results", tools: ["read-2", "bash-1"], active: true },
    ]);
  });

  it("separates independently emphasized titles from one compound summary record", () => {
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [{
        id: "summary-compound",
        content: "**Synthesizing roadmap and document status inconsistencies**\n\n**Reviewing release status and update rehearsals**\n\n",
        status: "streaming",
      }],
      operations: [
        { id: "read-1", name: "read", status: "completed" },
        { id: "read-2", name: "read", status: "running" },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-compound" },
        { type: "operation", id: "read-1" },
        { type: "operation", id: "read-2" },
      ],
    }));

    expect(groups.map((group) => ({ id: group.id, label: group.label, tools: group.operations.map((tool) => tool.id), active: group.active }))).toEqual([
      {
        id: "summary:summary-compound:0",
        label: "Synthesizing roadmap and document status inconsistencies",
        tools: [],
        active: false,
      },
      {
        id: "summary:summary-compound:1",
        label: "Reviewing release status and update rehearsals",
        tools: ["read-1", "read-2"],
        active: true,
      },
    ]);
  });

  it("uses an empty summary as a boundary before an honest fallback action", () => {
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [
        { id: "summary-1", content: "Assessing shortcut use", status: "completed" },
        { id: "summary-empty", content: "", status: "completed" },
      ],
      operations: [
        { id: "read-1", name: "read", status: "completed" },
        { id: "bash-1", name: "bash", status: "completed", arguments: { command: "rg Status docs" } },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-1" },
        { type: "operation", id: "read-1" },
        { type: "reasoning_summary", id: "summary-empty" },
        { type: "operation", id: "bash-1" },
      ],
    }));

    expect(groups.map((group) => ({ id: group.id, tools: group.operations.map((tool) => tool.id) }))).toEqual([
      { id: "summary:summary-1", tools: ["read-1"] },
      { id: "operation:bash-1", tools: ["bash-1"] },
    ]);
  });

  it("projects mixed multiparagraph summaries as one reasoning block, not a flooded label", () => {
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [{
        id: "summary-mixed",
        content: "**Inspecting sources**\n\nThis paragraph explains why the files belong together.",
        status: "completed",
      }],
      activityOrder: [{ type: "reasoning_summary", id: "summary-mixed" }],
    }));

    expect(groups).toMatchObject([{
      id: "summary:summary-mixed",
      kind: "reasoning",
      label: "Inspecting sources",
      reasoningText: "Inspecting sources\n\nThis paragraph explains why the files belong together.",
      operations: [],
    }]);
  });

  it("projects narrative thinking as a reasoning block with a derived title and nested tools", () => {
    const narrative = "I need to figure out where these two files actually live, since mirror-dev looks like a Python project. I'll need to search for them.";
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [{ id: "summary-1", content: narrative, status: "completed" }],
      operations: [{ id: "glob-1", name: "glob", status: "completed" }],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-1" },
        { type: "operation", id: "glob-1" },
      ],
    }));

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      kind: "reasoning",
      reasoningText: narrative,
      operations: [{ id: "glob-1" }],
      active: false,
    });
    expect(groups[0].label.length).toBeLessThanOrEqual(120);
    expect(groups[0].label.startsWith("I need to figure out")).toBe(true);
  });

  it("keeps short single-line summaries as chips and truncates long titles visibly", () => {
    const shortLine = "Formulating a concise answer";
    const longSingleSentence = `Weighing ${"tradeoff ".repeat(20)}between the two synchronization strategies without a sentence break`;
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [
        { id: "summary-1", content: shortLine, status: "completed" },
        { id: "summary-2", content: longSingleSentence, status: "completed" },
      ],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-1" },
        { type: "reasoning_summary", id: "summary-2" },
      ],
    }));

    expect(groups[0]).toMatchObject({ label: shortLine, operations: [] });
    expect(groups[0].kind).toBeUndefined();
    expect(groups[1].kind).toBe("reasoning");
    expect(groups[1].label.endsWith("\u2026")).toBe(true);
    expect(groups[1].label.length).toBeLessThanOrEqual(80);
  });

  it("projects truncated and elided reasoning evidence visibly and preserves nesting", () => {
    const groups = projectAgentActionGroups(projection({
      reasoningSummaries: [
        { id: "summary-1", content: `${"a".repeat(200)}. More reasoning follows here without end`, status: "completed", truncated: true },
        { id: "summary-2", content: "", status: "completed", elided: true },
      ],
      operations: [{ id: "read-1", name: "read", status: "completed" }],
      activityOrder: [
        { type: "reasoning_summary", id: "summary-1" },
        { type: "reasoning_summary", id: "summary-2" },
        { type: "operation", id: "read-1" },
      ],
    }));

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ kind: "reasoning", truncated: true });
    expect(groups[1]).toMatchObject({
      kind: "reasoning",
      elided: true,
      label: "further reasoning elided at the turn limit",
      operations: [{ id: "read-1" }],
    });
  });

  it("creates one honest fallback action for every unclaimed tool", () => {
    const groups = projectAgentActionGroups(projection({
      operations: [
        { id: "read-1", name: "read", status: "completed", arguments: { path: "package.json" } },
        { id: "bash-1", name: "bash", status: "failed", arguments: { command: "npm test" } },
      ],
      activityOrder: [
        { type: "operation", id: "read-1" },
        { type: "operation", id: "bash-1" },
      ],
    }));

    expect(groups).toMatchObject([
      { id: "operation:read-1", label: "read · package.json", operations: [{ id: "read-1" }] },
      { id: "operation:bash-1", label: "bash · npm test", operations: [{ id: "bash-1" }] },
    ]);
  });
});
