import { describe, expect, it } from "vitest";
import { createHydratedReconciliationState } from "../domain/conversationReconciliation";
import { createJourneyConversation } from "../domain/journeyConversation";
import {
  mirrorMessagesForHarness,
  projectMirrorConversationInspection,
  type MirrorConversationInspection,
} from "../domain/mirrorOnlyReconciliation";

function conversation() {
  const value = createJourneyConversation({
    journeyId: "journey-a",
    initialMessages: [
      { id: "local-user", role: "user", content: "before", createdAt: "2026-08-25T10:00:00Z" },
      { id: "local-assistant", role: "assistant", content: "answer", createdAt: "2026-08-25T10:01:00Z" },
    ],
    now: new Date("2026-08-25T10:00:00Z"),
  });
  value.liveIdentity = { ...value.liveIdentity, mirrorConversationId: "mirror-a" };
  value.reconciliation = createHydratedReconciliationState(value.liveIdentity, {
    harness: { lastMessageId: "local-assistant", lastTurnId: "hydration", messageCount: 2 },
    pi: { leafEntryId: "pi-leaf", entryCount: 4, sessionFile: "/sessions/a.jsonl" },
    mirror: { conversationId: "mirror-a", lastMessageId: "mirror-base", messageCount: 2 },
    establishedAt: "2026-08-25T10:01:00Z",
  });
  return value;
}

function inspection(overrides: Partial<MirrorConversationInspection> = {}): MirrorConversationInspection {
  return {
    status: "advanced",
    journeyId: "journey-a",
    conversationId: "mirror-a",
    baseMessageId: "mirror-base",
    baseMessageCount: 2,
    fingerprint: { conversationId: "mirror-a", messageCount: 4, lastMessageId: "mirror-assistant", updatedAt: "2026-08-25T11:01:00Z" },
    messages: [
      { id: "mirror-user", role: "user", content: "new fact", createdAt: "2026-08-25T11:00:00Z" },
      { id: "mirror-assistant", role: "assistant", content: "accepted", createdAt: "2026-08-25T11:01:00Z" },
    ],
    ...overrides,
  };
}

describe("Mirror-only reconciliation", () => {
  it("records an eligible complete Mirror tail without changing visible messages", () => {
    const current = conversation();
    const result = projectMirrorConversationInspection(current, inspection(), "2026-08-25T11:02:00Z");

    expect(result.review).toMatchObject({ status: "eligible", completeTurnCount: 1 });
    expect(result.conversation.messages).toEqual(current.messages);
    expect(result.conversation.reconciliation).toMatchObject({
      classification: "mirror_advanced",
      advancement: { mirror: { baseMessageId: "mirror-base", lastMessageId: "mirror-assistant", messageCount: 4 } },
    });
  });

  it("keeps unchanged and incomplete tails quiet and unpersisted", () => {
    const current = conversation();
    expect(projectMirrorConversationInspection(current, inspection({ status: "unchanged", messages: undefined }), "now"))
      .toEqual({ conversation: current, changed: false });
    const waiting = projectMirrorConversationInspection(current, inspection({
      fingerprint: { conversationId: "mirror-a", messageCount: 3, lastMessageId: "mirror-user" },
      messages: [inspection().messages![0]],
    }), "now");
    expect(waiting).toMatchObject({ conversation: current, changed: false, review: { status: "waiting" } });
  });

  it.each([
    [{ role: "system" }, "unsupported_mirror_record"],
    [{ content: "" }, "unsupported_mirror_record"],
    [{ content: "partial\n[… truncated]" }, "unsupported_mirror_record"],
    [{ content: "part one\n\n---\n\npart two" }, "unsupported_mirror_record"],
    [{ boundaryTruncated: true }, "unsupported_mirror_record"],
  ])("blocks unsupported Mirror records %#", (messageOverride, reasonCode) => {
    const value = inspection();
    value.messages![1] = { ...value.messages![1], ...messageOverride };
    const result = projectMirrorConversationInspection(conversation(), value, "now");
    expect(result.review).toMatchObject({ status: "unsupported", reasonCode });
    expect(result.conversation.reconciliation.classification).toBe("mirror_advanced");
  });

  it("rejects stale authority, cursor regression, and independent Pi advancement", () => {
    expect(projectMirrorConversationInspection(conversation(), inspection({ conversationId: "other" }), "now").conflictCode)
      .toBe("authority_mismatch");
    expect(projectMirrorConversationInspection(conversation(), inspection({
      fingerprint: { conversationId: "mirror-a", messageCount: 1, lastMessageId: "older" },
      messages: [],
    }), "now").conflictCode).toBe("mirror_cursor_mismatch");
    const piAdvanced = conversation();
    piAdvanced.reconciliation.advancement.pi = {
      generation: 0, baseLeafEntryId: "pi-leaf", leafEntryId: "pi-new", observedEntryIds: ["pi-new"],
      ancestorEntryIds: ["pi-leaf", "pi-new"], entryCount: 5, observedAt: "now",
    };
    piAdvanced.reconciliation.classification = "pi_advanced";
    expect(projectMirrorConversationInspection(piAdvanced, inspection(), "now").review)
      .toMatchObject({ status: "independent", reasonCode: "independent_pi_advancement" });
  });

  it("recognizes only native correlated duplicate evidence", () => {
    const current = conversation();
    current.reconciliation.turns.push({
      turnId: "turn-1", runId: "run-1", origin: "nautilus", startedAt: "before",
      harness: { state: "committed", userMessageId: "local-user", assistantMessageId: "local-assistant" },
      pi: { state: "committed" },
      mirror: { state: "committed", userMessageId: "mirror-user", assistantMessageId: "mirror-assistant" },
    });
    const value = inspection();
    value.messages = value.messages!.map((message, index) => ({
      ...message,
      correlation: {
        turnId: "turn-1", phase: index === 0 ? "user" : "assistant", generation: 0,
        piSessionId: "nautilus-journey-a", harnessMessageId: index === 0 ? "local-user" : "local-assistant",
      },
    }));
    expect(projectMirrorConversationInspection(current, value, "now").review?.status).toBe("duplicate");
    expect(projectMirrorConversationInspection(conversation(), inspection(), "now").review?.status).toBe("eligible");
  });

  it("derives deterministic inert Harness messages from native Mirror ids", () => {
    expect(mirrorMessagesForHarness(inspection().messages!)).toEqual([
      { id: "mirror-mirror-user", role: "user", content: "new fact", createdAt: "2026-08-25T11:00:00Z" },
      { id: "mirror-mirror-assistant", role: "assistant", content: "accepted", createdAt: "2026-08-25T11:01:00Z" },
    ]);
  });
});
