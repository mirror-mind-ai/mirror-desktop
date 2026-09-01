import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import streamSource from "../agent/piProcessStream.ts?raw";
import mockSource from "../agent/agentStream.ts?raw";

function sourceBetween(start: string, end: string): string {
  return appSource.slice(appSource.indexOf(start), appSource.indexOf(end));
}

describe("Journey runtime integration guardrails", () => {
  it("uses one Journey-keyed reducer instead of selected-Journey runtime state hooks", () => {
    expect(appSource).toContain("useReducer(\n    journeyRuntimeReducer");
    expect(appSource).toContain("deriveJourneyNavigationPresentation({");
    expect(appSource).toContain("const selectedRuntime = navigationPresentation.selectedRuntime");
    expect(appSource).not.toContain("const [isStreaming, setIsStreaming]");
    expect(appSource).not.toContain("const [agentRunJourneyId");
  });

  it("keeps selection presentation-only while exact native admission controls capacity two", () => {
    const selection = sourceBetween("function selectJourney", "function openJourneyTreeMenu");
    expect(selection).toContain("if (journeyId === selectedJourney)");
    expect(selection).not.toContain("runtimeBusy");
    expect(selection).not.toContain("dispatchJourneyRuntime");
    expect(appSource).toContain("draggable={journeyListOrder === \"tree\" && !runtimeBusy}");
    expect(appSource).toContain("derivePiInvocationAdmission(piInvocationOccupancy, selectedJourney)");
    expect(appSource).toContain("|| invocationAdmissionBlocked || runStartReservationRef.current");
    expect(appSource).toContain("runStartReservationRef.current || reconciliationBlocksInvocation");
  });

  it("restores an authority-bound owner conversation without running in-flight recovery", () => {
    expect(appSource).toContain("resolveJourneyConversationRestore(");
    expect(appSource).toContain('type: "conversation_snapshot", identity: runtimeIdentity');
    expect(appSource).toContain("restoreDecision.allowPersistedRecovery && !runtimeBusy");
    expect(appSource).toContain("[selectedJourney, registryLoaded, preferencesLoaded, runtimeBusy]");
  });

  it("shows owner-only sidebar, cancellation, and finalization errors", () => {
    expect(appSource).toContain("selectJourneyRuntimeOwnerPhase(journeyRuntimeState, journey.id)");
    expect(appSource).toContain('journey-runtime-state ${runtimeOwnerPhase}');
    expect(appSource).toContain("const mirrorCommitError = navigationPresentation.mirrorCommitError");
    expect(appSource).toContain("classifyDedicatedTurnState(conversation, selectedRuntimeBusy)");
    const cancellation = sourceBetween("async function cancelActiveRun", "function requestConversationRestart");
    expect(cancellation).toContain("selectedRuntime.identity");
    expect(cancellation).toContain("cancelLivePiInvocation(identity.authority.journeyId, identity.authority.runId)");
  });

  it("allows admitted selected-Journey submission while keeping aggregate mutations blocked", () => {
    expect(appSource).toContain('const altitudeSwitchDisabled = isJourneyReloading || projectionLoadStatus === "loading"');
    expect(appSource).toContain("disabled={isJourneyReloading}");
    expect(appSource).toContain("disabled={!draft.trim() || selectedInvocationAdmissionBlocked");
    expect(appSource).toContain("disabled={runtimeBusy || isJourneyReloading || fileAttachmentBusy}");
    expect(appSource).toContain("disabled={runtimeBusy}");
    expect(appSource).toContain('journeyThreadState.kind === "absent" && !runtimeBusy');
    expect(appSource).toContain('if (runtimeBusy || journeyThreadState.kind !== "absent" || startingJourneyId) return');
  });

  it("routes run mutations and finalization through captured identity", () => {
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    expect(generation).toContain("const runtimeIdentity: JourneyRunIdentity");
    expect(generation).toContain('type: "stream_event", identity: runtimeIdentity, event');
    expect(generation).toContain('type: "finalization_started", identity: runtimeIdentity');
    expect(generation).toContain('type: "finalization_finished", identity: runtimeIdentity');
    expect(generation).toContain("let runConversation = stagedConversation");
    expect(generation).toContain("for await (const event of provider(packet))");
    expect(generation).toContain("runStartReservationRef.current === runtimeIdentity");
    expect(generation).toContain("selectedJourneyRef.current === ownerJourneyId");
    const preAgentRollback = sourceBetween("if (runFailed && !runReachedAgent)", "} else if (runWasCancelled || runFailed)");
    expect(preAgentRollback).toContain("conversationBeforeRun");
    expect(preAgentRollback).not.toContain('type: "conversation_snapshot"');
  });

  it("keeps native occupancy authoritative through durable cleanup and exact recovery", () => {
    expect(appSource).toContain("hasBlockingPiInvocationOccupancy(piInvocationOccupancy)");
    expect(appSource).toContain("createJourneySettlementAuthority(runAuthority)");
    expect(appSource).toContain("const settlement = await executeCompletedSettlement({");
    expect(appSource).toContain("saveActiveProjection: (projection, authority) => journeyPersistenceCoordinator.run");
    expect(appSource).toContain("enqueueOutbox: (projection, authority) => journeyPersistenceCoordinator.run");
    expect(appSource).toContain('journeyPersistenceCoordinator.run(');
    expect(appSource).toContain('"post_frontier"');
    expect(appSource).toContain("savePostFrontierReceiptProjection(settled, authority, summary)");
    expect(appSource).toContain("cleanupLease: releaseDurablePiInvocationLease");
    expect(appSource).toContain("() => executeInterruptedSettlement({");
    expect(appSource).toContain("await rollbackRejectedReservation({");
    expect(appSource).toContain("releaseAndReinspectPiInvocationLease(authority");
    expect(appSource).toContain("runtimeBusy && !exactRetainedSettlementRecovery");
    expect(appSource).toContain("resolveExactInterruptedRecovery(piInvocationOccupancy");
    expect(appSource).toContain("await reconcilePiInvocationOccupancy()");
    expect(streamSource).toContain('invoke("cancel_pi_invocation", { journeyId, runId })');
    expect(streamSource).toContain('invoke<PiInvocationRegistryInspection>("inspect_pi_invocations")');
    expect(streamSource).toContain('invoke<PiInvocationLeaseRelease>("release_pi_invocation_lease", { journeyId, runId })');
  });

  it("mounts the shared dispatcher once and leaves mock streaming Tauri-free", () => {
    expect(appSource).toContain("piProcessEventDispatcher.mount()");
    expect(appSource).toContain("piProcessEventDispatcher.dispose()");
    expect(streamSource).not.toContain('from "@tauri-apps/api/event"');
    expect(mockSource).not.toContain("@tauri-apps/api");
    expect(mockSource).not.toContain("piProcessEventDispatcher");
  });
});
