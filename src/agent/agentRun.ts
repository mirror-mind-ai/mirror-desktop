import type { AgentStreamEvent } from "./agentStream";

export type AgentRunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export type AgentRunState = {
  id?: string;
  status: AgentRunStatus;
  startedAt?: string;
  completedAt?: string;
  lastRequest?: {
    content: string;
    mode: "mock" | "live";
  };
  error?: string;
};

export const initialAgentRunState: AgentRunState = {
  status: "idle",
};

export function startAgentRun(input: {
  content: string;
  mode: "mock" | "live";
  now?: Date;
}): AgentRunState {
  const now = input.now ?? new Date();
  return {
    id: `agent-run-${now.toISOString()}`,
    status: "running",
    startedAt: now.toISOString(),
    lastRequest: {
      content: input.content,
      mode: input.mode,
    },
  };
}

export function completeAgentRun(run: AgentRunState, now: Date = new Date()): AgentRunState {
  if (run.status !== "running") {
    return run;
  }
  return {
    ...run,
    status: "completed",
    completedAt: now.toISOString(),
    error: undefined,
  };
}

export function failAgentRun(run: AgentRunState, error: string, now: Date = new Date()): AgentRunState {
  if (run.status !== "running") {
    return run;
  }
  return {
    ...run,
    status: "failed",
    completedAt: now.toISOString(),
    error,
  };
}

export function cancelAgentRun(run: AgentRunState, now: Date = new Date()): AgentRunState {
  if (run.status !== "running") {
    return run;
  }
  return {
    ...run,
    status: "cancelled",
    completedAt: now.toISOString(),
  };
}

export function reduceAgentRunFromStreamEvent(
  run: AgentRunState,
  event: AgentStreamEvent,
): AgentRunState {
  if (event.type === "cancelled") {
    return cancelAgentRun(run);
  }
  if (event.type === "error") {
    return failAgentRun(run, event.message);
  }
  if (event.type === "done" || (event.type === "run_status" && event.status === "completed")) {
    return completeAgentRun(run);
  }
  return run;
}

export function canRetryAgentRun(run: AgentRunState): boolean {
  return Boolean(run.lastRequest && (run.status === "failed" || run.status === "cancelled"));
}
