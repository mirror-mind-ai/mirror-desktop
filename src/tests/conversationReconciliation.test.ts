import { describe, expect, it } from "vitest";
import nativeBodyEvidence from "./fixtures/reconciliation/native-body-evidence.json";
import {
  beginNautilusTurn,
  bindMirrorConversation,
  createConversationReconciliationState,
  createHydratedReconciliationState,
  markTurnBodyFailed,
  observeExternalMirrorAdvancement,
  observeExternalPiAdvancement,
  observeHarnessTurnCommit,
  observeMirrorTurnCommit,
  observePiTurnCommit,
  parseConversationReconciliationState,
  resetReconciliationAuthority,
  type ReconciliationAuthority,
} from "../domain/conversationReconciliation";

const authority: ReconciliationAuthority = {
  journeyId: "nautilus-harness",
  harnessConversationId: "journey-conversation-nautilus-harness",
  piSessionId: "nautilus-nautilus-harness",
  generation: 2,
  mirrorConversationId: "mirror-conversation-1",
};
const at = "2026-08-24T10:00:00.000Z";

function committedState() {
  let state = beginNautilusTurn(createConversationReconciliationState(authority, at), {
    turnId: "turn-1",
    runId: "run-1",
    startedAt: at,
  });
  state = observeHarnessTurnCommit(state, "turn-1", {
    userMessageId: "h-user-1",
    assistantMessageId: "h-assistant-1",
    messageCount: 2,
    committedAt: "2026-08-24T10:00:01.000Z",
  });
  state = observePiTurnCommit(state, "turn-1", {
    userEntryId: "pi-user-1",
    assistantEntryId: "pi-assistant-1",
    leafEntryId: "pi-assistant-1",
    entryCount: 2,
    sessionFile: "session-1.jsonl",
    committedAt: "2026-08-24T10:00:02.000Z",
  });
  return observeMirrorTurnCommit(state, "turn-1", {
    userMessageId: "mirror-user-1",
    assistantMessageId: "mirror-assistant-1",
    messageCount: 2,
    committedAt: "2026-08-24T10:00:03.000Z",
  });
}

describe("three-body conversation reconciliation", () => {
  it("characterizes independent native ids instead of correlating equal-looking records by text", () => {
    expect(nativeBodyEvidence.harness.messages[0].id).toBe("h-user-1");
    expect(nativeBodyEvidence.pi.entries[0].id).toBe("pi-user-1");
    expect(nativeBodyEvidence.mirror.messages[0].id).toBe("mirror-user-1");
    expect(new Set([
      nativeBodyEvidence.harness.messages[0].id,
      nativeBodyEvidence.pi.entries[0].id,
      nativeBodyEvidence.mirror.messages[0].id,
    ]).size).toBe(3);
  });

  it("starts fresh without claiming that any body is synchronized", () => {
    const state = createConversationReconciliationState(authority, at);

    expect(state).toMatchObject({
      schemaVersion: "0.1.0",
      authority,
      classification: "uninitialized",
      turns: [],
      checkpoints: {},
    });
  });

  it("binds a newly discovered Mirror conversation without guessing it", () => {
    const withoutMirror = { ...authority, mirrorConversationId: undefined };
    const pending = beginNautilusTurn(createConversationReconciliationState(withoutMirror, at), {
      turnId: "turn-1",
      runId: "run-1",
      startedAt: at,
    });
    const bound = bindMirrorConversation(pending, "mirror-discovered", at);

    expect(pending.classification).toBe("commit_pending");
    expect(bound.authority.mirrorConversationId).toBe("mirror-discovered");
    expect(bound.classification).toBe("commit_pending");
  });

  it("correlates one Nautilus turn across all three bodies independent of observation order", () => {
    const state = committedState();

    expect(state.classification).toBe("in_sync");
    expect(state.turns).toHaveLength(1);
    expect(state.turns[0]).toMatchObject({
      turnId: "turn-1",
      runId: "run-1",
      origin: "nautilus",
      harness: { state: "committed", userMessageId: "h-user-1" },
      pi: { state: "committed", assistantEntryId: "pi-assistant-1" },
      mirror: { state: "committed", assistantMessageId: "mirror-assistant-1" },
    });
    expect(state.checkpoints.pi?.leafEntryId).toBe("pi-assistant-1");
    expect(state.checkpoints.mirror?.lastMessageId).toBe("mirror-assistant-1");
  });

  it("makes repeated native observations idempotent", () => {
    const initial = committedState();
    const repeated = observeMirrorTurnCommit(initial, "turn-1", {
      userMessageId: "mirror-user-1",
      assistantMessageId: "mirror-assistant-1",
      messageCount: 2,
      committedAt: "2026-08-24T10:00:03.000Z",
    });

    expect(repeated).toEqual(initial);
  });

  it("keeps Pi-committed and Mirror-pending or failed turns honest", () => {
    let state = beginNautilusTurn(createConversationReconciliationState(authority, at), {
      turnId: "turn-1",
      runId: "run-1",
      startedAt: at,
    });
    state = observeHarnessTurnCommit(state, "turn-1", {
      userMessageId: "h-user-1",
      assistantMessageId: "h-assistant-1",
      messageCount: 2,
      committedAt: at,
    });
    state = observePiTurnCommit(state, "turn-1", {
      userEntryId: "pi-user-1",
      assistantEntryId: "pi-assistant-1",
      leafEntryId: "pi-assistant-1",
      entryCount: 2,
      committedAt: at,
    });

    expect(state.classification).toBe("commit_pending");

    const failed = markTurnBodyFailed(state, "turn-1", "mirror", "mirror_write_failed", at);
    expect(failed.classification).toBe("commit_failed");
    expect(failed.turns[0].mirror).toEqual({ state: "failed", failureCode: "mirror_write_failed" });
  });

  it("classifies same-generation descendant Pi activity separately", () => {
    const state = observeExternalPiAdvancement(committedState(), {
      generation: 2,
      sessionFile: "session-1.jsonl",
      baseLeafEntryId: "pi-assistant-1",
      leafEntryId: "pi-assistant-2",
      observedEntryIds: ["pi-user-2", "pi-assistant-2"],
      ancestorEntryIds: ["pi-assistant-1", "pi-user-2"],
      entryCount: 4,
      observedAt: at,
    });

    expect(state.classification).toBe("pi_advanced");
    expect(state.advancement.pi?.leafEntryId).toBe("pi-assistant-2");
  });

  it("treats equivalent native advancement evidence as idempotent regardless of object key order", () => {
    const initial = committedState();
    const advanced = observeExternalPiAdvancement(initial, {
      generation: 2,
      baseLeafEntryId: "pi-assistant-1",
      leafEntryId: "pi-assistant-2",
      observedEntryIds: ["pi-user-2", "pi-assistant-2"],
      ancestorEntryIds: ["pi-assistant-1", "pi-user-2"],
      entryCount: 4,
      observedAt: at,
    });
    const repeated = observeExternalPiAdvancement(advanced, {
      observedAt: at,
      entryCount: 4,
      ancestorEntryIds: ["pi-assistant-1", "pi-user-2"],
      observedEntryIds: ["pi-user-2", "pi-assistant-2"],
      leafEntryId: "pi-assistant-2",
      baseLeafEntryId: "pi-assistant-1",
      generation: 2,
    });

    expect(repeated).toBe(advanced);
  });

  it("rejects unrelated Pi ancestry and stale generations as conflicts", () => {
    const unrelated = observeExternalPiAdvancement(committedState(), {
      generation: 2,
      baseLeafEntryId: "another-leaf",
      leafEntryId: "pi-assistant-2",
      observedEntryIds: ["pi-assistant-2"],
      ancestorEntryIds: ["another-leaf"],
      entryCount: 3,
      observedAt: at,
    });
    const stale = observeExternalPiAdvancement(committedState(), {
      generation: 1,
      baseLeafEntryId: "pi-assistant-1",
      leafEntryId: "pi-assistant-2",
      observedEntryIds: ["pi-assistant-2"],
      ancestorEntryIds: ["pi-assistant-1"],
      entryCount: 3,
      observedAt: at,
    });

    expect(unrelated.classification).toBe("conflicted");
    expect(unrelated.reasonCodes).toContain("pi_ancestry_mismatch");
    expect(stale.reasonCodes).toContain("generation_mismatch");
  });

  it("classifies Mirror-only and independent two-body advancement without merging", () => {
    const mirrorAdvanced = observeExternalMirrorAdvancement(committedState(), {
      conversationId: "mirror-conversation-1",
      baseMessageId: "mirror-assistant-1",
      lastMessageId: "mirror-assistant-2",
      observedMessageIds: ["mirror-user-2", "mirror-assistant-2"],
      messageCount: 4,
      updatedAt: at,
      observedAt: at,
    });
    const bothAdvanced = observeExternalPiAdvancement(mirrorAdvanced, {
      generation: 2,
      baseLeafEntryId: "pi-assistant-1",
      leafEntryId: "pi-assistant-2",
      observedEntryIds: ["pi-user-2", "pi-assistant-2"],
      ancestorEntryIds: ["pi-assistant-1", "pi-user-2"],
      entryCount: 4,
      observedAt: at,
    });

    expect(mirrorAdvanced.classification).toBe("mirror_advanced");
    expect(bothAdvanced.classification).toBe("both_advanced");
    expect(bothAdvanced.classification).not.toBe("in_sync");
  });

  it("resets stale checkpoints when authority generation changes", () => {
    const reset = resetReconciliationAuthority(committedState(), {
      ...authority,
      generation: 3,
      mirrorConversationId: undefined,
    }, at);

    expect(reset).toMatchObject({
      authority: { generation: 3 },
      classification: "uninitialized",
      checkpoints: {},
      turns: [],
    });
  });

  it("represents an explicit hydration baseline without assuming later content", () => {
    const hydrated = createHydratedReconciliationState(authority, {
      harness: { lastMessageId: "h-assistant-4", lastTurnId: "hydration-baseline", messageCount: 4 },
      pi: { leafEntryId: "pi-assistant-4", entryCount: 4, sessionFile: "hydrated.jsonl" },
      mirror: {
        conversationId: "mirror-conversation-1",
        lastMessageId: "mirror-assistant-4",
        messageCount: 4,
        updatedAt: at,
      },
      establishedAt: at,
    });

    expect(hydrated.classification).toBe("in_sync");
    expect(hydrated.reasonCodes).toEqual(["explicit_hydration_baseline"]);
    expect(hydrated.turns).toEqual([]);
  });

  it("round-trips valid state and rejects cross-authority or impossible committed evidence", () => {
    const valid = committedState();
    expect(parseConversationReconciliationState(valid, authority)).toEqual(valid);
    expect(parseConversationReconciliationState(valid, { ...authority, generation: 3 })).toBeUndefined();

    const impossible = structuredClone(valid);
    impossible.turns[0].pi = { state: "committed" } as typeof impossible.turns[0]["pi"];
    expect(parseConversationReconciliationState(impossible, authority)).toBeUndefined();

    const falseSync = structuredClone(valid);
    falseSync.turns[0].mirror = { state: "pending" };
    expect(parseConversationReconciliationState(falseSync, authority)).toBeUndefined();
  });
});
