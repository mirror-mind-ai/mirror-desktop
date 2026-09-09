import { describe, expect, it } from "vitest";
import { deriveComposerTurnStatus } from "../app/composerTurnStatus";

describe("Composer turn status", () => {
  it("shows Working only while the selected agent is executing", () => {
    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: true,
      isStreaming: true,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: false,
      mirrorRepairPending: false,
    })).toBe("working");

  });

  it("replaces Working with Finishing through routine post-answer release", () => {
    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: true,
      isStreaming: false,
      isFinalizingTurn: true,
      reconciliationBlocksInvocation: true,
      mirrorRepairPending: false,
    })).toBe("finishing");

    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: true,
      isStreaming: false,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: true,
      mirrorRepairPending: false,
    })).toBe("finishing");
  });

  it("becomes silent when the GUI is released", () => {
    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: true,
      isStreaming: false,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: false,
      mirrorRepairPending: false,
    })).toBeUndefined();

  });

  it("does not project a completed run into a newly selected Journey", () => {
    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: false,
      isStreaming: false,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: false,
      mirrorRepairPending: false,
    })).toBeUndefined();
  });

  it("defers to explicit failure and repair surfaces", () => {
    expect(deriveComposerTurnStatus({
      agentRunStatus: "completed",
      runBelongsToSelectedJourney: true,
      isStreaming: false,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: true,
      mirrorRepairPending: true,
    })).toBeUndefined();

    expect(deriveComposerTurnStatus({
      agentRunStatus: "failed",
      runBelongsToSelectedJourney: true,
      isStreaming: false,
      isFinalizingTurn: false,
      reconciliationBlocksInvocation: false,
      mirrorRepairPending: false,
    })).toBeUndefined();
  });
});
