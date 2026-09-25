import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import streamSource from "../agent/piProcessStream.ts?raw";
import mockSource from "../agent/agentStream.ts?raw";
import cancellationSource from "../app/journeyCancellation.ts?raw";
import coordinatorSource from "../app/turnFinalizationCoordinator.ts?raw";

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

  it("keeps selection presentation-only while native reservation and journal control admission", () => {
    const selection = sourceBetween("function selectJourney", "function openJourneyTreeMenu");
    expect(selection).toContain("if (journeyId === selectedJourney)");
    expect(selection).not.toContain("runtimeBusy");
    expect(selection).not.toContain("dispatchJourneyRuntime");
    expect(appSource).toContain("draggable={journeyListOrder === \"tree\" && !runtimeBusy}");
    expect(appSource).toContain("derivePiInvocationAdmission(piInvocationOccupancy, selectedJourney)");
    expect(appSource).toContain("|| invocationAdmissionBlocked || runStartReservationRef.current");
    expect(appSource).not.toContain("liveInvocationPreflightRef");
    expect(appSource).not.toContain("|| reconciliationBlocksInvocation ||");
  });

  it("restores an authority-bound owner conversation without reacting to in-session busy transitions", () => {
    expect(appSource).toContain("resolveJourneyConversationRestore(");
    expect(appSource).toContain("shouldPreserveReadyJourneyConversation({");
    expect(appSource).toMatch(
      /if \(!preserveReadyConversation\) \{\s*setConversationLoaded\(false\);\s*setJourneyThreadState\(\{ kind: "loading" \}\);\s*\}/,
    );
    expect(appSource).toContain('type: "conversation_snapshot", identity: runtimeIdentity');
    expect(appSource).not.toContain("shouldRecoverDurableTurnJournal({");
    expect(appSource).toContain("piInvocationBootstrapComplete");
    expect(appSource).toContain("selectedNativeLease?.terminalState");
    expect(appSource).not.toContain("[selectedJourney, registryLoaded, preferencesLoaded, runtimeBusy]");
    expect(appSource).toContain("const repairableSteering = restoredConversation.steeringEvidence?.some");
    expect(appSource).toContain("repairedConversation = reconcileSteeringUserEntries");
    expect(appSource).toContain("await saveDedicatedJourneyConversation(restoredConversation)");
  });

  it("shows owner-only sidebar, cancellation, and finalization errors", () => {
    expect(appSource).toContain("selectJourneyRuntimeOwnerPhase(journeyRuntimeState, journey.id)");
    expect(appSource).toContain("<JourneyItemCopy");
    expect(appSource).toContain("runtimePhase={runtimeOwnerPhase}");
    const copy = appSource.indexOf("<JourneyItemCopy");
    const pinAction = appSource.indexOf("className={`journey-pin", copy);
    expect(copy).toBeGreaterThan(-1);
    expect(copy).toBeLessThan(pinAction);
    expect(appSource).toContain("const mirrorCommitError = navigationPresentation.mirrorCommitError");
    expect(appSource).toContain("const durableInterruptedTurn = latestNautilusTurn?.pi.state === \"failed\"");
    expect(appSource).toContain("classifyDedicatedTurnState(conversation, selectedRuntimeBusy)");
    const cancellation = sourceBetween("async function cancelActiveRun", "function requestConversationRestart");
    expect(cancellation).toContain("selectedRuntime.identity");
    expect(cancellation).toContain("cancelExactJourneyRun(identity, { cancelInvocation: cancelLivePiInvocation })");
    expect(cancellationSource).toContain("const { journeyId, runId } = identity.authority");
    expect(cancellationSource).toContain("dependencies.cancelInvocation(journeyId, runId)");
  });

  it("presents generation replacement as Reset agent context rather than restarting the Conversation", () => {
    expect(appSource).toContain("Reset agent context…");
    expect(appSource).toContain("Reset agent context?");
    expect(appSource).toContain("Resetting context…");
    expect(appSource).not.toContain("Restart Conversation…");
    expect(appSource).not.toContain("Restart conversation?");
  });

  it("keeps journal recovery evidence outside Conversation submission admission", () => {
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    expect(appSource).not.toContain("localAdmissionReady");
    expect(generation).not.toContain("Boolean(blockingTurnJournalRecord)");
    expect(generation).toContain("selectedInvocationAdmissionBlocked || turnRecoveryBusy");
    expect(appSource).toContain("blockingTurn: blockingRecoveryEvidence");
  });

  it("keeps ordinary occupancy silent and disables Send when capacity refusal is known", () => {
    expect(appSource).not.toContain("derivePiInvocationCapacityPresentation");
    expect(appSource).not.toContain("ConcurrentTurnCapacityNotice");
    expect(appSource).not.toContain("Concurrent turns:");
    expect(appSource).toContain("Global Pi capacity occupied");
    expect(appSource).toContain('nativeAdmission: piInvocationPresentation.allowed ? "allowed" : piInvocationPresentation.reason');
    expect(appSource).toContain("const selectedInvocationAdmissionBlocked = !conversationAvailability.canSend;");
    expect(appSource).toContain("Native admission remains the atomic capacity authority");
  });

  it("keeps an active Desktop Conversation title visible while its transcript scrolls", () => {
    expect(appSource).toContain('<section className="chat-shell"');
    expect(appSource).not.toContain("has-conversation-detail");
    expect(appSource).toContain('operationalChatSelected && messages.length > 0 && selectedConversationEntry?.kind === "desktop_conversation"');
    expect(appSource).toContain('className="active-conversation-context"');
    expect(appSource).toContain("selectedConversationEntry.title");
    expect(appSource).toContain("<ConversationDetailHeader");
    expect(appSource).toContain("entry={selectedConversationEntry}");
  });

  it("allows admitted selected-Journey submission while keeping aggregate mutations blocked", () => {
    expect(appSource).toContain('const altitudeSwitchDisabled = isJourneyReloading || projectionLoadStatus === "loading"');
    expect(appSource).toContain("disabled={isJourneyReloading}");
    expect(appSource).toContain("disabled={!draft.trim() || selectedInvocationAdmissionBlocked");
    expect(appSource).toContain("disabled={selectedRuntimeBusy || isJourneyReloading || fileAttachmentBusy}");
    expect(appSource).toContain("if (fileAttachmentBusy || selectedRuntimeBusy || isJourneyReloading) return");
    expect(appSource).toContain('journeyThreadState.kind !== "ready" || selectedRuntimeBusy || isJourneyReloading');
    expect(appSource).toContain("disabled={selectedRuntimeBusy || fileAttachmentBusy}");
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
    expect(generation).toContain("let runRuntimeProjection = initialRuntimeProjectionState");
    expect(generation).toContain("runRuntimeProjection = reduceRuntimeProjection(runRuntimeProjection, event)");
    expect(generation).toContain("attachTerminalAgentActionEvidence(");
    expect(generation).toContain("terminalStatus: runWasCancelled ? \"cancelled\" : \"failed\"");
    expect(generation).toContain("for await (const event of provider(packet))");
    expect(generation).toContain("runStartReservationRef.current === runtimeIdentity");
    expect(generation).toContain("selectedJourneyRef.current === ownerJourneyId");
    const preAgentRollback = sourceBetween("if (runFailed && !runReachedAgent)", "} else if (runWasCancelled || runFailed)");
    expect(preAgentRollback).toContain("conversationBeforeRun");
    expect(preAgentRollback).toContain("persistOwnerComposerDraft(content)");
    expect(preAgentRollback).not.toContain("saveRollbackProjection");
    expect(preAgentRollback).toContain("Message returned to the composer");
    expect(preAgentRollback).not.toContain('type: "conversation_snapshot"');
    const durableFailure = sourceBetween("} else if (runWasCancelled || runFailed)", "} else if (correlation && settlementAuthority)");
    expect(durableFailure).toContain('type: "finalization_finished", identity: runtimeIdentity');
  });

  it("keeps optimistic staging in memory until exact agent-start evidence", () => {
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    const beforeProvider = sourceBetween("runStartReservationRef.current = runtimeIdentity", "for await (const event of provider(packet))");
    expect(beforeProvider).toContain('setDraft("")');
    expect(beforeProvider).not.toContain("saveAdmittedTurnProjection(stagedConversation, settlementAuthority)");
    const admitted = sourceBetween(
      'if (event.type === "run_status" && event.status === "working")',
      'if (event.type === "context_usage")',
    );
    expect(admitted).toContain("persistOwnerComposerDraft(\"\", true)");
    expect(admitted).toContain("saveAdmittedTurnProjection(stagedConversation, settlementAuthority)");
    expect(generation.indexOf("saveAdmittedTurnProjection(stagedConversation, settlementAuthority)")).toBeGreaterThan(
      generation.indexOf("for await (const event of provider(packet))"),
    );
    const rejected = sourceBetween("if (runFailed && !runReachedAgent)", "} else if (runWasCancelled || runFailed)");
    expect(rejected).not.toContain("saveRollbackProjection");
    expect(rejected).not.toContain("saveDedicatedJourneyConversation(conversationBeforeRun)");
  });

  it("keeps native occupancy as execution ownership while journal controls lifecycle", () => {
    expect(appSource).toContain("hasBlockingPiInvocationOccupancy(piInvocationOccupancy)");
    expect(appSource).toContain("createJourneySettlementAuthority(runAuthority)");
    expect(coordinatorSource).toContain("const settlement = await executeCompletedSettlement({");
    expect(coordinatorSource).toContain("saveActiveProjection: (projection, exactAuthority) => journeyPersistenceCoordinator.run(");
    expect(coordinatorSource).toContain("enqueueOutbox: (projection, exactAuthority) => journeyPersistenceCoordinator.run(");
    expect(coordinatorSource).toContain('journeyPersistenceCoordinator.run(authority, "post_frontier"');
    expect(coordinatorSource).toContain("await ports.savePostFrontierProjection(settled, authority, summary)");
    expect(appSource).toContain("cleanupLease: releaseDurablePiInvocationLease");
    expect(coordinatorSource).toContain("() => executeInterruptedSettlement({");
    const interruptedSettlement = sourceBetween(
      "await turnFinalizationCoordinator.finalizeInterruptedTurn({",
      "} else {\n              await saveDedicatedJourneyConversation(interrupted);",
    );
    expect(interruptedSettlement.indexOf("cleanupLease: releaseDurablePiInvocationLease")).toBeLessThan(
      interruptedSettlement.indexOf("refreshTurnJournalEvidence(ownerJourneyId)"),
    );
    expect(interruptedSettlement).toContain("setTurnRecoveryError(undefined)");
    expect(interruptedSettlement).toContain("setTurnRecoveryBusy(false)");
    expect(appSource).toContain("await rollbackRejectedReservation({");
    expect(appSource).toContain('throw new Error("rejected_reservation_reinspection_invalid")');
    expect(appSource).toContain("onRollbackConfirmed: () => {");
    expect(appSource).toContain('dispatchJourneyRuntime({ type: "cleanup", identity: runtimeIdentity })');
    expect(appSource).toContain("releaseAndReinspectPiInvocationLease(authority");
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    expect(generation).toContain("turnFinalizationCoordinator.finalizeCompletedTurn({");
    expect(coordinatorSource).toContain("requireExactTurnJournalRecord(journal, authority)");
    expect(coordinatorSource).toContain("decideTurnJournalTerminal(journalRecord)");
    expect(generation).not.toContain("resolveCommittedLeaseBeforeInvocation");
    expect(generation).toContain("loadDedicatedPiUserEntries(");
    expect(generation).toContain("reconcileSteeringUserEntries(");
    expect(generation).toContain("settleUnconsumedSteering(");
    expect(generation.indexOf("loadDedicatedPiUserEntries(")).toBeGreaterThan(
      generation.indexOf("for await (const event of provider(packet))"),
    );
    expect(generation).toContain("attachTerminalAgentActionEvidence(");
    expect(coordinatorSource.indexOf("input.decorate?.(settled) ?? settled")).toBeLessThan(
      coordinatorSource.indexOf("const projectionAtFrontier = settled"),
    );
    expect(appSource).toContain("Message was not sent");
    expect(appSource).toContain("lastItem(streamWarnings)");
    expect(appSource).toContain("recordUnsentDraft(current, ownerJourneyId, message)");
    expect(appSource).toContain("unavailableModelReason(piModelCatalog, effectiveAgentProfile.model)");
    expect(appSource.indexOf("const modelRejection")).toBeLessThan(appSource.indexOf('type: "register"'));
    expect(appSource).toContain("disabled={unavailable}");
    expect(appSource).toContain("{describeEffectiveAgentProfile(effectiveAgentProfile)}");
    expect(appSource).toContain("profileOwnedArgumentFlags(providerArgsText)");
    expect(appSource).toContain("providerTerminalFailureDetail(journeyTurnJournalRecords");
    expect(appSource).toContain("<InterruptedNativeAttemptNotice providerFailure={interruptedProviderFailure} />");
    expect(appSource).toContain("clearUnsentDraft(current, ownerJourneyId)");
    expect(appSource).toContain("{unsentDraftNotice}");
    expect(appSource.indexOf("clearUnsentDraft(current, ownerJourneyId)")).toBeLessThan(
      appSource.indexOf('type: "register"'),
    );
    expect(appSource).not.toContain(".at(");
    const automaticOutboxRecovery = sourceBetween(
      "void listMirrorAppendOutbox(conversation.journeyId).then((items) => {",
      "checkedMirrorTurnRef.current.clear();",
    );
    expect(automaticOutboxRecovery).not.toContain("items.length > 0");
    expect(automaticOutboxRecovery).toContain("await recoverPostTerminalPersistence(conversation.journeyId)");
    expect(automaticOutboxRecovery).not.toContain("retryMirrorAppendSummary");
    expect(automaticOutboxRecovery).toContain("!selectedRuntimeBusy");
    expect(automaticOutboxRecovery).toContain('piInvocationOccupancy.status === "known"');
    const convergence = coordinatorSource.slice(
      coordinatorSource.indexOf("convergeDelivery(journeyId, deps) {"),
      coordinatorSource.indexOf("publishSettled(authority, projection) {"),
    );
    expect(convergence).toContain("resolveRetainedLeaseForOutboxRecovery(inspection, authority)");
    expect(convergence).toContain("deps.reconcileDeliveryDebt(journeyId)");
    expect(convergence).toContain('item.schemaVersion === "1.1.0"');
    expect(convergence).toContain("deps.deliverPiBackedOutboxItem(item.itemId, item.journeyId)");
    expect(convergence).toContain("failures.push");
    expect(convergence).toContain("continue;");
    expect(convergence).toContain('legacyItems = orderedItems.filter((item) => item.schemaVersion !== "1.1.0")');
    expect(convergence).toContain("convergeLegacyItem(item)");
    expect(convergence).toContain("convergePiBackedItem(item, record)");
    expect(convergence).toContain("deps.loadThread(item.journeyId, item.threadId)");
    expect(convergence).toContain("createDedicatedJourneyConversation({ thread: recoveryThread, initialMessages: [] })");
    expect(convergence).toContain("deps.inspectTranscript(");
    expect(convergence).toContain("stageCorrelatedTurn(");
    expect(convergence).toContain("applyPiExecutionEvidence(projection, correlation");
    expect(convergence).toContain("projectPiBackedConversationSurface(projection, transcriptInspection)");
    expect(convergence).toContain("const projectionAlreadyCommitted = persistedTargetMirror?.state === \"committed\"");
    expect(convergence).toContain("if (!projectionAlreadyCommitted)");
    expect(convergence).toContain('record.phase === "projected"');
    expect(convergence).toContain("isTurnJournalSuccessorEligible(record)");
    expect(convergence).toContain("synchronization_convergence_partial");
    const piBackedSection = convergence.slice(convergence.indexOf("const convergePiBackedItem"));
    expect(piBackedSection.indexOf("ports.cleanupLease(authority)")).toBeLessThan(
      piBackedSection.indexOf("deps.deliverPiBackedOutboxItem(item.itemId, item.journeyId)"),
    );
    expect(convergence).toContain("applyMirrorAppendReceipt(projection, authority, receipt");
    expect(convergence).toContain("ports.savePostFrontierProjection(settled, authority, item)");
    expect(convergence).toContain("ports.acknowledgeOutboxItem(item.itemId, item.conversationId, authority)");
    const postTerminalRecovery = sourceBetween(
      "async function recoverPostTerminalPersistence",
      "function publishSteeringConversation",
    );
    expect(postTerminalRecovery).toContain("postTerminalRecoveryRef.current");
    expect(postTerminalRecovery).toContain('piInvocationOccupancy.status !== "known"');
    expect(postTerminalRecovery).toContain("turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, convergenceDeps)");
    expect(postTerminalRecovery).not.toContain("provider(");
    expect(postTerminalRecovery).not.toContain("generatePacket(");
    expect(appSource).not.toContain("retryMirrorAppendSummary");
    expect(appSource).not.toContain("repairPiBackedMirrorDeliveryDebt");
    expect(appSource).not.toContain("retryPendingMirrorCommit");
    expect(appSource).not.toContain("resumeProjectedMirrorSynchronization");
    expect(appSource).not.toContain("resolveExactInterruptedRecovery(piInvocationOccupancy");
    expect(appSource).toContain("shouldRehydratePiProcessRoute(selectedActiveNativeLease, selectedRuntimeBusy)");
    expect(appSource).toContain("await reconcilePiInvocationOccupancy()");
    expect(streamSource).toContain('invoke("cancel_pi_invocation", { journeyId, runId })');
    expect(streamSource).toContain('invoke<PiInvocationRegistryInspection>("inspect_pi_invocations")');
    expect(streamSource).toContain('invoke<PiInvocationLeaseRelease>("release_pi_invocation_lease", { journeyId, runId })');
  });

  it("keeps late settlement publication and diagnostics scoped to the exact run", () => {
    const listener = sourceBetween(
      "useEffect(() => turnFinalizationCoordinator.subscribe((event) => {",
      "}), []);",
    );
    expect(listener).toContain("entryIdentity.authority.runId === authority.runId");
    expect(listener).toContain("entryIdentity.authority.generation === authority.generation");
    expect(listener).toContain("selectedJourneyRef.current !== authority.journeyId");
    expect(listener).toContain("upgradeMirrorCommitments(current, event.projection)");
    expect(coordinatorSource).toContain("upgradeMirrorCommitments(projection, previous)");
    const convergenceRoutine = coordinatorSource.slice(
      coordinatorSource.indexOf("convergeDelivery(journeyId, deps) {"),
      coordinatorSource.indexOf("publishSettled(authority, projection) {"),
    );
    expect(convergenceRoutine).toContain('publish(authority, settled, "settled")');
    expect(convergenceRoutine).not.toContain("conversationRef");
    expect(convergenceRoutine).not.toContain("setConversation");
    expect(appSource).toContain("updateExactSettlementError(current, authority, error)");
    // CR086: exact settlement errors are detail text for a legitimate notice, never evidence alone.
    expect(appSource).toContain("const durableSyncAttention = Boolean(durableSyncDebt) && syncAttention.attention;");
    expect(appSource).toContain("syncAttention.attention ? exactSettlementErrors : {}");
    expect(appSource).not.toContain("setJourneyMirrorCommitError");
  });

  it("mounts the shared dispatcher once and leaves mock streaming Tauri-free", () => {
    expect(appSource).toContain("piProcessEventDispatcher.mount()");
    expect(appSource).toContain("piProcessEventDispatcher.dispose()");
    expect(streamSource).not.toContain('from "@tauri-apps/api/event"');
    expect(mockSource).not.toContain("@tauri-apps/api");
    expect(mockSource).not.toContain("piProcessEventDispatcher");
  });
});
