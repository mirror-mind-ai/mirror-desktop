import { describe, expect, it, vi } from "vitest";
import { resolvePersistedSettlementRecovery } from "../app/journeySettlementRecovery";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { applyPiExecutionEvidence, createMirrorAppendOutboxItem } from "../domain/mirrorAppendOutbox";
import { createJourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { commitHarnessTurn, stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function fixture() {
  const thread = readyThread("journey-a");
  let projection = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-a1", "turn-a1", "user-a1", "assistant-a1");
  projection = stageCorrelatedTurn(projection, correlation,
    { id: "user-a1", role: "user", content: "hello", createdAt: "2026-09-01T10:00:00Z" },
    { id: "assistant-a1", role: "assistant", content: "hi", createdAt: "2026-09-01T10:00:01Z" },
  );
  projection = applyPiExecutionEvidence(projection, correlation, {
    userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
    entryCount: 2, sessionFile: projection.liveIdentity.piSessionFile!, committedAt: "2026-09-01T10:00:02Z",
  });
  projection = commitHarnessTurn(projection, correlation, "2026-09-01T10:00:03Z");
  const authority = createJourneySettlementAuthority(createRunAuthority(correlation, projection.liveIdentity));
  const item = createMirrorAppendOutboxItem(projection, authority);
  const outbox = {
    schemaVersion: "1.0.0" as const, itemId: item.itemId, journeyId: item.journeyId,
    threadId: item.threadId, generation: item.generation, conversationId: item.conversationId,
    createdAt: item.createdAt,
  };
  return { projection, outbox };
}

describe("persisted settlement restart recovery", () => {
  it("recovers an exact inactive-generation outbox without activating a generation or child", () => {
    const { projection, outbox } = fixture();
    const startProvider = vi.fn();
    const activateGeneration = vi.fn();
    const recovered = resolvePersistedSettlementRecovery(projection, outbox);
    expect(recovered.status).toBe("ready");
    if (recovered.status === "ready") {
      expect(recovered.authority.generation).toBe(1);
      expect(recovered.authority.turnId).toBe("turn-a1");
    }
    expect(startProvider).not.toHaveBeenCalled();
    expect(activateGeneration).not.toHaveBeenCalled();
  });

  it("fails closed with bounded diagnostics when projection evidence is missing or contradictory", () => {
    const { projection, outbox } = fixture();
    expect(resolvePersistedSettlementRecovery(undefined, outbox)).toEqual({
      status: "blocked", journeyId: "journey-a", diagnostic: "settlement_recovery_evidence_missing",
    });
    expect(resolvePersistedSettlementRecovery(projection, { ...outbox, generation: 2 })).toEqual({
      status: "blocked", journeyId: "journey-a", diagnostic: "settlement_authority_mismatch",
    });
    expect(JSON.stringify(resolvePersistedSettlementRecovery(undefined, outbox))).not.toContain("piSessionFile");
  });
});
