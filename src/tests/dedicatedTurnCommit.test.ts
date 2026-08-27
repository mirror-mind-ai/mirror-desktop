import { describe, expect, it } from "vitest";
import { classifyDedicatedTurnState, dedicatedTurnBlocksNewInvocation, interruptDedicatedTurn } from "../domain/dedicatedTurnCommit";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { beginNautilusTurn, observeHarnessTurnCommit, observeMirrorTurnCommit, observePiTurnCommit } from "../domain/conversationReconciliation";
import { readyThread } from "./fixtures/readyThread";

function conversation() { return createDedicatedJourneyConversation({ thread: readyThread("journey-one"), initialMessages: [] }); }

describe("dedicated turn commit classifier", () => {
  it("is ready before the first turn", () => expect(classifyDedicatedTurnState(conversation())).toBe("ready"));

  it("blocks only unresolved active-pair checkpoints", () => {
    let value = conversation();
    value.reconciliation = beginNautilusTurn(value.reconciliation, { turnId: "turn-1", runId: "run-1", startedAt: "2026-08-26T10:00:00Z" });
    expect(classifyDedicatedTurnState(value)).toBe("failed");
    expect(classifyDedicatedTurnState(value, true)).toBe("provider_running");
    expect(dedicatedTurnBlocksNewInvocation("provider_running")).toBe(true);
    expect(dedicatedTurnBlocksNewInvocation("failed")).toBe(false);
    value.reconciliation = observePiTurnCommit(value.reconciliation, "turn-1", { userEntryId: "u", assistantEntryId: "a", leafEntryId: "a", entryCount: 2, committedAt: "2026-08-26T10:00:01Z" });
    expect(classifyDedicatedTurnState(value)).toBe("projection_pending");
    value.reconciliation = observeHarnessTurnCommit(value.reconciliation, "turn-1", { userMessageId: "hu", assistantMessageId: "ha", messageCount: 2, committedAt: "2026-08-26T10:00:02Z" });
    expect(classifyDedicatedTurnState(value)).toBe("mirror_pending");
    value.reconciliation = observeMirrorTurnCommit(value.reconciliation, "turn-1", { userMessageId: "mu", assistantMessageId: "ma", messageCount: 2, committedAt: "2026-08-26T10:00:03Z" });
    expect(classifyDedicatedTurnState(value)).toBe("ready");
    expect(dedicatedTurnBlocksNewInvocation("projection_pending")).toBe(true);
    expect(dedicatedTurnBlocksNewInvocation("mirror_pending")).toBe(true);
  });

  it("records an interrupted provider turn without permanently blocking the next send", () => {
    let value = conversation();
    value.reconciliation = beginNautilusTurn(value.reconciliation, { turnId: "turn-1", runId: "run-1", startedAt: "2026-08-26T10:00:00Z" });

    value = interruptDedicatedTurn(value, "turn-1", "provider_interrupted", "2026-08-26T10:00:01Z");

    expect(value.reconciliation.turns[0].pi).toEqual({ state: "failed", failureCode: "provider_interrupted" });
    expect(value.reconciliation.classification).toBe("commit_failed");
    expect(dedicatedTurnBlocksNewInvocation(classifyDedicatedTurnState(value))).toBe(false);
  });
});
