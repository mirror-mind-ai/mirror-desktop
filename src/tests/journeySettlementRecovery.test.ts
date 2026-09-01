import { describe, expect, it, vi } from "vitest";
import {
  resolveCommittedLeaseBeforeInvocation,
  resolvePersistedSettlementRecovery,
  resolveRetainedLeaseForOutboxRecovery,
} from "../app/journeySettlementRecovery";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { applyPiExecutionEvidence, createMirrorAppendOutboxItem } from "../domain/mirrorAppendOutbox";
import { createJourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { commitHarnessTurn, stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function fixture(journeyId = "journey-a", runId = "run-a1") {
  const thread = readyThread(journeyId);
  let projection = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(
    thread,
    runId,
    `turn-${runId}`,
    `user-${runId}`,
    `assistant-${runId}`,
  );
  projection = stageCorrelatedTurn(projection, correlation,
    { id: `user-${runId}`, role: "user", content: "hello", createdAt: "2026-09-01T10:00:00Z" },
    { id: `assistant-${runId}`, role: "assistant", content: "hi", createdAt: "2026-09-01T10:00:01Z" },
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
  return { projection, outbox, authority };
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
      expect(recovered.authority.turnId).toBe("turn-run-a1");
    }
    expect(startProvider).not.toHaveBeenCalled();
    expect(activateGeneration).not.toHaveBeenCalled();
  });

  it("recovers two Journey outboxes independently without provider or generation activation", () => {
    const a = fixture("journey-a", "run-a1");
    const b = fixture("journey-b", "run-b1");
    const startProvider = vi.fn();
    const activateGeneration = vi.fn();

    const recovered = [a, b].map(({ projection, outbox }) => (
      resolvePersistedSettlementRecovery(projection, outbox)
    ));

    expect(recovered.map((result) => result.status)).toEqual(["ready", "ready"]);
    expect(recovered.map((result) => (
      result.status === "ready" ? result.authority.journeyId : result.journeyId
    ))).toEqual(["journey-a", "journey-b"]);
    expect(startProvider).not.toHaveBeenCalled();
    expect(activateGeneration).not.toHaveBeenCalled();
  });

  it("selects only an exact finalizing native lease for durable outbox cleanup", () => {
    const { authority } = fixture();
    const exactLease = {
      authority: {
        schemaVersion: "0.1.0" as const,
        journeyId: authority.journeyId,
        runId: authority.runId,
        turnId: authority.turnId,
        threadId: authority.threadId,
        generation: authority.generation,
        piSessionId: authority.piSessionId,
        mirrorConversationId: authority.mirrorConversationId,
        harnessUserMessageId: authority.harnessUserMessageId,
        harnessAssistantMessageId: authority.harnessAssistantMessageId,
      },
      leasePhase: "finalizing" as const,
      processCapacityState: "released" as const,
      cancellationState: "none" as const,
      terminalState: "completed" as const,
    };
    const inspection = {
      schemaVersion: "0.1.0" as const,
      limit: 2 as const,
      processCapacityInUse: 0,
      entries: [exactLease],
    };

    expect(resolveRetainedLeaseForOutboxRecovery(inspection, authority)).toEqual(exactLease);
    expect(resolveRetainedLeaseForOutboxRecovery({
      ...inspection,
      entries: [{ ...exactLease, authority: { ...exactLease.authority, runId: "replacement-run" } }],
    }, authority)).toBeNull();
    expect(resolveRetainedLeaseForOutboxRecovery({
      ...inspection,
      entries: [{ ...exactLease, leasePhase: "running", processCapacityState: "running", terminalState: "open" }],
      processCapacityInUse: 1,
    }, authority)).toBeNull();
  });

  it("releases only the exact committed completed lease before another invocation", () => {
    const { projection, authority } = fixture();
    const committedProjection = {
      ...projection,
      reconciliation: {
        ...projection.reconciliation,
        turns: projection.reconciliation.turns.map((turn) => ({
          ...turn,
          mirror: { state: "committed" as const, userMessageId: authority.harnessUserMessageId,
            assistantMessageId: authority.harnessAssistantMessageId, committedAt: "2026-09-01T10:00:04Z" },
        })),
      },
    };
    const lease = {
      authority: {
        schemaVersion: "0.1.0" as const, journeyId: authority.journeyId, runId: authority.runId,
        turnId: authority.turnId, threadId: authority.threadId, generation: authority.generation,
        piSessionId: authority.piSessionId, mirrorConversationId: authority.mirrorConversationId,
        harnessUserMessageId: authority.harnessUserMessageId,
        harnessAssistantMessageId: authority.harnessAssistantMessageId,
      },
      leasePhase: "finalizing" as const, processCapacityState: "released" as const,
      cancellationState: "none" as const, terminalState: "completed" as const,
    };
    const inspection = { schemaVersion: "0.1.0" as const, limit: 2, processCapacityInUse: 0, entries: [lease] };

    expect(resolveCommittedLeaseBeforeInvocation(inspection, committedProjection)).toEqual(lease);
    expect(resolveCommittedLeaseBeforeInvocation({
      ...inspection,
      entries: [{ ...lease, authority: { ...lease.authority, runId: "stale-run" } }],
    }, committedProjection)).toBeNull();
    expect(resolveCommittedLeaseBeforeInvocation(inspection, projection)).toBeNull();
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
