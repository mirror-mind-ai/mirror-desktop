import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

export const JOURNEY_FINISHED_VISIBLE_MS = 5_000;

export type JourneyAgentStatus =
  | "idle"
  | "working"
  | "finishing"
  | "finished"
  | "interrupted"
  | "failed";

/**
 * CR102: the two durable outcomes the sidebar used to swallow into Idle. They are kept apart
 * because stopping is the Navigator's choice and failing is not, so they do not deserve the same
 * register.
 */
export type JourneyTurnOutcome = "interrupted" | "failed";

const journeyAgentStatusLabels: Record<JourneyAgentStatus, string> = {
  idle: "Idle",
  working: "Working",
  finishing: "Finishing",
  finished: "Ready",
  interrupted: "Interrupted",
  failed: "Failed",
};

export function journeyAgentStatusLabel(status: JourneyAgentStatus): string {
  return journeyAgentStatusLabels[status];
}

export type JourneyFinishedAttention = {
  finishedAt: number;
  acknowledgedAt?: number;
};

export type JourneyFinishedAttentionState = Record<string, JourneyFinishedAttention | undefined>;

export type JourneyFinishedAttentionAction =
  | { type: "run_started"; journeyId: string }
  | { type: "run_finished"; journeyId: string; selected: boolean; at: number }
  | { type: "journey_selected"; journeyId: string; at: number }
  | { type: "time_elapsed"; at: number };

export function journeyFinishedAttentionReducer(
  state: JourneyFinishedAttentionState,
  action: JourneyFinishedAttentionAction,
): JourneyFinishedAttentionState {
  if (action.type === "run_started") {
    if (!state[action.journeyId]) return state;
    return { ...state, [action.journeyId]: undefined };
  }
  if (action.type === "run_finished") {
    return {
      ...state,
      [action.journeyId]: {
        finishedAt: action.at,
        acknowledgedAt: action.selected ? action.at : undefined,
      },
    };
  }
  if (action.type === "journey_selected") {
    const attention = state[action.journeyId];
    if (!attention || attention.acknowledgedAt !== undefined) return state;
    return { ...state, [action.journeyId]: { ...attention, acknowledgedAt: action.at } };
  }
  let changed = false;
  const next = { ...state };
  for (const [journeyId, attention] of Object.entries(state)) {
    if (attention?.acknowledgedAt !== undefined
      && action.at - attention.acknowledgedAt >= JOURNEY_FINISHED_VISIBLE_MS) {
      next[journeyId] = undefined;
      changed = true;
    }
  }
  return changed ? next : state;
}

export function deriveJourneyAgentStatus(input: {
  runtimePhase?: JourneyRuntimeOwnerPhase;
  finishedAttention?: JourneyFinishedAttention;
  /**
   * CR080: a compaction is the agent working, but it owns no run and writes no journal, so
   * runtime ownership cannot speak for it. The Journey is occupied for minutes either way,
   * and a status that stayed idle would hide that work from the reader.
   */
  compacting?: boolean;
  /**
   * CR102: the previous run's durable outcome, read from the turn journal. It is reported last,
   * because it describes what already happened: live work and a fresh arrival are both newer news.
   */
  turnOutcome?: JourneyTurnOutcome;
}): JourneyAgentStatus {
  if (input.compacting) return "working";
  if (input.runtimePhase === "running") return "working";
  if (input.runtimePhase === "finalizing") return "finishing";
  if (input.finishedAttention) return "finished";
  return input.turnOutcome ?? "idle";
}

export function nextFinishedAttentionDeadline(
  state: JourneyFinishedAttentionState,
): number | undefined {
  let next: number | undefined;
  for (const attention of Object.values(state)) {
    if (attention?.acknowledgedAt === undefined) continue;
    const deadline = attention.acknowledgedAt + JOURNEY_FINISHED_VISIBLE_MS;
    if (next === undefined || deadline < next) next = deadline;
  }
  return next;
}
