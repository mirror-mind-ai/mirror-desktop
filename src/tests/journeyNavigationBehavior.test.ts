import { describe, expect, it } from "vitest";
import { startAgentRun } from "../agent/agentRun";
import {
  createJourneyConversationLoadCoordinator,
  deriveJourneyNavigationPresentation,
  journeySearchReducer,
  resolveJourneyConversationRestore,
  resolveJourneySelection,
  shouldPreserveReadyJourneyConversation,
  shouldRecoverDurableTurnJournal,
  shouldSubmitJourneyDraft,
} from "../app/journeyNavigationCoordinator";
import {
  createInitialJourneyRuntimeState,
  journeyRuntimeReducer,
  type JourneyRunIdentity,
  type JourneyRuntimeState,
} from "../app/journeyRuntimeState";
import { updateComposerDraft } from "../domain/composerDrafts";
import { createDedicatedJourneyConversation, type JourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";

function liveIdentity(journeyId: string, runId: string): JourneyRunIdentity {
  const thread = readyThread(journeyId);
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  return {
    kind: "live",
    authority: createRunAuthority(
      createDedicatedTurnAuthority(
        thread,
        runId,
        `turn-${runId}`,
        `user-${runId}`,
        `assistant-${runId}`,
      ),
      conversation.liveIdentity,
      thread.generations[0],
    ),
  };
}

function runConversation(identity: JourneyRunIdentity, assistantContent = ""): JourneyConversation {
  if (identity.kind !== "live") throw new Error("expected live identity");
  const base = createDedicatedJourneyConversation({
    thread: readyThread(identity.authority.journeyId),
    initialMessages: [],
  });
  return stageCorrelatedTurn(
    base,
    identity.authority.correlation,
    {
      id: identity.authority.harnessUserMessageId,
      role: "user",
      content: "A request",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: identity.authority.harnessAssistantMessageId,
      role: "assistant",
      content: assistantContent,
      createdAt: "2026-01-01T00:00:01.000Z",
    },
  );
}

function registerA(identity: JourneyRunIdentity, conversation: JourneyConversation): JourneyRuntimeState {
  return journeyRuntimeReducer(createInitialJourneyRuntimeState(), {
    type: "register",
    identity,
    run: startAgentRun({ content: "A request", mode: "live", now: new Date("2026-01-01T00:00:00Z") }),
    assistantMessageId: identity.kind === "live" ? identity.authority.harnessAssistantMessageId : "assistant-a",
    conversationSnapshot: conversation,
  });
}

function inactiveConversation(journeyId: string, content: string): JourneyConversation {
  return createDedicatedJourneyConversation({
    thread: readyThread(journeyId),
    initialMessages: [{
      id: `message-${journeyId}`,
      role: "assistant",
      content,
      createdAt: "2025-12-31T00:00:00.000Z",
    }],
  });
}

describe("Journey navigation behavior under serial occupancy", () => {
  it("preserves an already ready exact Journey conversation during authority refresh", () => {
    expect(shouldPreserveReadyJourneyConversation({
      selectedJourneyId: "mirror-desktop",
      currentConversationJourneyId: "mirror-desktop",
      threadReady: true,
    })).toBe(true);
    expect(shouldPreserveReadyJourneyConversation({
      selectedJourneyId: "mirror-desktop",
      currentConversationJourneyId: "other-journey",
      threadReady: true,
    })).toBe(false);
    expect(shouldPreserveReadyJourneyConversation({
      selectedJourneyId: "mirror-desktop",
      currentConversationJourneyId: "mirror-desktop",
      threadReady: false,
    })).toBe(false);
  });

  it("recovers from the journal only without a live exact native execution", () => {
    expect(shouldRecoverDurableTurnJournal({
      allowPersistedRecovery: true,
      nativeInspectionStatus: "known",
      ownerHasLiveNativeExecution: false,
    })).toBe(true);
    expect(shouldRecoverDurableTurnJournal({
      allowPersistedRecovery: true,
      nativeInspectionStatus: "known",
      ownerHasLiveNativeExecution: true,
    })).toBe(false);
    expect(shouldRecoverDurableTurnJournal({
      allowPersistedRecovery: false,
      nativeInspectionStatus: "known",
      ownerHasLiveNativeExecution: false,
    })).toBe(false);
    expect(shouldRecoverDurableTurnJournal({
      allowPersistedRecovery: true,
      nativeInspectionStatus: "reconciling",
      ownerHasLiveNativeExecution: false,
    })).toBe(false);
  });

  it("navigates A → B → A while A keeps streaming without leaking presentation", () => {
    const owner = liveIdentity("journey-a", "run-a1");
    const initialA = runConversation(owner);
    const latestA = runConversation(owner, "latest A response");
    const conversationB = inactiveConversation("journey-b", "B history only");
    let state = registerA(owner, initialA);
    let selectedJourney = "journey-a";

    const ownerPresentation = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: selectedJourney,
      loadedConversation: initialA,
      mirrorCommitErrors: { "journey-a": "A settlement warning" },
    });
    expect(ownerPresentation.cancelVisible).toBe(true);

    selectedJourney = resolveJourneySelection(selectedJourney, "journey-b", "pointer");
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: owner,
      event: { type: "message_delta", content: "latest A response" },
    });
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: owner,
      event: { type: "warning", message: "A warning" },
    });
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: owner,
      event: { type: "diagnostic", message: "A diagnostic" },
    });
    state = journeyRuntimeReducer(state, {
      type: "stream_event",
      identity: owner,
      event: {
        type: "operation_update",
        operation: { id: "tool-a", name: "bash", status: "running", output: "A runtime" },
      },
    });
    state = journeyRuntimeReducer(state, {
      type: "conversation_snapshot",
      identity: owner,
      conversation: latestA,
    });

    const presentationB = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: selectedJourney,
      loadedConversation: conversationB,
      mirrorCommitErrors: { "journey-a": "A settlement warning" },
    });
    expect(presentationB.messages.map((message) => message.content)).toEqual(["B history only"]);
    expect(presentationB.warnings).toEqual([]);
    expect(presentationB.diagnostics).toEqual([]);
    expect(presentationB.mirrorCommitError).toBeUndefined();
    expect(presentationB.selectedRuntime.runtimeProjection.operations).toEqual([]);
    expect(presentationB.cancelVisible).toBe(false);
    expect(presentationB.draftEditable).toBe(true);
    expect(presentationB.sendBlocked).toBe(false);
    expect(presentationB.attachmentsBlocked).toBe(true);

    selectedJourney = resolveJourneySelection(selectedJourney, "journey-a", "keyboard-enter");
    const returnedA = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: selectedJourney,
      loadedConversation: conversationB,
      mirrorCommitErrors: { "journey-a": "A settlement warning" },
    });
    expect(returnedA.messages.at(-1)?.content).toBe("latest A response");
    expect(returnedA.warnings).toEqual(["A warning"]);
    expect(returnedA.diagnostics).toEqual(["A diagnostic"]);
    expect(returnedA.selectedRuntime.runtimeProjection.operations).toHaveLength(1);
    expect(returnedA.cancelVisible).toBe(true);

    const restore = resolveJourneyConversationRestore(state, "journey-a", 1);
    expect(restore.runtimeConversation).toEqual(latestA);
    expect(restore.allowPersistedRecovery).toBe(false);
    expect(restore.runtimeConversation?.reconciliation.turns[0].pi.state).toBe("pending");
  });

  it("keeps B clean while A finalizes and returns exactly one settled turn", () => {
    const owner = liveIdentity("journey-a", "run-a1");
    const settledA = runConversation(owner, "settled A response");
    const conversationB = inactiveConversation("journey-b", "B history only");
    let state = registerA(owner, runConversation(owner, "streaming A response"));
    state = journeyRuntimeReducer(state, { type: "stream_event", identity: owner, event: { type: "done" } });
    state = journeyRuntimeReducer(state, { type: "stream_finished", identity: owner });
    state = journeyRuntimeReducer(state, { type: "finalization_started", identity: owner });
    state = journeyRuntimeReducer(state, { type: "conversation_snapshot", identity: owner, conversation: settledA });

    const presentationB = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "journey-b",
      loadedConversation: conversationB,
      mirrorCommitErrors: { "journey-a": "A finalization error" },
    });
    expect(presentationB.messages.map((message) => message.content)).toEqual(["B history only"]);
    expect(presentationB.warnings).toEqual([]);
    expect(presentationB.diagnostics).toEqual([]);
    expect(presentationB.mirrorCommitError).toBeUndefined();

    const duringFinalization = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "journey-a",
      loadedConversation: conversationB,
    });
    expect(duringFinalization.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    expect(duringFinalization.conversation?.reconciliation.turns).toHaveLength(1);

    state = journeyRuntimeReducer(state, { type: "finalization_finished", identity: owner });
    const afterFinalization = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "journey-a",
      loadedConversation: settledA,
    });
    expect(afterFinalization.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    expect(afterFinalization.conversation?.reconciliation.turns).toHaveLength(1);
  });

  it("publishes only the current load when old-A, B, and new-A resolve out of order", () => {
    const coordinator = createJourneyConversationLoadCoordinator();
    const oldA = coordinator.begin("journey-a");
    const loadB = coordinator.begin("journey-b");
    const newA = coordinator.begin("journey-a");
    const published: string[] = [];

    if (coordinator.isCurrent(loadB, "journey-a")) published.push("B");
    if (coordinator.isCurrent(oldA, "journey-a")) published.push("old-A");
    if (coordinator.isCurrent(newA, "journey-a")) published.push("new-A");

    expect(published).toEqual(["new-A"]);
    coordinator.cancel(oldA);
    expect(coordinator.isCurrent(newA, "journey-a")).toBe(true);
    coordinator.cancel(newA);
    expect(coordinator.isCurrent(newA, "journey-a")).toBe(false);
  });

  it("preserves the active search across pointer and keyboard Journey selection until explicitly changed", () => {
    const query = "mirror";

    expect(journeySearchReducer(query, { type: "journey_selected", intent: "pointer" })).toBe(query);
    expect(journeySearchReducer(query, { type: "journey_selected", intent: "keyboard-enter" })).toBe(query);
    expect(journeySearchReducer(query, { type: "journey_selected", intent: "keyboard-space" })).toBe(query);
    expect(journeySearchReducer(query, { type: "query_changed", query: "nautilus" })).toBe("nautilus");
    expect(journeySearchReducer(query, { type: "clear_requested" })).toBe("");
    expect(journeySearchReducer(query, { type: "query_changed", query: "" })).toBe("");
  });

  it("supports pointer and keyboard navigation while native admission decides free-Journey submission", () => {
    expect(resolveJourneySelection("journey-a", "journey-b", "pointer")).toBe("journey-b");
    expect(resolveJourneySelection("journey-a", "journey-b", "keyboard-enter")).toBe("journey-b");
    expect(resolveJourneySelection("journey-a", "journey-b", "keyboard-space")).toBe("journey-b");
    expect(resolveJourneySelection("journey-a", "journey-b", "other")).toBe("journey-a");

    const owner = liveIdentity("journey-a", "run-a1");
    const state = registerA(owner, runConversation(owner));
    const presentationB = deriveJourneyNavigationPresentation({
      runtimeState: state,
      selectedJourneyId: "journey-b",
      loadedConversation: inactiveConversation("journey-b", "B history"),
    });
    const drafts = updateComposerDraft({}, "journey-b", "B draft");

    expect(drafts).toEqual({ "journey-b": "B draft" });
    expect(presentationB.draftEditable).toBe(true);
    expect(presentationB.cancelVisible).toBe(false);
    expect(presentationB.sendBlocked).toBe(false);
    expect(shouldSubmitJourneyDraft({ key: "Enter", shiftKey: false }, presentationB)).toBe(true);
    expect(shouldSubmitJourneyDraft({ key: "Enter", shiftKey: false }, presentationB, true)).toBe(false);
    expect(shouldSubmitJourneyDraft({ key: "Enter", shiftKey: true }, presentationB)).toBe(false);
  });
});
