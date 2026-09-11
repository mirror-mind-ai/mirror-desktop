import { describe, expect, it } from "vitest";
import { createTerminalAgentActionEvidence, selectExactTerminalAgentActionEvidence } from "../app/terminalAgentActionEvidence";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { createPersistedJourneyConversation, parsePersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";

function conversation() {
  const thread = readyThread("mirror-desktop");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  return {
    correlation,
    conversation: stageCorrelatedTurn(base, correlation,
      { id: "user-1", role: "user", content: "test", createdAt: "2026-09-11T00:00:00Z" },
      { id: "assistant-1", role: "assistant", content: "answer", createdAt: "2026-09-11T00:00:01Z" }),
  };
}

describe("terminal agent action evidence", () => {
  it("normalizes active runtime statuses before local persistence", () => {
    const { correlation } = conversation();
    const evidence = createTerminalAgentActionEvidence({
      correlation,
      projection: {
        status: "failed",
        operations: [{ id: "bash-1", name: "bash", status: "running", output: "\u001b[31mfailed\u001b[0m" }],
        reasoningSummaries: [{ id: "reasoning-1", content: "Checking", status: "streaming" }],
        activityOrder: [
          { type: "reasoning_summary", id: "reasoning-1" },
          { type: "operation", id: "bash-1" },
        ],
      },
    });

    expect(evidence.projection.operations[0]).toMatchObject({ status: "failed", output: "failed" });
    expect(evidence.projection.reasoningSummaries[0].status).toBe("interrupted");
  });

  it("lets durable settlement override an already terminal provider projection", () => {
    const { correlation } = conversation();
    const evidence = createTerminalAgentActionEvidence({
      correlation,
      terminalStatus: "cancelled",
      projection: { status: "completed", operations: [], reasoningSummaries: [], activityOrder: [] },
    });
    expect(evidence.projection.status).toBe("cancelled");
  });

  it("round-trips exact evidence and drops stale evidence without losing the conversation", () => {
    const { conversation: current, correlation } = conversation();
    const evidence = createTerminalAgentActionEvidence({
      correlation,
      projection: {
        status: "completed",
        operations: [{ id: "read-1", name: "read", status: "completed", output: "loaded" }],
        reasoningSummaries: [],
        activityOrder: [{ type: "operation", id: "read-1" }],
      },
    });
    const persisted = createPersistedJourneyConversation({
      ...current,
      terminalAgentActionEvidence: { "assistant-1": evidence },
    });
    expect(parsePersistedJourneyConversation(persisted)?.conversation.terminalAgentActionEvidence?.["assistant-1"]).toEqual(evidence);

    const stale = structuredClone(persisted);
    stale.conversation.terminalAgentActionEvidence!["assistant-1"].runId = "other-run";
    const parsed = parsePersistedJourneyConversation(stale);
    expect(parsed?.conversation.messages).toHaveLength(2);
    expect(parsed?.conversation.terminalAgentActionEvidence).toBeUndefined();
  });

  it("selects evidence only under exact conversation and turn authority", () => {
    const { conversation: current, correlation } = conversation();
    const evidence = createTerminalAgentActionEvidence({
      correlation,
      projection: { status: "completed", operations: [], reasoningSummaries: [], activityOrder: [] },
    });
    const withEvidence = { ...current, terminalAgentActionEvidence: { "assistant-1": evidence } };

    expect(selectExactTerminalAgentActionEvidence(withEvidence, "assistant-1")).toEqual(evidence);
    expect(selectExactTerminalAgentActionEvidence({ ...withEvidence, journeyId: "other" }, "assistant-1")).toBeUndefined();
  });
});
