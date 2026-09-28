import { describe, expect, it } from "vitest";
import {
  deriveJourneyAgentStatus,
  JOURNEY_FINISHED_VISIBLE_MS,
  journeyAgentStatusLabel,
  journeyFinishedAttentionReducer,
  nextFinishedAttentionDeadline,
  type JourneyFinishedAttentionState,
} from "../app/journeyAgentStatus";

describe("Journey agent status attention", () => {
  it("derives working and finishing only from runtime ownership", () => {
    expect(deriveJourneyAgentStatus({ runtimePhase: "running" })).toBe("working");
    expect(deriveJourneyAgentStatus({ runtimePhase: "finalizing" })).toBe("finishing");
    expect(deriveJourneyAgentStatus({})).toBe("idle");
  });

  // CR080: a compaction is the agent working. It owns no run and writes no journal, so
  // runtime ownership cannot speak for it, yet the Journey is occupied for minutes and the
  // sidebar has to say so — otherwise the agent works hidden from the user.
  it("reports a compacting Journey as working even without a run", () => {
    expect(deriveJourneyAgentStatus({ compacting: true })).toBe("working");
    expect(deriveJourneyAgentStatus({ compacting: false })).toBe("idle");
  });

  it("lets a compaction outrank a stale finished badge", () => {
    const attention = { finishedAt: 1_000, acknowledgedAt: 1_000 };
    expect(deriveJourneyAgentStatus({ finishedAttention: attention })).toBe("finished");
    expect(deriveJourneyAgentStatus({ compacting: true, finishedAttention: attention })).toBe("working");
  });

  it("uses Ready as the human label for acknowledged completion", () => {
    expect(journeyAgentStatusLabel("idle")).toBe("Idle");
    expect(journeyAgentStatusLabel("working")).toBe("Working");
    expect(journeyAgentStatusLabel("finishing")).toBe("Finishing");
    expect(journeyAgentStatusLabel("finished")).toBe("Ready");
  });

  it("shows a finished turn immediately as acknowledged when its Journey is open", () => {
    const state = journeyFinishedAttentionReducer({}, {
      type: "run_finished", journeyId: "open", selected: true, at: 1_000,
    });
    expect(state.open).toEqual({ finishedAt: 1_000, acknowledgedAt: 1_000 });
    expect(deriveJourneyAgentStatus({ finishedAttention: state.open })).toBe("finished");
    expect(nextFinishedAttentionDeadline(state)).toBe(1_000 + JOURNEY_FINISHED_VISIBLE_MS);
  });

  it("keeps a finished turn until another Journey is opened", () => {
    let state: JourneyFinishedAttentionState = journeyFinishedAttentionReducer({}, {
      type: "run_finished", journeyId: "background", selected: false, at: 2_000,
    });
    state = journeyFinishedAttentionReducer(state, {
      type: "time_elapsed", at: 2_000 + JOURNEY_FINISHED_VISIBLE_MS * 4,
    });
    expect(state.background).toEqual({ finishedAt: 2_000, acknowledgedAt: undefined });
    state = journeyFinishedAttentionReducer(state, {
      type: "journey_selected", journeyId: "background", at: 30_000,
    });
    expect(state.background?.acknowledgedAt).toBe(30_000);
  });

  it("retires only acknowledged finished states after five seconds", () => {
    const state: JourneyFinishedAttentionState = {
      seen: { finishedAt: 1_000, acknowledgedAt: 2_000 },
      unseen: { finishedAt: 1_500 },
    };
    expect(journeyFinishedAttentionReducer(state, {
      type: "time_elapsed", at: 2_000 + JOURNEY_FINISHED_VISIBLE_MS - 1,
    })).toBe(state);
    const expired = journeyFinishedAttentionReducer(state, {
      type: "time_elapsed", at: 2_000 + JOURNEY_FINISHED_VISIBLE_MS,
    });
    expect(expired.seen).toBeUndefined();
    expect(expired.unseen).toEqual({ finishedAt: 1_500 });
  });

  it("lets a new run supersede stale finished attention", () => {
    const state = { one: { finishedAt: 1_000 } };
    expect(journeyFinishedAttentionReducer(state, { type: "run_started", journeyId: "one" })).toEqual({ one: undefined });
    expect(journeyFinishedAttentionReducer(state, { type: "run_started", journeyId: "other" })).toBe(state);
  });
});
