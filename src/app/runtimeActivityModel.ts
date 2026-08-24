import type { AgentOperationStatus, AgentRunStatus, AgentStreamEvent } from "../agent/agentStream";

export type RuntimeProjectionStatus = AgentRunStatus | "cancelled" | "failed";

export type ProjectedRuntimeOperation = {
  id: string;
  kind?: "tool" | "skill" | "compaction";
  name: string;
  status: AgentOperationStatus;
  arguments?: unknown;
  output?: string;
  isError?: boolean;
};

export type ProjectedReasoningSummary = {
  id: string;
  content: string;
  status: "streaming" | "completed" | "interrupted";
};

export type RuntimeActivityReference =
  | { type: "operation"; id: string }
  | { type: "reasoning_summary"; id: string };

export type RuntimeContextUsage = {
  tokens: number | null;
  contextWindow: number | null;
  percent: number | null;
};

export type RuntimeProjectionState = {
  status: RuntimeProjectionStatus;
  operations: ProjectedRuntimeOperation[];
  reasoningSummaries: ProjectedReasoningSummary[];
  activityOrder: RuntimeActivityReference[];
  contextUsage?: RuntimeContextUsage;
  terminalMessage?: string;
};

export const initialRuntimeProjectionState: RuntimeProjectionState = {
  status: "starting",
  operations: [],
  reasoningSummaries: [],
  activityOrder: [],
};

export function reduceRuntimeProjection(
  state: RuntimeProjectionState,
  event: AgentStreamEvent,
): RuntimeProjectionState {
  if (isRuntimeProjectionTerminal(state)) {
    if (event.type === "context_usage") {
      return { ...state, contextUsage: mergeRuntimeContextUsage(state.contextUsage, event.usage) };
    }
    return event.type === "operation_update" && event.operation.kind === "compaction"
      ? upsertRuntimeOperation(state, event.operation)
      : state;
  }

  if (event.type === "cancelled") {
    return settleRuntimeProjection(state, "cancelled", event.message);
  }
  if (event.type === "error") {
    return settleRuntimeProjection(state, "failed", event.message);
  }
  if (event.type === "done") {
    return settleRuntimeProjection(state, "completed");
  }
  if (event.type === "run_status") {
    return event.status === "completed"
      ? settleRuntimeProjection(state, "completed")
      : { ...state, status: event.status };
  }
  if (event.type === "context_usage") {
    return { ...state, contextUsage: mergeRuntimeContextUsage(state.contextUsage, event.usage) };
  }
  if (event.type === "reasoning_summary_start") {
    return startReasoningSummary(state);
  }
  if (event.type === "reasoning_summary_delta") {
    return appendReasoningSummary(state, event.content);
  }
  if (event.type === "reasoning_summary_end") {
    return finishReasoningSummary(state);
  }
  if (event.type !== "operation_update") {
    return state;
  }

  return upsertRuntimeOperation(state, event.operation);
}

function upsertRuntimeOperation(
  state: RuntimeProjectionState,
  operation: ProjectedRuntimeOperation,
): RuntimeProjectionState {
  const index = state.operations.findIndex((candidate) => candidate.id === operation.id);
  if (index === -1) {
    return {
      ...state,
      operations: [...state.operations, { ...operation }],
      activityOrder: [...state.activityOrder, { type: "operation", id: operation.id }],
    };
  }

  const operations = [...state.operations];
  operations[index] = {
    ...operations[index],
    ...operation,
    arguments: operation.arguments ?? operations[index].arguments,
    output: operation.output ?? operations[index].output,
  };
  return { ...state, operations };
}

export function mergeRuntimeContextUsage(
  current: RuntimeProjectionState["contextUsage"],
  next: RuntimeContextUsage,
): RuntimeContextUsage {
  return {
    tokens: next.tokens,
    contextWindow: next.contextWindow ?? current?.contextWindow ?? null,
    percent: next.percent,
  };
}

export function hasRuntimeProjectionContent(state: RuntimeProjectionState): boolean {
  return isRuntimeProjectionTerminal(state)
    || state.operations.length > 0
    || state.reasoningSummaries.some((summary) => summary.content.length > 0);
}

export function isRuntimeProjectionActive(state: RuntimeProjectionState): boolean {
  return state.status === "starting" || state.status === "working";
}

export function isRuntimeProjectionTerminal(state: RuntimeProjectionState): boolean {
  return !isRuntimeProjectionActive(state);
}

function startReasoningSummary(state: RuntimeProjectionState): RuntimeProjectionState {
  const settledPrevious = state.reasoningSummaries.map((summary) =>
    summary.status === "streaming" ? { ...summary, status: "completed" as const } : summary,
  );
  const id = `reasoning-${state.reasoningSummaries.length + 1}`;
  return {
    ...state,
    reasoningSummaries: [...settledPrevious, { id, content: "", status: "streaming" }],
    activityOrder: [...state.activityOrder, { type: "reasoning_summary", id }],
  };
}

function appendReasoningSummary(state: RuntimeProjectionState, content: string): RuntimeProjectionState {
  const currentIndex = state.reasoningSummaries.map((summary) => summary.status).lastIndexOf("streaming");
  if (currentIndex === -1) {
    return appendReasoningSummary(startReasoningSummary(state), content);
  }
  const reasoningSummaries = [...state.reasoningSummaries];
  reasoningSummaries[currentIndex] = {
    ...reasoningSummaries[currentIndex],
    content: `${reasoningSummaries[currentIndex].content}${content}`,
  };
  return { ...state, reasoningSummaries };
}

function finishReasoningSummary(state: RuntimeProjectionState): RuntimeProjectionState {
  const currentIndex = state.reasoningSummaries.map((summary) => summary.status).lastIndexOf("streaming");
  if (currentIndex === -1) {
    return state;
  }
  const reasoningSummaries = [...state.reasoningSummaries];
  reasoningSummaries[currentIndex] = { ...reasoningSummaries[currentIndex], status: "completed" };
  return { ...state, reasoningSummaries };
}

function settleRuntimeProjection(
  state: RuntimeProjectionState,
  status: "completed" | "cancelled" | "failed",
  terminalMessage?: string,
): RuntimeProjectionState {
  return {
    ...state,
    status,
    terminalMessage,
    operations: state.operations.map((operation) => settleOperation(operation, status)),
    reasoningSummaries: state.reasoningSummaries.map((summary) =>
      summary.status === "streaming" ? { ...summary, status: "interrupted" } : summary,
    ),
  };
}

function settleOperation(
  operation: ProjectedRuntimeOperation,
  runStatus: "completed" | "cancelled" | "failed",
): ProjectedRuntimeOperation {
  if (operation.status !== "preparing" && operation.status !== "running") {
    return operation;
  }
  if (runStatus === "failed") {
    return { ...operation, status: "failed", isError: true };
  }
  return { ...operation, status: "interrupted" };
}
