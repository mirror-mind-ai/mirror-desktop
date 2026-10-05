import { describe, expect, it } from "vitest";
import {
  projectPiBackedConversationSurface,
  type PiConversationSurfaceInspection,
} from "../domain/piBackedConversationSurface";
import {
  createJourneyConversation,
  type JourneyConversation,
  type SteeringEvidence,
} from "../domain/journeyConversation";
import { createPersistedJourneyConversation } from "../domain/persistedJourneyConversation";
import { buildConversationTranscriptIndex } from "../app/conversationTranscriptModel";

function conversation(): JourneyConversation {
  const base = createJourneyConversation({
    journeyId: "journey-a",
    initialMessages: [],
    now: new Date("2026-09-18T10:00:00Z"),
  });
  return {
    ...base,
    id: "thread-a",
    liveIdentity: {
      schemaVersion: "0.1.0",
      journeyId: "journey-a",
      harnessConversationId: "thread-a",
      piSessionId: "session-a",
      piSessionFile: "/safe/session-a.jsonl",
      mirrorConversationId: "mirror-a",
      activationReceiptActivatedAt: "2026-09-18T09:00:00Z",
      generation: 1,
      origin: "new",
    },
    reconciliation: {
      ...base.reconciliation,
      authority: {
        journeyId: "journey-a",
        harnessConversationId: "thread-a",
        piSessionId: "session-a",
        generation: 1,
        mirrorConversationId: "mirror-a",
      },
    },
  };
}

const inspection = (entries: PiConversationSurfaceInspection["entries"]): PiConversationSurfaceInspection =>
  ({ schemaVersion: "0.1.0", entries });

function correction(overrides: Partial<SteeringEvidence> = {}): SteeringEvidence {
  return {
    schemaVersion: "0.1.0",
    requestId: "req-1",
    sequence: 1,
    journeyId: "journey-a",
    generation: 1,
    runId: "run-1",
    turnId: "turn-1",
    assistantMessageId: "a1",
    // The real production shape: the raw correction text, no Journey authority envelope.
    text: "Altere só local, sem deploy",
    status: "applied",
    createdAt: "2026-09-18T10:01:30Z",
    updatedAt: "2026-09-18T10:01:31Z",
    piUserEntryId: "corr-1",
    ...overrides,
  };
}

// A turn that completed after being corrected: Pi recorded the request, the correction and the
// answer, and the harness committed both bodies.
function completedAfterCorrection(evidence: SteeringEvidence[] = [correction()]): JourneyConversation {
  const base = conversation();
  return {
    ...base,
    steeringEvidence: evidence,
    reconciliation: {
      ...base.reconciliation,
      turns: [{
        turnId: "turn-1",
        runId: "run-1",
        origin: "nautilus",
        startedAt: "2026-09-18T10:01:00Z",
        harness: { state: "committed", userMessageId: "u1", assistantMessageId: "a1" },
        // The production shape, verified across all eight real corrections: the turn's recorded
        // request entry is the *correction*, not the request. So the correction currently wears the
        // request's harness identity and the request becomes an anonymous extra message.
        pi: { state: "committed", userEntryId: "corr-1", assistantEntryId: "ans-1" },
        mirror: { state: "committed" },
      }],
    },
  };
}

const correctedCompletedEntries = inspection([
  { entryId: "req-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
  { entryId: "corr-1", role: "user", visibleText: "Altere só local, sem deploy", timestamp: "2026-09-18T10:01:30Z" },
  { entryId: "ans-1", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:02:00Z" },
]);

describe("CR097 slice 3: a restored correction is not a request", () => {
  it("leaves a claimed Pi user entry out of the transcript entirely", () => {
    const result = projectPiBackedConversationSurface(completedAfterCorrection(), correctedCompletedEntries);
    // Live, a correction is never a message — it lives only in steering evidence and is drawn
    // inside the run it corrected. After reload it must be the same thing, not a second question.
    expect(result.messages.map((message) => message.id)).toEqual(["u1", "a1"]);
    expect(result.messages.some((message) => message.content.includes("Altere só local"))).toBe(false);
  });

  it("keeps the correction's own text and status, which is where they already lived", () => {
    const result = projectPiBackedConversationSurface(completedAfterCorrection(), correctedCompletedEntries);
    const index = buildConversationTranscriptIndex(result);
    const attached = index.steeringByAssistantMessageId.get("a1");
    expect(attached).toHaveLength(1);
    expect(attached?.[0]?.text).toBe("Altere só local, sem deploy");
    expect(attached?.[0]?.status).toBe("applied");
  });

  it("never rewrites the durable steering record it read", () => {
    const metadata = completedAfterCorrection();
    const before = JSON.stringify(metadata.steeringEvidence);
    const result = projectPiBackedConversationSurface(metadata, correctedCompletedEntries);
    expect(JSON.stringify(metadata.steeringEvidence)).toBe(before);
    // Re-pointing assistantMessageId here would be persisted by the next save, which is the
    // read-path-rejection-becomes-write-path-deletion shape the settlement model records as §5b.
    expect(result.steeringEvidence?.[0]?.assistantMessageId).toBe("a1");
  });
});

describe("CR097 slice 2: a correction is not a run boundary", () => {
  // The run was cancelled after being corrected, so its identity comes from the turn record. If the
  // correction opens a run, the window used to recognise the turn starts at the correction and the
  // request it belongs to is no longer matched.
  const cancelledEntries = inspection([
    { entryId: "req-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
    {
      entryId: "work-1",
      role: "assistant",
      visibleText: "",
      timestamp: "2026-09-18T10:01:10Z",
      nativeContent: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "a.ts" } }],
    },
    { entryId: "corr-1", role: "user", visibleText: "Altere só local, sem deploy", timestamp: "2026-09-18T10:01:30Z" },
    {
      entryId: "work-2",
      role: "assistant",
      visibleText: "",
      timestamp: "2026-09-18T10:01:40Z",
      nativeContent: [{ type: "toolCall", id: "call-2", name: "read", arguments: { path: "b.ts" } }],
    },
  ]);

  function cancelledAfterCorrection(evidence: SteeringEvidence[] = [correction()]): JourneyConversation {
    const base = conversation();
    return {
      ...base,
      steeringEvidence: evidence,
      reconciliation: {
        ...base.reconciliation,
        turns: [{
          turnId: "turn-1",
          runId: "run-1",
          origin: "nautilus",
          startedAt: "2026-09-18T10:00:50Z",
          harness: { state: "committed", userMessageId: "u1", assistantMessageId: "a1" },
          pi: { state: "failed", failureCode: "pi_invocation_cancelled" },
          mirror: { state: "pending" },
        }],
      },
    };
  }

  it("still matches the cancelled run to its own turn record", () => {
    const result = projectPiBackedConversationSurface(cancelledAfterCorrection(), cancelledEntries);
    // CR089's identity: the request carries the turn's own harness message id rather than a
    // reconstructed one.
    expect(result.messages[0]?.id).toBe("u1");
    expect(result.messages[0]?.content).toBe("Question");
  });

  it("keeps every operation of the corrected run as one interrupted run", () => {
    const result = projectPiBackedConversationSurface(cancelledAfterCorrection(), cancelledEntries);
    const projections = Object.values(result.reconstructedAgentActions ?? {});
    const operations = projections.flatMap((projection) => projection.operations);
    // Both tool calls belong to the same corrected run; a correction splitting it would strand the
    // second one in a run with no turn record.
    expect(operations).toHaveLength(2);
    expect(projections.every((projection) => projection.status === "cancelled")).toBe(true);
  });

  it("gives the correction somewhere to live when the run it corrected was cancelled", () => {
    const result = projectPiBackedConversationSurface(cancelledAfterCorrection(), cancelledEntries);
    const anchor = result.correctionAnchors?.a1;
    expect(anchor).toBeTruthy();
    expect(result.messages.some((message) => message.id === anchor)).toBe(true);
    // The transcript then attaches it there, because the harness assistant message a cancelled run
    // never produced is not in the transcript to attach to.
    const index = buildConversationTranscriptIndex(result);
    expect(index.steeringByAssistantMessageId.get(anchor!)).toHaveLength(1);
  });

  it("keeps a correction's chronological place, so a later run still finds its own record", () => {
    const base = cancelledAfterCorrection();
    const withSecondTurn: JourneyConversation = {
      ...base,
      reconciliation: {
        ...base.reconciliation,
        turns: [...base.reconciliation.turns, {
          turnId: "turn-2",
          runId: "run-2",
          origin: "nautilus",
          startedAt: "2026-09-18T10:01:50Z",
          harness: { state: "committed", userMessageId: "u2", assistantMessageId: "a2" },
          pi: { state: "failed", failureCode: "pi_invocation_cancelled" },
          mirror: { state: "pending" },
        }],
      },
    };
    const result = projectPiBackedConversationSurface(withSecondTurn, inspection([
      ...cancelledEntries.entries,
      { entryId: "req-2", role: "user", visibleText: "Second question", timestamp: "2026-09-18T10:02:00Z" },
    ]));
    // turn-2 started after the correction. The window for the second request opens at the entry
    // before it — the correction — so dropping the correction from the timeline would widen that
    // window back over turn-1 and let the second request borrow the first run's record.
    const second = result.messages.find((message) => message.content === "Second question");
    expect(second?.id).toBe("u2");
    expect(result.messages.find((message) => message.content === "Question")?.id).toBe("u1");
  });
});

describe("CR097 slice 2: a claim that cannot be trusted is refused", () => {
  it("refuses both claims when two corrections name the same Pi entry", () => {
    const result = projectPiBackedConversationSurface(
      completedAfterCorrection([
        correction({ requestId: "req-a", sequence: 1 }),
        correction({ requestId: "req-b", sequence: 2, text: "other" }),
      ]),
      correctedCompletedEntries,
    );
    // Ambiguity is refused rather than guessed, and refusing falls all the way back to today's
    // behaviour: the turn's own binding stands, so `u1` keeps the correction and the request stays
    // anonymous. That is still wrong, but it is the wrong we already had — and everything is
    // visible. Honouring an untrustworthy claim would hide a message instead.
    expect(result.messages.map((message) => message.id)).toEqual(["pi-req-1", "u1", "a1"]);
  });

  it("refuses a claim on an entry another turn records as its request", () => {
    const base = completedAfterCorrection([correction({ turnId: "turn-9" })]);
    const result = projectPiBackedConversationSurface(base, correctedCompletedEntries);
    // Cross-turn is the real ambiguity: the entry belongs to turn-1 and the claim comes from a
    // correction that says it belongs to turn-9. Refused, so the entry keeps its binding.
    expect(result.messages.map((message) => message.id)).toEqual(["pi-req-1", "u1", "a1"]);
  });

  it("ignores a correction that never reached Pi as an entry", () => {
    const { piUserEntryId: _dropped, ...withoutClaim } = correction();
    const result = projectPiBackedConversationSurface(
      completedAfterCorrection([withoutClaim as SteeringEvidence]),
      correctedCompletedEntries,
    );
    // No claim, nothing to act on, and nothing changed.
    expect(result.messages.map((message) => message.id)).toEqual(["pi-req-1", "u1", "a1"]);
  });
});

describe("CR097: the request takes its own identity back", () => {
  it("gives the harness request identity to the request, not to the correction", () => {
    const result = projectPiBackedConversationSurface(completedAfterCorrection(), correctedCompletedEntries);
    const request = result.messages.find((message) => message.content === "Question");
    // Before this, `u1` carried the correction text and the request was an anonymous `pi-req-1`,
    // which is what made the conversation read as a second, unanswered question.
    expect(request?.id).toBe("u1");
    expect(result.messages.map((message) => message.id)).toEqual(["u1", "a1"]);
  });

  it("finds the request by position when the recorded entry was the correction", () => {
    // Two corrections on one turn: the request is still the last user entry before the answer
    // that is not itself a correction.
    const metadata = completedAfterCorrection([
      correction({ requestId: "r1", sequence: 1, piUserEntryId: "corr-1" }),
      correction({ requestId: "r2", sequence: 2, piUserEntryId: "corr-2", text: "e sem tocar o deploy" }),
    ]);
    const result = projectPiBackedConversationSurface(metadata, inspection([
      { entryId: "req-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
      { entryId: "corr-1", role: "user", visibleText: "Altere só local, sem deploy", timestamp: "2026-09-18T10:01:30Z" },
      { entryId: "corr-2", role: "user", visibleText: "e sem tocar o deploy", timestamp: "2026-09-18T10:01:40Z" },
      { entryId: "ans-1", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:02:00Z" },
    ]));
    expect(result.messages.map((message) => message.id)).toEqual(["u1", "a1"]);
    expect(result.messages[0]?.content).toBe("Question");
  });
});

describe("CR097 slice 4: the ordinary case is untouched", () => {
  it("leaves an unclaimed Pi user entry as the request it is", () => {
    const base = conversation();
    const result = projectPiBackedConversationSurface(base, inspection([
      { entryId: "req-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
      { entryId: "ans-1", role: "assistant", visibleText: "Answer", timestamp: "2026-09-18T10:01:02Z" },
      { entryId: "req-2", role: "user", visibleText: "Unanswered but admitted", timestamp: "2026-09-18T10:02:00Z" },
    ]));
    expect(result.messages.map((message) => message.id))
      .toEqual(["pi-req-1", "pi-ans-1", "pi-req-2"]);
  });

  it("adds no correction anchor when nothing was corrected", () => {
    const result = projectPiBackedConversationSurface(conversation(), inspection([
      { entryId: "req-1", role: "user", visibleText: "Question", timestamp: "2026-09-18T10:01:00Z" },
    ]));
    expect(result.correctionAnchors).toBeUndefined();
  });

  it("derives the anchor map and never persists it", () => {
    const result = projectPiBackedConversationSurface(completedAfterCorrection(), correctedCompletedEntries);
    const persisted = createPersistedJourneyConversation({ ...result, correctionAnchors: { a1: "anchor-1" } });
    expect("correctionAnchors" in persisted.conversation).toBe(false);
    // The durable steering record is persisted, because that is the evidence this CR depends on.
    expect(persisted.conversation.steeringEvidence?.[0]?.piUserEntryId).toBe("corr-1");
  });

  it("does not mutate the conversation it was given", () => {
    const metadata = completedAfterCorrection();
    const before = JSON.stringify(metadata);
    projectPiBackedConversationSurface(metadata, correctedCompletedEntries);
    expect(JSON.stringify(metadata)).toBe(before);
  });
});
