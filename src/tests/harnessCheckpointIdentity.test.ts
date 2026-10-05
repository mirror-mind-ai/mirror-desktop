import { describe, expect, it } from "vitest";
import reconciliationSource from "../domain/conversationReconciliation.ts?raw";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";
import { readyThread } from "./fixtures/readyThread";
import {
  beginNautilusTurn,
  createConversationReconciliationState,
  healRefusedHarnessCommits,
  observeHarnessTurnCommit,
  observeMirrorTurnCommit,
  observePiTurnCommit,
  parseConversationReconciliationState,
  type ConversationReconciliationState,
  type ReconciliationAuthority,
} from "../domain/conversationReconciliation";
import { interruptDedicatedTurn } from "../domain/dedicatedTurnCommit";
import type { JourneyConversation } from "../domain/journeyConversation";

const authority: ReconciliationAuthority = {
  journeyId: "mirror-desktop",
  harnessConversationId: "thread-1",
  piSessionId: "pi-1",
  mirrorConversationId: "mirror-1",
  generation: 1,
};

function begin(state: ConversationReconciliationState, n: number) {
  return beginNautilusTurn(state, {
    turnId: `turn-${n}`,
    runId: `run-${n}`,
    startedAt: `2026-10-04T10:0${n}:00Z`,
    harnessUserMessageId: `h-user-${n}`,
    harnessAssistantMessageId: `h-assistant-${n}`,
  });
}

/** Commits Pi then the harness for one turn, with the surface length the caller claims. */
function commitTurn(state: ConversationReconciliationState, n: number, surfaceLength: number) {
  let next = observePiTurnCommit(state, `turn-${n}`, {
    userEntryId: `pi-user-${n}`,
    assistantEntryId: `pi-assistant-${n}`,
    leafEntryId: `pi-assistant-${n}`,
    entryCount: n * 2,
    committedAt: `2026-10-04T10:0${n}:02Z`,
  });
  return observeHarnessTurnCommit(next, `turn-${n}`, {
    userMessageId: `h-user-${n}`,
    assistantMessageId: `h-assistant-${n}`,
    messageCount: surfaceLength,
    committedAt: `2026-10-04T10:0${n}:03Z`,
  });
}

describe("CR122: the harness checkpoint counts the same thing every turn", () => {
  it("admits a bounded-surface commit after a complete-surface one", () => {
    // The defect: turn 1 commits with complete history loaded (300 messages), turn 2 commits with
    // only the current chapter loaded (20). Before CR122 the second was refused as a regression.
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 300);
    state = begin(state, 2);
    state = commitTurn(state, 2, 20);

    expect(state.reasonCodes).not.toContain("checkpoint_regression");
    expect(state.turns[1]!.harness).toMatchObject({
      state: "committed",
      userMessageId: "h-user-2",
      assistantMessageId: "h-assistant-2",
    });
    expect(state.classification).toBe("commit_pending"); // mirror still owed, harness is fine
  });

  it("tracks committed turns, which cannot regress when the surface shrinks", () => {
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 300);
    expect(state.checkpoints.harness).toMatchObject({ messageCount: 300, committedTurnCount: 1 });
    state = begin(state, 2);
    state = commitTurn(state, 2, 20);
    // messageCount stays descriptive and follows the surface; committedTurnCount is the authority.
    expect(state.checkpoints.harness).toMatchObject({ messageCount: 20, committedTurnCount: 2 });
  });

  it("records the evidence even when a genuine regression is detected", () => {
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 10);
    // Forge a checkpoint ahead of reality: the next commit is a true regression in committed turns.
    state = {
      ...state,
      checkpoints: { ...state.checkpoints, harness: { ...state.checkpoints.harness!, committedTurnCount: 9 } },
    };
    state = begin(state, 2);
    const after = commitTurn(state, 2, 12);

    expect(after.reasonCodes).toContain("checkpoint_regression");
    // D2: the turn's own facts survive the refusal.
    expect(after.turns[1]!.harness).toMatchObject({ state: "committed", assistantMessageId: "h-assistant-2" });
    // and the checkpoint is never pulled backwards by the regressing commit.
    expect(after.checkpoints.harness!.committedTurnCount).toBe(9);
  });

  it("records Pi and Mirror evidence when their checkpoints regress too", () => {
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 10);
    state = begin(state, 2);
    state = {
      ...state,
      checkpoints: {
        ...state.checkpoints,
        pi: { ...state.checkpoints.pi!, entryCount: 999 },
        mirror: { conversationId: "mirror-1", lastMessageId: "m-old", messageCount: 999 },
      },
    };
    const pi = observePiTurnCommit(state, "turn-2", {
      userEntryId: "pi-user-2", assistantEntryId: "pi-assistant-2", leafEntryId: "pi-assistant-2",
      entryCount: 4, committedAt: "2026-10-04T10:02:02Z",
    });
    expect(pi.reasonCodes).toContain("checkpoint_regression");
    expect(pi.turns[1]!.pi).toMatchObject({ state: "committed", leafEntryId: "pi-assistant-2" });
    expect(pi.checkpoints.pi!.entryCount).toBe(999);

    const mirror = observeMirrorTurnCommit(state, "turn-2", {
      userMessageId: "m-user-2", assistantMessageId: "m-assistant-2", messageCount: 4,
      committedAt: "2026-10-04T10:02:04Z",
    });
    expect(mirror.reasonCodes).toContain("checkpoint_regression");
    expect(mirror.turns[1]!.mirror).toMatchObject({ state: "committed", assistantMessageId: "m-assistant-2" });
    expect(mirror.checkpoints.mirror!.messageCount).toBe(999);
  });

  it("recomputes a stale stored classification instead of discarding the record", () => {
    // D0: an unparsed ledger reads as absent, and an absent ledger loses its durable history on the
    // next save. A derived field must never be able to cause that.
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 10);
    const stale = { ...state, classification: "conflicted" as const };

    const parsed = parseConversationReconciliationState(stale, authority);
    expect(parsed).toBeDefined();
    expect(parsed!.classification).toBe("commit_pending");
    expect(parsed!.turns).toEqual(state.turns);
    expect(parsed!.checkpoints).toEqual(state.checkpoints);
    expect(parsed!.reasonCodes).toEqual(state.reasonCodes);
  });

  it("keeps rejecting a record that is actually wrong", () => {
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 10);
    expect(parseConversationReconciliationState(state, { ...authority, piSessionId: "other" })).toBeUndefined();
    expect(parseConversationReconciliationState({ ...state, schemaVersion: "0.2.0" }, authority)).toBeUndefined();
  });

  it("heals a turn whose harness commit was refused, from ids already staged", () => {
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = observePiTurnCommit(state, "turn-1", {
      userEntryId: "pi-user-1", assistantEntryId: "pi-assistant-1", leafEntryId: "pi-assistant-1",
      entryCount: 2, committedAt: "2026-10-04T10:01:02Z",
    });
    // The shape 17 production turns are in: Pi committed, harness staged with ids but pending.
    expect(state.turns[0]!.harness).toMatchObject({ state: "pending", userMessageId: "h-user-1" });

    const healed = healRefusedHarnessCommits(state);
    expect(healed.turns[0]!.harness).toMatchObject({
      state: "committed",
      userMessageId: "h-user-1",
      assistantMessageId: "h-assistant-1",
      committedAt: "2026-10-04T10:01:02Z",
    });
    // No harness checkpoint has ever been written here, and the heal has no surface length to put in
    // one, so it does not invent a checkpoint it cannot fill honestly.
    expect(healed.checkpoints.harness).toBeUndefined();
  });

  it("advances the committed-turn count of an existing checkpoint when it heals", () => {
    // The production shape: a checkpoint exists from earlier turns, and later turns are stuck.
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 300);
    state = begin(state, 2);
    state = observePiTurnCommit(state, "turn-2", {
      userEntryId: "pi-user-2", assistantEntryId: "pi-assistant-2", leafEntryId: "pi-assistant-2",
      entryCount: 4, committedAt: "2026-10-04T10:02:02Z",
    });
    expect(state.checkpoints.harness).toMatchObject({ committedTurnCount: 1 });

    const healed = healRefusedHarnessCommits(state);
    expect(healed.turns[1]!.harness.state).toBe("committed");
    expect(healed.checkpoints.harness).toMatchObject({
      committedTurnCount: 2,
      messageCount: 300, // the descriptive value is left exactly as it was found
    });
  });

  it("refuses to heal a turn that has no staged ids or no Pi commit", () => {
    const noIds = beginNautilusTurn(
      createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"),
      { turnId: "turn-9", runId: "run-9", startedAt: "2026-10-04T10:09:00Z" },
    );
    expect(healRefusedHarnessCommits(noIds)).toEqual(noIds);

    const noPi = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    expect(healRefusedHarnessCommits(noPi)).toEqual(noPi);
  });

  it("lets an advisory reason stop pinning the classification, and keeps identity conflicts", () => {
    // D3: native_id_mismatch and checkpoint_regression are history. A Journey that re-committed once
    // in September must be able to say it is fine now.
    let state = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    state = commitTurn(state, 1, 10);
    state = observeMirrorTurnCommit(state, "turn-1", {
      userMessageId: "m-user-1", assistantMessageId: "m-assistant-1", messageCount: 2,
      committedAt: "2026-10-04T10:01:04Z",
    });
    expect(state.classification).toBe("in_sync");

    const advisory = { ...state, reasonCodes: ["native_id_mismatch" as const] };
    expect(parseConversationReconciliationState(advisory, authority)!.classification).toBe("in_sync");

    const identity = { ...state, reasonCodes: ["turn_identity_mismatch" as const] };
    expect(parseConversationReconciliationState(identity, authority)!.classification).toBe("conflicted");

    const bound = { ...state, reasonCodes: ["mirror_conversation_mismatch" as const] };
    expect(parseConversationReconciliationState(bound, authority)!.classification).toBe("conflicted");
  });

  it("fails the Mirror body too when a send is interrupted", () => {
    let reconciliation = begin(createConversationReconciliationState(authority, "2026-10-04T09:00:00Z"), 1);
    const conversation = { reconciliation } as unknown as JourneyConversation;
    const interrupted = interruptDedicatedTurn(conversation, "turn-1", "turn_journal_cancelled", "2026-10-04T10:01:05Z");
    const turn = interrupted.reconciliation.turns[0]!;
    expect(turn.pi).toMatchObject({ state: "failed", failureCode: "turn_journal_cancelled" });
    // A cancelled send owes Mirror nothing, so it must stop reading as delivery debt.
    expect(turn.mirror.state).toBe("failed");
  });

  it("keeps a stored ledger readable when its classification is stale, and heals it on the way in", () => {
    // The wiring guard. The domain rules above are useless unless they sit on the path that turns a
    // stored file into live state, and "correct domain, wrong wiring" is the failure shape this
    // Journey keeps repeating. Three production ledgers are unreadable by the shipped build for
    // exactly the reason exercised here.
    const conversation = createDedicatedJourneyConversation({
      thread: readyThread("mirror-desktop"),
      initialMessages: [{ id: "u", role: "user", content: "hello", createdAt: "2026-10-04T10:00:00Z" }],
      now: new Date("2026-10-04T09:00:00Z"),
    });
    let reconciliation = beginNautilusTurn(conversation.reconciliation, {
      turnId: "turn-1",
      runId: "run-1",
      startedAt: "2026-10-04T10:01:00Z",
      harnessUserMessageId: "h-user-1",
      harnessAssistantMessageId: "h-assistant-1",
    });
    reconciliation = observePiTurnCommit(reconciliation, "turn-1", {
      userEntryId: "pi-user-1", assistantEntryId: "pi-assistant-1", leafEntryId: "pi-assistant-1",
      entryCount: 2, committedAt: "2026-10-04T10:01:02Z",
    });

    const persisted = createPersistedJourneyConversation({
      ...conversation,
      // A stale derived value, which the shipped parse rejects outright.
      reconciliation: { ...reconciliation, classification: "in_sync" },
    });

    const parsed = parsePersistedJourneyConversation(persisted);
    // An unreadable ledger reads as absent, and an absent ledger loses its history on the next save.
    expect(parsed).toBeDefined();
    expect(parsed!.conversation.messages).toHaveLength(1);
    // and the refused harness body is committed by the time the record is live.
    expect(parsed!.conversation.reconciliation.turns[0]!.harness.state).toBe("committed");
    expect(parsed!.conversation.reconciliation.classification).toBe("commit_pending");
  });

  it("keeps the derived classification out of the parse rejection path", () => {
    // Source guard: the equality check this CR removed is how a rule change became data loss.
    expect(reconciliationSource).not.toContain("deriveClassification(candidate) !== candidate.classification");
    expect(reconciliationSource).toContain("classification: deriveClassification(candidate)");
  });
});
