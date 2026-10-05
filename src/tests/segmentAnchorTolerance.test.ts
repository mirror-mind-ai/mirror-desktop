import { describe, expect, it } from "vitest";
import type { JourneyConversation } from "../domain/journeyConversation";
import type { ConversationSegment, ConversationSegmentManifest } from "../domain/conversationSegments";
import { partitionConversationBySegments } from "../domain/conversationSegmentProjection";
import tauriSource from "../../src-tauri/src/main.rs?raw";

// CR118: production shape. A Journey's durable turn ledger was truncated from the front by the
// pre-CR114 Segment publication overwrite, while its manifest kept anchors written when the ledger
// still reached back. The partition's only tolerance was for a leading gap, so an unresolvable
// anchor sitting after a resolvable one made every settlement throw.

function conversationWithTurns(turnNumbers: readonly number[]): JourneyConversation {
  const turns = turnNumbers.map((number) => ({
    turnId: `turn-${number}`, runId: `run-${number}`, origin: "nautilus" as const,
    startedAt: `2026-09-01T00:00:0${number}.000Z`,
    harness: {
      state: "committed" as const,
      userMessageId: `user-${number}`,
      assistantMessageId: `assistant-${number}`,
    },
    pi: { state: "committed" as const, userEntryId: `pi-user-${number}`, assistantEntryId: `pi-assistant-${number}` },
    mirror: { state: "committed" as const },
  }));
  return {
    id: "nautilus-thread-mirror-desktop", journeyId: "mirror-desktop", createdAt: "2026-09-01T00:00:00.000Z",
    messages: turnNumbers.flatMap((number) => [
      { id: `user-${number}`, role: "user" as const, content: `u${number}`, createdAt: "2026-09-01T00:00:00.000Z" },
      { id: `assistant-${number}`, role: "assistant" as const, content: `a${number}`, createdAt: "2026-09-01T00:00:01.000Z" },
    ]),
    liveIdentity: {
      schemaVersion: "0.1.0", journeyId: "mirror-desktop", harnessConversationId: "nautilus-thread-mirror-desktop",
      piSessionId: "pi-session-g4", generation: 4, origin: "new",
    },
    reconciliation: {
      schemaVersion: "0.1.0",
      authority: {
        journeyId: "mirror-desktop", harnessConversationId: "nautilus-thread-mirror-desktop",
        piSessionId: "pi-session-g4", generation: 4,
      },
      checkpoints: {}, turns, classification: "in_sync",
      classifiedAt: "2026-09-01T00:00:02.000Z", reasonCodes: [],
    },
  };
}

/** `anchor` is the turn id a Segment claims; `undefined` means the refresh found no turn in range. */
function manifestOf(anchors: readonly (string | undefined)[]): ConversationSegmentManifest {
  const segments: ConversationSegment[] = anchors.map((anchor, index) => {
    const isCurrent = index === anchors.length - 1;
    return {
      segment: index + 1,
      segmentId: `segment-${index + 1}`,
      status: isCurrent ? "current" : "closed",
      sourceFromEntryId: `entry-from-${index + 1}`,
      sourceThroughEntryId: `entry-through-${index + 1}`,
      ...(isCurrent ? {} : {
        retainedTailFromEntryId: `entry-tail-${index + 1}`,
        compactionEntryId: `entry-compaction-${index + 1}`,
      }),
      ...(anchor ? { firstTurnId: anchor, lastTurnId: anchor } : {}),
    };
  });
  return {
    schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "nautilus-thread-mirror-desktop",
    generation: 4, piSessionId: "pi-session-g4", sourceEntryCount: 8356, segments,
  };
}

const turnIdsOf = (conversation: JourneyConversation) => conversation.reconciliation.turns.map((turn) => turn.turnId);

describe("CR118: a Segment anchored outside the ledger it can see", () => {
  it("partitions the production shape instead of throwing, whatever the anchor's position", () => {
    // Segments 1-3 lost their anchors when the ledger shrank; 4 and 5 still name a turn that is gone;
    // the current Segment names a turn the ledger still has.
    const conversation = conversationWithTurns([8, 9]);
    const manifest = manifestOf([undefined, undefined, undefined, "turn-1", "turn-1", "turn-8"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(projections.map((projection) => projection.segmentId)).toEqual(["segment-6"]);
    expect(turnIdsOf(projections[0]!.conversation)).toEqual(["turn-8", "turn-9"]);
  });

  it("never offers a Segment whose anchor the ledger cannot resolve", () => {
    const conversation = conversationWithTurns([8, 9]);
    const manifest = manifestOf([undefined, "turn-1", "turn-2", "turn-8"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    // Republishing an unresolvable Segment as an empty projection would contradict the file that
    // still holds its history, so it must be omitted rather than returned empty.
    expect(projections.map((projection) => projection.segmentId)).toEqual(["segment-4"]);
  });

  it("keeps the leading-gap tolerance that bounded Segment loading introduced", () => {
    const conversation = conversationWithTurns([1, 2, 3]);
    const manifest = manifestOf(["turn-missing", "turn-1", "turn-3"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(projections.map((projection) => projection.segmentId)).toEqual(["segment-2", "segment-3"]);
    expect(turnIdsOf(projections[0]!.conversation)).toEqual(["turn-1", "turn-2"]);
    expect(turnIdsOf(projections[1]!.conversation)).toEqual(["turn-3"]);
  });

  it("treats a closed Segment with no anchor between two anchored ones as empty, not as corruption", () => {
    const conversation = conversationWithTurns([1, 2, 3]);
    const manifest = manifestOf(["turn-1", undefined, "turn-3"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(projections.map((projection) => projection.segmentId)).toEqual(["segment-1", "segment-2", "segment-3"]);
    expect(turnIdsOf(projections[0]!.conversation)).toEqual(["turn-1", "turn-2"]);
    expect(turnIdsOf(projections[1]!.conversation)).toEqual([]);
    expect(turnIdsOf(projections[2]!.conversation)).toEqual(["turn-3"]);
  });

  it("gives trailing unanchored closed Segments an empty range rather than the whole history", () => {
    const conversation = conversationWithTurns([1, 2]);
    const manifest = manifestOf(["turn-1", undefined, undefined, "turn-2"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(projections.map((projection) => turnIdsOf(projection.conversation))).toEqual([
      ["turn-1"], [], [], ["turn-2"],
    ]);
  });

  it("still returns the current Segment when its own anchor is unresolvable", () => {
    // Degrading to an empty current Segment keeps settlement alive; throwing here would reinstate
    // the defect this CR exists to remove, and the caller cannot publish an empty bundle.
    const conversation = conversationWithTurns([1, 2]);
    const manifest = manifestOf(["turn-1", "turn-gone"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    expect(projections.map((projection) => projection.segmentId)).toEqual(["segment-2"]);
    expect(turnIdsOf(projections[0]!.conversation)).toEqual([]);
  });

  it("still throws when resolvable anchors are genuinely out of order", () => {
    const conversation = conversationWithTurns([1, 2, 3]);
    const manifest = manifestOf(["turn-3", "turn-1"]);
    expect(() => partitionConversationBySegments(conversation, manifest))
      .toThrowError("Conversation Segment turn range is invalid.");
  });

  it("assigns every turn exactly once across the Segments it returns", () => {
    const conversation = conversationWithTurns([1, 2, 3, 4, 5]);
    const manifest = manifestOf([undefined, "turn-gone", "turn-1", undefined, "turn-4"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    const assigned = projections.flatMap((projection) => turnIdsOf(projection.conversation));
    expect(assigned).toEqual(["turn-1", "turn-2", "turn-3", "turn-4", "turn-5"]);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("keeps messages consistent with the turns each returned Segment owns", () => {
    const conversation = conversationWithTurns([1, 2, 3]);
    const manifest = manifestOf(["turn-gone", "turn-1", "turn-3"]);
    const projections = partitionConversationBySegments(conversation, manifest);
    for (const projection of projections) {
      const owned = new Set(turnIdsOf(projection.conversation).flatMap((turnId) => {
        const number = turnId.replace("turn-", "");
        return [`user-${number}`, `assistant-${number}`];
      }));
      expect(projection.conversation.messages.map((message) => message.id).sort())
        .toEqual([...owned].sort());
    }
  });
});

// CR120: the production shape that destroyed a chapter. A compaction's retained tail is deliberately
// shared between the chapter that closes and the one that opens, and the native refresh picks
// `firstTurnId` as the first turn whose entry falls in the chapter's range, so two adjacent chapters
// can legitimately resolve to one turn. Nothing requires anchors to be distinct, and five of the
// store's fourteen manifests carry the shape.
//
// This pins the end-to-end behaviour rather than only the decision function, because CR118 shipped a
// correct domain rule with a wrong native wiring and that is how `segment-30` lost 22 messages.
describe("CR120: two adjacent chapters sharing one anchor", () => {
  it("gives the earlier chapter an empty slice and the later one the turns", () => {
    const conversation = conversationWithTurns([1, 2, 3, 4, 5]);
    // segment-1 and segment-2 share turn-1, exactly as production's segment-29 and segment-30 do.
    const manifest = manifestOf(["turn-1", "turn-1", "turn-3", "turn-5"]);
    const projections = partitionConversationBySegments(conversation, manifest);

    expect(projections.map((projection) => projection.segmentId))
      .toEqual(["segment-1", "segment-2", "segment-3", "segment-4"]);
    // The earlier of the two is handed nothing. Its published file is the only copy of its history.
    expect(turnIdsOf(projections[0]!.conversation)).toEqual([]);
    expect(projections[0]!.conversation.messages).toEqual([]);
    // The later one owns the turns up to the next anchor.
    expect(turnIdsOf(projections[1]!.conversation)).toEqual(["turn-1", "turn-2"]);
    expect(turnIdsOf(projections[2]!.conversation)).toEqual(["turn-3", "turn-4"]);
    expect(turnIdsOf(projections[3]!.conversation)).toEqual(["turn-5"]);
  });

  it("is the shape that reaches the publisher on every compaction, not a rare one", () => {
    // Two chapters sharing an anchor, and a third unanchored: the earlier chapters are offered
    // empty while their files hold the history. CR118's skip rule is what keeps that harmless, so
    // it is load-bearing rather than defensive.
    const conversation = conversationWithTurns([1, 2, 3]);
    const projections = partitionConversationBySegments(
      conversation,
      manifestOf([undefined, "turn-1", "turn-1", "turn-3"]),
    );
    expect(projections.map((projection) => turnIdsOf(projection.conversation)))
      .toEqual([[], [], ["turn-1", "turn-2"], ["turn-3"]]);
  });

  it("makes the native publisher judge emptiness before the prior-current exemption", () => {
    // The wiring half. An empty slice only stays harmless if the publisher refuses to write it, and
    // the exemption for the chapter that was current must not reach a chapter supplied with nothing.
    const decision = tauriSource.slice(
      tauriSource.indexOf("fn closed_segment_publication_decision"),
      tauriSource.indexOf("fn published_chapter_is_empty"),
    );
    expect(decision).toContain('if status != "closed" || !file_exists {');
    expect(decision.indexOf("if message_count == 0 {"))
      .toBeLessThan(decision.indexOf("if was_prior_current {"));
    // and the exemption must still exist, or a chapter closing with content would be verified
    // against the shorter file it had while current
    expect(decision).toContain("if was_prior_current {");
  });

  it("heals an empty published file instead of refusing to publish over it", () => {
    expect(tauriSource).toContain("if published_chapter_is_empty(&published) {");
    expect(tauriSource).toContain("Could not durably heal an empty Conversation Segment.");
    // A chapter that holds messages is still immutable.
    expect(tauriSource).toContain("Immutable Conversation Segment projection diverged.");
  });
});
