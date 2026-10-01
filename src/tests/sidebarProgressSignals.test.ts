import { describe, expect, it } from "vitest";
import {
  deriveJourneyAgentStatus,
  journeyAgentStatusLabel,
  type JourneyAgentStatus,
} from "../app/journeyAgentStatus";
import { deriveJourneyTurnOutcome, type TurnJournalRecord } from "../app/turnJournal";

function record(overrides: Partial<TurnJournalRecord> = {}): TurnJournalRecord {
  return {
    schemaVersion: "0.1.0",
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "journey-a",
      runId: "run-1",
      turnId: "turn-1",
      threadId: "thread-a",
      generation: 1,
      piSessionId: "pi-a",
      mirrorConversationId: "mirror-a",
      harnessUserMessageId: "user-1",
      harnessAssistantMessageId: "assistant-1",
    },
    phase: "terminal_durable",
    terminalOutcome: "completed",
    terminalEvidence: {
      capturedAt: "2026-09-01T20:00:00.000Z",
      piExecution: {
        userEntryId: "pi-user-1",
        assistantEntryId: "pi-assistant-1",
        leafEntryId: "pi-assistant-1",
        entryCount: 2,
        assistantText: "answer",
        assistantTextTruncated: false,
        startedAt: "2026-09-01T19:59:59.000Z",
        committedAt: "2026-09-01T20:00:00.000Z",
      },
    },
    cancellationIntent: "none",
    recoveryDisposition: "resume_projection",
    revision: 3,
    createdAt: "2026-09-01T19:59:58.000Z",
    updatedAt: "2026-09-01T20:00:00.000Z",
    lastReceipt: null,
    ...overrides,
  };
}

function withRun(runId: string, overrides: Partial<TurnJournalRecord>): TurnJournalRecord {
  const base = record(overrides);
  return { ...base, authority: { ...base.authority, runId } };
}

// CR102: interruption and failure are read from the turn journal rather than stored again. The
// journal already decides these outcomes for recovery, so the sidebar reuses that authority instead
// of inventing a parallel one.
describe("Journey turn outcome derivation", () => {
  it("says nothing when there is no journal to read", () => {
    expect(deriveJourneyTurnOutcome([], "journey-a")).toBeUndefined();
  });

  it("reads a clean completion as no outcome to report", () => {
    expect(deriveJourneyTurnOutcome([record()], "journey-a")).toBeUndefined();
  });

  // The Navigator chose to stop. That is not a fault, so it is named separately from failure.
  it("reads a cancelled run as interrupted", () => {
    expect(deriveJourneyTurnOutcome([record({ terminalOutcome: "cancelled" })], "journey-a"))
      .toBe("interrupted");
  });

  it.each(["spawn_failed", "process_died"] as const)("reads %s as failed", (terminalOutcome) => {
    expect(deriveJourneyTurnOutcome([record({ terminalOutcome })], "journey-a")).toBe("failed");
  });

  // A record still sitting in a pre-terminal phase is a run that never settled — exactly what an
  // app restart leaves behind. The journal's own recovery decision already calls this an
  // interruption, so the sidebar agrees with it rather than reporting nothing.
  it.each(["admitted", "running", "interrupted"] as const)(
    "reads an unsettled %s phase as interrupted",
    (phase) => {
      expect(deriveJourneyTurnOutcome([record({ phase, terminalOutcome: null })], "journey-a"))
        .toBe("interrupted");
    },
  );

  it("never invents an outcome from a durable phase that carries none", () => {
    expect(deriveJourneyTurnOutcome([record({ phase: "settled", terminalOutcome: null })], "journey-a"))
      .toBeUndefined();
  });

  it("lets the latest run supersede an earlier outcome in both directions", () => {
    const failedThenClean = [
      withRun("run-1", { terminalOutcome: "process_died" }),
      withRun("run-2", { terminalOutcome: "completed" }),
    ];
    expect(deriveJourneyTurnOutcome(failedThenClean, "journey-a")).toBeUndefined();

    const cleanThenFailed = [
      withRun("run-1", { terminalOutcome: "completed" }),
      withRun("run-2", { terminalOutcome: "cancelled" }),
    ];
    expect(deriveJourneyTurnOutcome(cleanThenFailed, "journey-a")).toBe("interrupted");
  });

  it("ignores records belonging to another Journey", () => {
    const foreign = record({ terminalOutcome: "process_died" });
    const records = [{ ...foreign, authority: { ...foreign.authority, journeyId: "journey-b" } }];
    expect(deriveJourneyTurnOutcome(records, "journey-a")).toBeUndefined();
  });
});

describe("Journey agent status with interruption and failure", () => {
  it("names the two new states for a reader", () => {
    expect(journeyAgentStatusLabel("interrupted")).toBe("Interrupted");
    expect(journeyAgentStatusLabel("failed")).toBe("Failed");
  });

  it("reports a durable outcome once nothing is running", () => {
    expect(deriveJourneyAgentStatus({ turnOutcome: "interrupted" })).toBe("interrupted");
    expect(deriveJourneyAgentStatus({ turnOutcome: "failed" })).toBe("failed");
  });

  // Live work outranks a durable outcome: the outcome describes the previous run, and the Journey is
  // busy now. Reporting the old failure while the agent works would be stale.
  it.each([
    [{ runtimePhase: "running" as const }, "working"],
    [{ runtimePhase: "finalizing" as const }, "finishing"],
    [{ compacting: true }, "working"],
  ])("lets live work outrank a stored failure (%o)", (live, expected) => {
    expect(deriveJourneyAgentStatus({ ...live, turnOutcome: "failed" })).toBe(expected as JourneyAgentStatus);
  });

  // A fresh successful arrival outranks it too, so a Journey that just finished cleanly never
  // flashes the previous run's failure.
  it("lets a fresh completion outrank a stored failure", () => {
    expect(deriveJourneyAgentStatus({
      finishedAttention: { finishedAt: 1_000, acknowledgedAt: 1_000 },
      turnOutcome: "failed",
    })).toBe("finished");
  });

  it("still falls back to idle when nothing at all is known", () => {
    expect(deriveJourneyAgentStatus({})).toBe("idle");
  });
});
