import { describe, expect, it } from "vitest";
import {
  appendPendingSteering,
  markSteeringDeliveredByQueueDeparture,
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
import { mapPiProcessEventToStreamEvents } from "../agent/piProcessStream";

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

function accepted(text: string, at: string) {
  const { conversation, authority } = fixture();
  const staged = appendPendingSteering(conversation, authority, text, new Date(at));
  return {
    authority,
    conversation: transitionSteering(staged.conversation, authority, staged.evidence.requestId, "accepted", new Date(at)),
    requestId: staged.evidence.requestId,
  };
}

/**
 * CR117: Pi reports its own steering queue. A correction it has handed to the model is spliced out
 * of that queue, so a departure is the first moment the correction is part of what the model was
 * given. That is the live signal; `applied` stays the end-of-run fact backed by a session entry,
 * because Pi only mints an entry id when it persists one.
 */
describe("CR117 — delivery observed from Pi's steering queue", () => {
  it("marks a correction delivered once it is no longer queued", () => {
    const { conversation, authority, requestId } = accepted("Focus on the first file", "2026-09-14T10:00:00Z");
    const next = markSteeringDeliveredByQueueDeparture(conversation, authority, [], new Date("2026-09-14T10:00:05Z"));
    const evidence = next.steeringEvidence?.find((item) => item.requestId === requestId);
    expect(evidence?.status).toBe("delivered");
    expect(evidence?.updatedAt).toBe("2026-09-14T10:00:05.000Z");
    // Delivery is not application: Pi has no entry id to give yet.
    expect(evidence?.piUserEntryId).toBeUndefined();
  });

  it("leaves a correction alone while it is still queued", () => {
    const { conversation, authority, requestId } = accepted("Still waiting", "2026-09-14T10:00:00Z");
    const next = markSteeringDeliveredByQueueDeparture(conversation, authority, ["Still waiting"]);
    expect(next.steeringEvidence?.find((item) => item.requestId === requestId)?.status).toBe("accepted");
    expect(next).toBe(conversation);
  });

  it("delivers only the correction that actually left the queue", () => {
    const { conversation, authority } = fixture();
    const one = appendPendingSteering(conversation, authority, "First", new Date("2026-09-14T10:00:00Z"));
    const two = appendPendingSteering(one.conversation, authority, "Second", new Date("2026-09-14T10:00:01Z"));
    let current = transitionSteering(two.conversation, authority, one.evidence.requestId, "accepted");
    current = transitionSteering(current, authority, two.evidence.requestId, "accepted");

    const next = markSteeringDeliveredByQueueDeparture(current, authority, ["Second"]);
    expect(next.steeringEvidence?.map((item) => [item.text, item.status])).toEqual([
      ["First", "delivered"],
      ["Second", "accepted"],
    ]);
  });

  it("delivers the earliest matching correction when the same text was sent twice", () => {
    const { conversation, authority } = fixture();
    const one = appendPendingSteering(conversation, authority, "Same", new Date("2026-09-14T10:00:00Z"));
    const two = appendPendingSteering(one.conversation, authority, "Same", new Date("2026-09-14T10:00:01Z"));
    let current = transitionSteering(two.conversation, authority, one.evidence.requestId, "accepted");
    current = transitionSteering(current, authority, two.evidence.requestId, "accepted");

    // Pi still holds one copy, so exactly one departure happened.
    const next = markSteeringDeliveredByQueueDeparture(current, authority, ["Same"]);
    expect(next.steeringEvidence?.map((item) => [item.sequence, item.status])).toEqual([
      [1, "delivered"],
      [2, "accepted"],
    ]);
  });

  it("reads absence from the queue, not presence of unrelated text", () => {
    const { conversation, authority, requestId } = accepted("Mine", "2026-09-14T10:00:00Z");
    const next = markSteeringDeliveredByQueueDeparture(conversation, authority, ["Someone else's"]);
    // Ours is absent from the queue, so ours departed. Unrelated text neither blocks nor causes it.
    expect(next.steeringEvidence?.find((item) => item.requestId === requestId)?.status).toBe("delivered");
  });

  it("never touches another run's corrections", () => {
    const { conversation, authority, requestId } = accepted("Mine", "2026-09-14T10:00:00Z");
    const foreign = { ...authority, runId: "run-2" };
    expect(() => markSteeringDeliveredByQueueDeparture(conversation, foreign, [])).toThrow("steering_authority_mismatch");
    expect(conversation.steeringEvidence?.find((item) => item.requestId === requestId)?.status).toBe("accepted");
  });

  it("does not resurrect a terminal correction", () => {
    const { conversation, authority, requestId } = accepted("Rejected one", "2026-09-14T10:00:00Z");
    const rejected = transitionSteering(conversation, authority, requestId, "rejected");
    const next = markSteeringDeliveredByQueueDeparture(rejected, authority, []);
    expect(next.steeringEvidence?.find((item) => item.requestId === requestId)?.status).toBe("rejected");
  });
});

describe("CR117 — delivered is not the end of the lifecycle", () => {
  it("still reaches applied at settlement, with exact Pi entry evidence", () => {
    const { conversation, authority, requestId } = accepted("Focus here", "2026-09-14T10:00:00Z");
    const delivered = markSteeringDeliveredByQueueDeparture(conversation, authority, []);
    const settled = reconcileSteeringUserEntries(delivered, authority, [
      { userEntryId: "steer-1", userText: "Focus here", recordedAt: "2026-09-14T10:00:06Z" },
    ]);
    const evidence = settled.steeringEvidence?.find((item) => item.requestId === requestId);
    expect(evidence?.status).toBe("applied");
    expect(evidence?.piUserEntryId).toBe("steer-1");
  });

  it("can end a run delivered but never applied, which is a real outcome", () => {
    const { conversation, authority, requestId } = accepted("Too late", "2026-09-14T10:00:00Z");
    const delivered = markSteeringDeliveredByQueueDeparture(conversation, authority, []);
    const settled = settleUnconsumedSteering(delivered, authority, "cancelled");
    const evidence = settled.steeringEvidence?.find((item) => item.requestId === requestId);
    expect(evidence?.status).toBe("terminally_unconsumed");
    expect(evidence?.terminalReason).toBe("cancelled");
  });

  it("refuses to call a delivered correction applied without entry evidence", () => {
    const { conversation, authority, requestId } = accepted("No evidence", "2026-09-14T10:00:00Z");
    const delivered = markSteeringDeliveredByQueueDeparture(conversation, authority, []);
    expect(() => transitionSteering(delivered, authority, requestId, "applied"))
      .toThrow("steering_application_evidence_required");
  });

  it("round-trips a delivered record through persistence", () => {
    const { conversation, authority, requestId } = accepted("Persist me", "2026-09-14T10:00:00Z");
    const delivered = markSteeringDeliveredByQueueDeparture(conversation, authority, []);
    const restored = parsePersistedJourneyConversation(createPersistedJourneyConversation(delivered));
    expect(restored?.conversation.steeringEvidence?.find((item) => item.requestId === requestId)?.status)
      .toBe("delivered");
  });
});

describe("CR117 — Pi's queue_update reaches the Desktop", () => {
  it("maps a steering queue update into a stream event", () => {
    const line = JSON.stringify({
      type: "queue_update",
      steering: ["Still waiting"],
      followUp: [],
    });
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      { type: "steering_queue", queued: ["Still waiting"] },
    ]);
  });

  it("reports an emptied queue, which is the delivery moment", () => {
    const line = JSON.stringify({ type: "queue_update", steering: [], followUp: ["later"] });
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([
      { type: "steering_queue", queued: [] },
    ]);
  });

  it("ignores a malformed queue rather than inventing a departure", () => {
    const line = JSON.stringify({ type: "queue_update", steering: "not-an-array" });
    expect(mapPiProcessEventToStreamEvents({ kind: "stdout", content: `${line}\n` })).toEqual([]);
  });
});
