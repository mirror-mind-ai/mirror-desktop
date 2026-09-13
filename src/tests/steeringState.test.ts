import { describe, expect, it } from "vitest";
import {
  appendPendingSteering,
  applyNextAcceptedSteering,
  reconcileSteeringUserEntries,
  settleUnconsumedSteering,
  transitionSteering,
} from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";
import { createPersistedJourneyConversation, parsePersistedJourneyConversation } from "../domain/persistedJourneyConversation";

function fixture() {
  const thread = readyThread("journey-one");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const conversation = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "Start", createdAt: "2026-09-14T09:59:00Z" },
    { id: "assistant-1", role: "assistant", content: "", createdAt: "2026-09-14T09:59:00Z" },
  );
  const authority = createRunAuthority(correlation, base.liveIdentity, thread.generations[0]);
  return { conversation, authority };
}

describe("active turn Steering evidence", () => {
  it("appends bounded pending requests with stable FIFO identity", () => {
    const { conversation, authority } = fixture();
    const one = appendPendingSteering(conversation, authority, "Correct direction", new Date("2026-09-14T10:00:00Z"));
    const two = appendPendingSteering(one.conversation, authority, "Correct direction", new Date("2026-09-14T10:00:01Z"));

    expect(one.evidence.sequence).toBe(1);
    expect(two.evidence.sequence).toBe(2);
    expect(two.evidence.requestId).not.toBe(one.evidence.requestId);
    expect(two.conversation.steeringEvidence?.map((item) => item.text)).toEqual(["Correct direction", "Correct direction"]);
  });

  it("requires exact authority and legal evidence transitions", () => {
    const { conversation, authority } = fixture();
    const pending = appendPendingSteering(conversation, authority, "Use the safer route", new Date("2026-09-14T10:00:00Z"));
    const accepted = transitionSteering(pending.conversation, authority, pending.evidence.requestId, "accepted", new Date("2026-09-14T10:00:01Z"));

    expect(accepted.steeringEvidence?.[0].status).toBe("accepted");
    expect(() => transitionSteering(accepted, { ...authority, runId: "stale" }, pending.evidence.requestId, "applied")).toThrow("steering_authority_mismatch");
    expect(() => transitionSteering(accepted, authority, pending.evidence.requestId, "pending")).toThrow("steering_transition_invalid");
  });

  it("applies duplicate text in accepted FIFO order only", () => {
    const { conversation, authority } = fixture();
    const first = appendPendingSteering(conversation, authority, "Same", new Date("2026-09-14T10:00:00Z"));
    const second = appendPendingSteering(first.conversation, authority, "Same", new Date("2026-09-14T10:00:01Z"));
    let current = transitionSteering(second.conversation, authority, first.evidence.requestId, "accepted");
    current = transitionSteering(current, authority, second.evidence.requestId, "accepted");

    current = applyNextAcceptedSteering(current, authority, "Same", "pi-user-2", new Date("2026-09-14T10:00:02Z"));

    expect(current.steeringEvidence?.map((item) => [item.sequence, item.status, item.piUserEntryId])).toEqual([
      [1, "applied", "pi-user-2"],
      [2, "accepted", undefined],
    ]);
  });

  it("applies every authoritative Steering user entry even when only the last continuation completes", () => {
    const { conversation, authority } = fixture();
    const first = appendPendingSteering(conversation, authority, "First correction", new Date("2026-09-14T10:00:00Z"));
    const second = appendPendingSteering(first.conversation, authority, "Second correction", new Date("2026-09-14T10:00:01Z"));
    let current = transitionSteering(second.conversation, authority, first.evidence.requestId, "accepted");
    current = transitionSteering(current, authority, second.evidence.requestId, "accepted");

    current = settleUnconsumedSteering(current, authority, "settled_without_application");
    current = reconcileSteeringUserEntries(current, authority, [
      { userEntryId: "pi-user-1", userText: "First correction", recordedAt: "2026-09-14T10:00:02Z" },
      { userEntryId: "pi-user-2", userText: "Second correction", recordedAt: "2026-09-14T10:00:03Z" },
    ]);

    expect(current.steeringEvidence?.map((item) => [item.status, item.piUserEntryId, item.terminalReason])).toEqual([
      ["applied", "pi-user-1", undefined],
      ["applied", "pi-user-2", undefined],
    ]);
  });

  it("round-trips bounded exact Steering evidence in the additive conversation schema", () => {
    const { conversation, authority } = fixture();
    const pending = appendPendingSteering(conversation, authority, "Persist this", new Date("2026-09-14T10:00:00Z"));
    const accepted = transitionSteering(pending.conversation, authority, pending.evidence.requestId, "accepted");

    const persisted = createPersistedJourneyConversation(accepted, new Date("2026-09-14T10:00:02Z"));
    const restored = parsePersistedJourneyConversation(JSON.parse(JSON.stringify(persisted)));

    expect(persisted.schemaVersion).toBe("0.9.0");
    expect(restored?.conversation.steeringEvidence).toEqual(accepted.steeringEvidence);
  });

  it("terminalizes pending and accepted requests without claiming application", () => {
    const { conversation, authority } = fixture();
    const pending = appendPendingSteering(conversation, authority, "One");
    const accepted = appendPendingSteering(pending.conversation, authority, "Two");
    const current = transitionSteering(accepted.conversation, authority, accepted.evidence.requestId, "accepted");

    const settled = settleUnconsumedSteering(current, authority, "process_died", new Date("2026-09-14T10:00:03Z"));

    expect(settled.steeringEvidence?.map((item) => item.status)).toEqual(["terminally_unconsumed", "terminally_unconsumed"]);
    expect(settled.steeringEvidence?.every((item) => item.terminalReason === "process_died")).toBe(true);
  });
});
