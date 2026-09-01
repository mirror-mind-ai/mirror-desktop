import type { JourneyConversation } from "../domain/journeyConversation";
import type { PiInvocationOccupancyState } from "./piInvocationOccupancy";
import {
  hasActiveOrFinalizingJourneyRuntime,
  isJourneyRuntimeActiveOrFinalizing,
  selectJourneyRuntime,
  selectJourneyRuntimeConversation,
  type JourneyRuntimeEntry,
  type JourneyRuntimeState,
} from "./journeyRuntimeState";

export type JourneyNavigationIntent = "pointer" | "keyboard-enter" | "keyboard-space" | "other";

export type JourneyConversationLoadToken = Readonly<{
  journeyId: string;
  sequence: number;
}>;

export type JourneyConversationLoadCoordinator = {
  begin(journeyId: string): JourneyConversationLoadToken;
  isCurrent(token: JourneyConversationLoadToken, selectedJourneyId: string): boolean;
  cancel(token: JourneyConversationLoadToken): void;
};

export type JourneyNavigationPresentation = {
  selectedRuntime: JourneyRuntimeEntry;
  conversation?: JourneyConversation;
  messages: JourneyConversation["messages"];
  warnings: string[];
  diagnostics: string[];
  mirrorCommitError?: string;
  runtimeBusy: boolean;
  cancelVisible: boolean;
  draftEditable: true;
  sendBlocked: boolean;
  attachmentsBlocked: boolean;
};

export function resolveJourneySelection(
  currentJourneyId: string,
  targetJourneyId: string,
  intent: JourneyNavigationIntent,
): string {
  return intent === "pointer" || intent === "keyboard-enter" || intent === "keyboard-space"
    ? targetJourneyId
    : currentJourneyId;
}

export function shouldSubmitJourneyDraft(
  input: { key: string; shiftKey: boolean },
  presentation: JourneyNavigationPresentation,
  admissionBlocked = false,
): boolean {
  return input.key === "Enter"
    && !input.shiftKey
    && !presentation.sendBlocked
    && !admissionBlocked;
}

export function createJourneyConversationLoadCoordinator(): JourneyConversationLoadCoordinator {
  let sequence = 0;
  let current: JourneyConversationLoadToken | undefined;
  return {
    begin(journeyId) {
      current = Object.freeze({ journeyId, sequence: ++sequence });
      return current;
    },
    isCurrent(token, selectedJourneyId) {
      return current === token && token.journeyId === selectedJourneyId;
    },
    cancel(token) {
      if (current === token) current = undefined;
    },
  };
}

export function resolveJourneyConversationRestore(
  state: JourneyRuntimeState,
  journeyId: string,
  generation: number,
): { runtimeConversation?: JourneyConversation; allowPersistedRecovery: boolean } {
  const runtimeConversation = selectJourneyRuntimeConversation(state, journeyId, generation);
  return { runtimeConversation, allowPersistedRecovery: !runtimeConversation };
}

export function shouldRecoverPersistedPiTranscript(input: {
  allowPersistedRecovery: boolean;
  nativeInspectionStatus: PiInvocationOccupancyState["status"];
  ownerHasNativeLease: boolean;
}): boolean {
  return input.allowPersistedRecovery
    && input.nativeInspectionStatus === "known"
    && !input.ownerHasNativeLease;
}

export function deriveJourneyNavigationPresentation(input: {
  runtimeState: JourneyRuntimeState;
  selectedJourneyId: string;
  loadedConversation?: JourneyConversation;
  mirrorCommitErrors?: Record<string, string | undefined>;
}): JourneyNavigationPresentation {
  const selectedRuntime = selectJourneyRuntime(input.runtimeState, input.selectedJourneyId);
  const generation = selectedRuntime.conversationSnapshot?.liveIdentity.generation;
  const runtimeConversation = generation === undefined
    ? undefined
    : selectJourneyRuntimeConversation(input.runtimeState, input.selectedJourneyId, generation);
  const loadedConversation = input.loadedConversation?.journeyId === input.selectedJourneyId
    ? input.loadedConversation
    : undefined;
  const conversation = runtimeConversation ?? loadedConversation;
  const runtimeBusy = hasActiveOrFinalizingJourneyRuntime(input.runtimeState);
  const cancelVisible = selectedRuntime.mode === "live"
    && selectedRuntime.agentRun.status === "running"
    && Boolean(selectedRuntime.identity);
  return {
    selectedRuntime,
    conversation,
    messages: conversation?.messages ?? [],
    warnings: selectedRuntime.warnings,
    diagnostics: selectedRuntime.diagnostics,
    mirrorCommitError: input.mirrorCommitErrors?.[input.selectedJourneyId],
    runtimeBusy,
    cancelVisible,
    draftEditable: true,
    sendBlocked: isJourneyRuntimeActiveOrFinalizing(selectedRuntime),
    attachmentsBlocked: runtimeBusy,
  };
}
