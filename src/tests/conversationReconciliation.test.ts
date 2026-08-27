import { describe, expect, it } from "vitest";
import {
  beginNautilusTurn,
  createConversationReconciliationState,
  observeHarnessTurnCommit,
  observeMirrorTurnCommit,
  observePiTurnCommit,
  parseConversationReconciliationState,
  type ReconciliationAuthority,
} from "../domain/conversationReconciliation";

const authority: ReconciliationAuthority = {
  journeyId: "nautilus-harness",
  harnessConversationId: "thread-1",
  piSessionId: "pi-1",
  mirrorConversationId: "mirror-1",
  generation: 1,
};

function pending() {
  return beginNautilusTurn(createConversationReconciliationState(authority, "2026-08-26T10:00:00Z"), {
    turnId: "turn-1", runId: "run-1", startedAt: "2026-08-26T10:00:01Z",
  });
}

function committed() {
  let state = pending();
  state = observePiTurnCommit(state, "turn-1", {
    userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
    entryCount: 2, sessionFile: "/pi/one.jsonl", committedAt: "2026-08-26T10:00:02Z",
  });
  state = observeHarnessTurnCommit(state, "turn-1", {
    userMessageId: "h-user", assistantMessageId: "h-assistant", messageCount: 2,
    committedAt: "2026-08-26T10:00:03Z",
  });
  return observeMirrorTurnCommit(state, "turn-1", {
    userMessageId: "m-user", assistantMessageId: "m-assistant", messageCount: 2,
    committedAt: "2026-08-26T10:00:04Z",
  });
}

describe("dedicated turn reconciliation", () => {
  it("starts uninitialized and becomes pending for one Nautilus turn", () => {
    expect(createConversationReconciliationState(authority, "now")).toMatchObject({ classification: "uninitialized", turns: [] });
    expect(pending()).toMatchObject({ classification: "commit_pending", turns: [{ origin: "nautilus", turnId: "turn-1" }] });
  });

  it("reaches in_sync only after all three dedicated bodies commit", () => {
    expect(committed()).toMatchObject({
      classification: "in_sync",
      checkpoints: {
        harness: { lastMessageId: "h-assistant" },
        pi: { leafEntryId: "pi-assistant", sessionFile: "/pi/one.jsonl" },
        mirror: { conversationId: "mirror-1", lastMessageId: "m-assistant" },
      },
    });
  });

  it("keeps duplicate native evidence idempotent and rejects contradiction", () => {
    const state = committed();
    expect(observePiTurnCommit(state, "turn-1", {
      userEntryId: "pi-user", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
      entryCount: 2, sessionFile: "/pi/one.jsonl", committedAt: "2026-08-26T10:00:02Z",
    })).toEqual(state);
    expect(observePiTurnCommit(state, "turn-1", {
      userEntryId: "other", assistantEntryId: "pi-assistant", leafEntryId: "pi-assistant",
      entryCount: 2, sessionFile: "/pi/one.jsonl", committedAt: "2026-08-26T10:00:05Z",
    })).toMatchObject({ classification: "conflicted", reasonCodes: ["native_id_mismatch"] });
  });

  it("parses only exact dedicated authority and Nautilus-origin turns", () => {
    const state = committed();
    expect(parseConversationReconciliationState(state, authority)).toEqual(state);
    expect(parseConversationReconciliationState(state, { ...authority, piSessionId: "other" })).toBeUndefined();
    const external = structuredClone(state) as unknown as { turns: Array<{ origin: string }> };
    external.turns[0].origin = "pi_external";
    expect(parseConversationReconciliationState(external, authority)).toBeUndefined();
  });
});
