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

  it("does not split mixed narrative or ordinary multiparagraph summaries", () => {
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
      label: "Inspecting sources\n\nThis paragraph explains why the files belong together.",
      operations: [],
    }]);
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
