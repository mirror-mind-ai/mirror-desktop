import { describe, expect, it } from "vitest";
import {
  hasRuntimeProjectionContent,
  initialRuntimeProjectionState,
  isRuntimeProjectionActive,
  mergeRuntimeContextUsage,
  reduceRuntimeProjection,
  type RuntimeProjectionState,
} from "../app/runtimeActivityModel";
import type { AgentStreamEvent } from "../agent/agentStream";

function reduce(events: AgentStreamEvent[]): RuntimeProjectionState {
  return events.reduce(reduceRuntimeProjection, initialRuntimeProjectionState);
}

describe("ordered runtime projection", () => {
  it("does not reserve an empty chat card before runtime content arrives", () => {
    expect(hasRuntimeProjectionContent(initialRuntimeProjectionState)).toBe(false);
    expect(hasRuntimeProjectionContent({ ...initialRuntimeProjectionState, status: "working" })).toBe(false);
    expect(hasRuntimeProjectionContent({
      ...initialRuntimeProjectionState,
      status: "working",
      operations: [{ id: "read-1", name: "read", status: "running" }],
      activityOrder: [{ type: "operation", id: "read-1" }],
    })).toBe(true);
    expect(hasRuntimeProjectionContent({
      ...initialRuntimeProjectionState,
      status: "working",
      contextUsage: { tokens: 1000, contextWindow: 272000, percent: 0.4 },
    })).toBe(false);
    expect(hasRuntimeProjectionContent({
      ...initialRuntimeProjectionState,
      status: "completed",
    })).toBe(true);
  });

  it("keeps the authoritative model window while newer usage updates arrive", () => {
    expect(mergeRuntimeContextUsage(
      { tokens: 14880, contextWindow: 272000, percent: 5.47 },
      { tokens: null, contextWindow: null, percent: null },
    )).toEqual({ tokens: null, contextWindow: 272000, percent: null });
  });

  it("reduces lifecycle into one settled run status", () => {
    const state = reduce([
      { type: "run_status", status: "working" },
      { type: "run_status", status: "completed" },
    ]);

    expect(state.status).toBe("completed");
    expect(state.operations).toEqual([]);
    expect(isRuntimeProjectionActive(state)).toBe(false);
  });

  it("keeps streamed reasoning summaries ordered with operations and separate from assistant text", () => {
    const state = reduce([
      { type: "reasoning_summary_start" },
      { type: "reasoning_summary_delta", content: "Preparing the Mirror context" },
      {
        type: "operation_update",
        operation: { id: "read-1", name: "read", status: "completed", output: "loaded" },
      },
      { type: "reasoning_summary_end" },
      { type: "reasoning_summary_start" },
      { type: "reasoning_summary_delta", content: "Formulating the answer" },
      { type: "reasoning_summary_end" },
    ]);

    expect(state.reasoningSummaries).toEqual([
      { id: "reasoning-1", content: "Preparing the Mirror context", status: "completed" },
      { id: "reasoning-2", content: "Formulating the answer", status: "completed" },
    ]);
    expect(state.activityOrder).toEqual([
      { type: "reasoning_summary", id: "reasoning-1" },
      { type: "operation", id: "read-1" },
      { type: "reasoning_summary", id: "reasoning-2" },
    ]);
  });

  it("upserts one evolving operation by toolCallId while preserving order", () => {
    const state = reduce([
      {
        type: "operation_update",
        operation: { id: "read-1", name: "read", status: "preparing", arguments: { path: "SKILL.md" } },
      },
      {
        type: "operation_update",
        operation: { id: "bash-1", name: "bash", status: "running", arguments: { command: "mirror load" } },
      },
      {
        type: "operation_update",
        operation: { id: "bash-1", name: "bash", status: "running", output: "partial" },
      },
      {
        type: "operation_update",
        operation: { id: "read-1", name: "read", status: "completed", output: "skill contents" },
      },
      {
        type: "operation_update",
        operation: { id: "bash-1", name: "bash", status: "completed", output: "final" },
      },
    ]);

    expect(state.operations.map((operation) => operation.id)).toEqual(["read-1", "bash-1"]);
    expect(state.operations[0]).toMatchObject({ status: "completed", arguments: { path: "SKILL.md" }, output: "skill contents" });
    expect(state.operations[1]).toMatchObject({ status: "completed", arguments: { command: "mirror load" }, output: "final" });
  });

  it("latches cancellation, interrupts unresolved operations, and ignores late ordinary activity", () => {
    const state = reduce([
      { type: "run_status", status: "working" },
      { type: "operation_update", operation: { id: "bash-1", name: "bash", status: "running", output: "partial" } },
      { type: "cancelled", message: "Pi invocation cancelled." },
      { type: "done" },
      { type: "run_status", status: "completed" },
      { type: "operation_update", operation: { id: "bash-1", name: "bash", status: "completed", output: "late" } },
    ]);

    expect(state.status).toBe("cancelled");
    expect(state.terminalMessage).toBe("Pi invocation cancelled.");
    expect(state.operations).toEqual([
      { id: "bash-1", name: "bash", status: "interrupted", output: "partial" },
    ]);
  });

  it("accepts authoritative context and Pi compaction evidence after agent_end without reopening the run", () => {
    const state = reduce([
      { type: "run_status", status: "working" },
      { type: "run_status", status: "completed" },
      {
        type: "operation_update",
        operation: {
          id: "compaction-1",
          kind: "compaction",
          name: "Context compaction",
          status: "running",
        },
      },
      {
        type: "operation_update",
        operation: {
          id: "compaction-1",
          kind: "compaction",
          name: "Context compaction",
          status: "completed",
        },
      },
      { type: "context_usage", usage: { tokens: null, contextWindow: 272000, percent: null } },
    ]);

    expect(state.status).toBe("completed");
    expect(state.operations).toEqual([
      expect.objectContaining({ id: "compaction-1", status: "completed" }),
    ]);
    expect(state.contextUsage).toEqual({ tokens: null, contextWindow: 272000, percent: null });
  });

  it("latches failure and fails unresolved operations before agent_end and done", () => {
    const state = reduce([
      { type: "run_status", status: "working" },
      { type: "operation_update", operation: { id: "read-1", name: "read", status: "preparing" } },
      { type: "error", message: "Pi command failed." },
      { type: "run_status", status: "completed" },
      { type: "done" },
      { type: "cancelled", message: "late cancellation" },
    ]);

    expect(state.status).toBe("failed");
    expect(state.terminalMessage).toBe("Pi command failed.");
    expect(state.operations[0]).toMatchObject({ status: "failed", isError: true });
  });

  it("interrupts unresolved activity when done completes an otherwise successful run", () => {
    const state = reduce([
      { type: "run_status", status: "working" },
      { type: "reasoning_summary_start" },
      { type: "reasoning_summary_delta", content: "Partial summary" },
      { type: "operation_update", operation: { id: "read-1", name: "read", status: "running" } },
      { type: "done" },
    ]);

    expect(state.status).toBe("completed");
    expect(state.operations[0].status).toBe("interrupted");
    expect(state.reasoningSummaries[0].status).toBe("interrupted");
  });

  it("does not project assistant text, diagnostics, raw output, or private reasoning as operations", () => {
    const state = reduce([
      { type: "message_delta", content: "answer" },
      { type: "diagnostic", message: "lifecycle noise" },
      { type: "raw_output", content: "fallback" },
    ]);

    expect(state).toEqual(initialRuntimeProjectionState);
  });
});
