import { describe, expect, it } from "vitest";
import {
  applyQueueDepartureToLiveEvidence,
  mergeLiveSteeringEvidence,
} from "../app/liveSteeringEvidence";
import {
  appendPendingSteering,
  markSteeringDeliveredByQueueDeparture,
  transitionSteering,
} from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";
import type { JourneyConversation, SteeringEvidence } from "../domain/journeyConversation";
import appSource from "../app/App.tsx?raw";

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
  const staged = appendPendingSteering(conversation, authority, "Focus on the first file", new Date("2026-09-14T10:00:00Z"));
  const accepted = transitionSteering(staged.conversation, authority, staged.evidence.requestId, "accepted");
  // What the ref holds while the run is alive, written by the send path.
  const live = accepted.steeringEvidence?.filter((item) => item.runId === authority.runId) ?? [];
  return { conversation: accepted, authority, live, requestId: staged.evidence.requestId };
}

function statusOf(conversation: JourneyConversation, requestId: string) {
  return conversation.steeringEvidence?.find((item) => item.requestId === requestId)?.status;
}

/**
 * CR117 homologation found a correction stuck on "queued" for the whole turn even though Pi had
 * reported the departure. The transition was being written to the run's conversation value and
 * then overwritten, on the very next statement, by the live ref that every run-conversation update
 * re-merges. These tests hold the rule that caused it.
 */
describe("CR117 — the live ref is the run's steering authority", () => {
  it("discards a transition written only to the run conversation", () => {
    const { conversation, authority, live, requestId } = fixture();

    // The shape of the original defect: transition the conversation, then merge the ref back.
    const transitioned = markSteeringDeliveredByQueueDeparture(conversation, authority, []);
    expect(statusOf(transitioned, requestId)).toBe("delivered");

    const merged = mergeLiveSteeringEvidence(transitioned, authority.runId, live);
    // The ref still said accepted, so the delivery is gone. This is what the Navigator saw.
    expect(statusOf(merged, requestId)).toBe("accepted");
  });

  it("keeps a transition written to the ref, which is what the merge republishes", () => {
    const { conversation, authority, live, requestId } = fixture();

    const nextLive = applyQueueDepartureToLiveEvidence(conversation, authority, live, []);
    const merged = mergeLiveSteeringEvidence(conversation, authority.runId, nextLive);

    expect(statusOf(merged, requestId)).toBe("delivered");
  });

  it("leaves the ref untouched while the correction is still queued", () => {
    const { conversation, authority, live } = fixture();
    expect(applyQueueDepartureToLiveEvidence(conversation, authority, live, ["Focus on the first file"]))
      .toBe(live);
  });

  it("survives a late event from a run whose authority has moved on", () => {
    const { conversation, authority, live } = fixture();
    const foreign = { ...authority, runId: "run-2" };
    expect(applyQueueDepartureToLiveEvidence(conversation, foreign, live, [])).toBe(live);
  });

  it("does nothing when the run carries no corrections", () => {
    const { conversation, authority } = fixture();
    expect(applyQueueDepartureToLiveEvidence(conversation, authority, [], [])).toEqual([]);
    expect(applyQueueDepartureToLiveEvidence(conversation, authority, undefined, [])).toBeUndefined();
  });

  it("merges nothing when the run has no live evidence at all", () => {
    const { conversation, authority } = fixture();
    expect(mergeLiveSteeringEvidence(conversation, authority.runId, undefined)).toBe(conversation);
  });

  it("replaces only this run's evidence, leaving other runs alone", () => {
    const { conversation, authority, live } = fixture();
    const foreignEvidence = {
      ...(live[0] as SteeringEvidence),
      requestId: "other-run-1",
      runId: "run-other",
    };
    const withForeign: JourneyConversation = {
      ...conversation,
      steeringEvidence: [...(conversation.steeringEvidence ?? []), foreignEvidence],
    };

    const merged = mergeLiveSteeringEvidence(withForeign, authority.runId, live);
    expect(merged.steeringEvidence?.filter((item) => item.runId === "run-other")).toHaveLength(1);
  });
});

describe("CR117 — the run loop uses the extracted rule", () => {
  it("routes a queue departure into the ref rather than the run conversation", () => {
    const handler = appSource.slice(
      appSource.indexOf('if (event.type === "steering_queue"'),
      appSource.indexOf('if (event.type === "raw_output")'),
    );
    expect(handler).toContain("applyQueueDepartureToLiveEvidence");
    expect(handler).toContain("steeringEvidenceByRunRef.current[runAuthority.runId] =");
    // The transition must not be applied to the conversation value, which the merge overwrites.
    expect(handler).not.toContain("markSteeringDeliveredByQueueDeparture");
  });

  it("keeps the merge itself in one place instead of inline in the run loop", () => {
    expect(appSource).toContain("mergeLiveSteeringEvidence(");
  });
});
