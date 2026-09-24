import {
  Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { mockPiAgentStream, reduceStreamedAssistantMessage, type AgentStreamEvent, type AgentStreamProvider, type TurnCorrelation } from "../agent/agentStream";
import {
  cancelLivePiInvocation,
  inspectPiInvocations,
  livePiAgentStream,
  readJourneyPiContextStats,
  releasePiInvocationLease,
  steerLivePiInvocation,
} from "../agent/piProcessStream";
import { normalizePiResponse } from "../agent/piResponseNormalizer";
import { startAgentRun } from "../agent/agentRun";
import { piProcessEventDispatcher } from "../agent/piProcessEventDispatcher";
import {
  configuredModelContextWindow,
  createProviderConfig,
  defaultPiProviderConfig,
  profileOwnedArgumentFlags,
  providerConfigToArgsText,
  providerModelLabel,
  projectAgentProfile,
  validateProviderConfig,
  type AgentInvocationMode,
} from "../agent/providerConfig";
import { groupImportedActivityByMessage } from "./ImportedActivity";
import { ConversationTranscript } from "./ConversationTranscript";
import {
  classifyChatLocalReference,
  openExternalChatLocalReference,
} from "./chatLocalReferenceNavigation";
import { classifyAssistantTurnProximity } from "./turnProximity";
import {
  attachTerminalAgentActionEvidence,
  createTerminalAgentActionEvidence,
} from "./terminalAgentActionEvidence";
import { ComposerRuntimeFooter, ComposerRuntimeStatus } from "./ComposerRuntimeFooter";
import {
  clearScheduledNotice,
  scheduleTransientComposerNotice,
  terminalStreamWarningNoticeKey,
} from "./transientComposerNotice";
import {
  contextStateForInspection,
  contextStateForLiveUsage,
  hasMatchingContextStats,
  readContextStatsWithBoundedRetry,
  type PiContextState,
} from "./contextUsageState";
import { composerPlaceholder } from "./composerPlaceholder";
import { deriveComposerTurnStatus, shouldShowConversationSyncNotice } from "./composerTurnStatus";
import { cancelExactJourneyRun } from "./journeyCancellation";
import { captureJourneyRunTerminal, type JourneyRunTerminal } from "./journeyRunTerminal";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  failPiInvocationReconciliation,
  hasBlockingPiInvocationOccupancy,
  isActivePiInvocationLease,
  piInvocationAuthorityFromRunAuthority,
  releaseAndReinspectPiInvocationLease,
  resolveExactSettlementRecovery,
  shouldRehydratePiProcessRoute,
  retainExpectedPiInvocationLease,
  validatePiInvocationRegistryInspection,
  type PiInvocationAuthorityInspection,
} from "./piInvocationOccupancy";
import { nextConversationAutoFollow } from "./conversationAutoFollow";
import {
  createJourneySettlementAuthority,
  executeCompletedSettlement,
  executeInterruptedSettlement,
  projectionCurrentTurnMatchesAuthority,
  rollbackRejectedReservation,
  validatePreFrontierSettlement,
  type JourneySettlementAuthority,
} from "./journeySettlement";
import { journeyPersistenceCoordinator } from "./journeyPersistenceCoordinator";
import {
  projectJourneySettlementErrors,
  updateExactSettlementError,
  type ExactSettlementError,
  type ExactSettlementIdentity,
} from "./settlementDiagnostics";
import {
  resolvePersistedSettlementRecovery,
  resolveRetainedLeaseForOutboxRecovery,
} from "./journeySettlementRecovery";
import { ConversationRecoveryNotice } from "./ConversationRecoveryNotice";
import { InterruptedNativeAttemptNotice } from "./InterruptedNativeAttemptNotice";
import { PendingFileAttachments } from "./PendingFileAttachments";
import { VoiceComposerControl, VoiceInstallDialog, VoiceSessionStatus, VoiceSettingsPanel } from "./VoiceComposerControl";
import { installVoiceComponent, loadVoiceComponentCatalog, loadVoiceComponentStatus, removeVoiceComponent, transcribeVoiceWav } from "./voiceTranscriptionStorage";
import { recordingToPcm16Wav, startVoiceCapture, type VoiceCaptureHandle } from "./voiceCapture";
import {
  appendTranscriptToDraft,
  idleVoiceSession,
  transcriptDestinationNotice,
  voiceErrorMessage,
  type VoiceComponentCatalog,
  type VoiceComponentStatus,
  type VoiceControlIntent,
  type VoiceLanguage,
  type VoiceInstallProgress,
  type VoiceSession,
} from "../domain/voiceTranscription";
import { chooseFileAttachments, inspectDroppedFileAttachments } from "./fileAttachmentStorage";
import { listenForFileAttachments } from "./fileAttachmentDrop";
import { JourneyAltitudeSwitcher } from "./JourneyAltitudeSwitcher";
import { JourneyAltitudeEmptyState } from "./JourneyAltitudeEmptyState";
import { JourneyDocumentationBrowser } from "./JourneyDocumentationBrowser";
import { AriadOperationalObservatory } from "./AriadOperationalObservatory";
import { TacticalJourneyWorkspace } from "./TacticalJourneyWorkspace";
import { StrategicJourneyWorkspace } from "./StrategicJourneyWorkspace";
import { JourneyProjectionNotice } from "./JourneyProjectionNotice";
import { JourneyProjectionLoadingState } from "./JourneyProjectionLoadingState";
import { JourneyThreadState, type JourneyThreadDisplayState } from "./JourneyThreadState";
import { JourneyArrivalSurface } from "./JourneyArrivalSurface";
import { EmptyDesktopConversation } from "./EmptyDesktopConversation";
import { FocusedConversationSidebar } from "./FocusedConversationSidebar";
import { FocusedSidebarResizeHandle } from "./FocusedSidebarResizeHandle";
import { loadFocusedSidebarWidth, saveFocusedSidebarWidth } from "./focusedSidebarWidthStorage";
import { MirrorHistoryActionSurface } from "./MirrorHistoryActionSurface";
import { ConversationDetailHeader } from "./ConversationDetailHeader";
import {
  createDesktopConversation, deleteDesktopConversation, loadDesktopConversationCatalog,
  reconcileDesktopConversationCatalogEntry, renameDesktopConversation, restartDesktopConversation,
  suggestDesktopConversationTitle,
} from "./conversationSpaceStorage";
import { loadMirrorConversationCatalog, openMirrorConversationInTerminal, renameMirrorConversation } from "./mirrorConversationCatalog";
import { nextDesktopConversationTitle, normalizeConversationTitle, validateConversationTitle } from "./conversationTitles";
import {
  loadConversationSegments, publishConversationSegmentProjections, refreshConversationSegments,
} from "./conversationSegmentStorage";
import { partitionConversationBySegments } from "../domain/conversationSegmentProjection";
import { decideConversationAvailability } from "../domain/conversationAvailability";
import { deriveDurableSynchronizationDebt } from "../domain/durableSynchronizationStatus";
import {
  appendAndAcknowledgeProjection,
  enqueueProjectionOutbox,
  turnFinalizationCoordinator,
  upgradeMirrorCommitments,
  validateExactOutboxSummary,
} from "./turnFinalizationCoordinator";
import { createProductionFinalizationPorts } from "./turnFinalizationPorts";
import {
  clearUnsentDraft,
  recordUnsentDraft,
  resolveUnsentReason,
  type UnsentDraftNotices,
} from "./unsentDraftNotice";
import { unavailableModelReason } from "../domain/modelAvailability";
import {
  deriveInactiveNativeAttemptCandidate,
  shouldPresentInactiveNativeAttempt,
  type InactiveNativeAttemptCandidate,
} from "../domain/inactiveNativeAttempt";
import {
  decideConversationRecoveryRoutes,
  type ConversationRecoveryRouteId,
} from "../domain/conversationRecovery";
import { inspectDedicatedPiTranscript, loadDedicatedPiUserEntries, loadNautilusJourneyThread, provisionNautilusJourneyThread, restartNautilusJourneyThread, retireLegacyParityState } from "./journeyThreadStorage";
import { classifyNautilusJourneyThread } from "../domain/nautilusJourneyThread";
import { projectGenerationHistory } from "../domain/journeyThreadRestart";
import {
  OperationalWorkspaceSwitcher,
  type OperationalSurface,
} from "./OperationalWorkspaceSwitcher";
import { defaultJourneyAltitude } from "./journeyAltitudePreview";
import { normalizeJourneySurfaceSelection } from "./journeySurfaceAvailability";
import { loadJourneyProjections } from "./journeyProjectionStorage";
import {
  deriveLatestCertifiedModeTransition,
  extractCertifiedModeTransition,
  type CertifiedModeTransition,
} from "./mirrorModeState";
import {
  initialRuntimeProjectionState,
  mergeRuntimeContextUsage,
  reduceRuntimeProjection,
} from "./runtimeActivityModel";
import {
  createInitialJourneyRuntimeState,
  hasActiveOrFinalizingJourneyRuntime,
  identityJourneyId,
  isJourneyRuntimeActiveOrFinalizing,
  journeyRuntimeReducer,
  selectJourneyRuntime,
  selectJourneyRuntimeConversation,
  selectJourneyRuntimeOwnerPhase,
  type JourneyRunIdentity,
} from "./journeyRuntimeState";
import { withCertifiedPersona } from "./conversationPresentation";
import {
  createJourneyConversationLoadCoordinator,
  deriveJourneyNavigationPresentation,
  journeySearchReducer,
  resolveJourneyConversationRestore,
  resolveJourneySelection,
  shouldPreserveReadyJourneyConversation,
  shouldSubmitJourneyDraft,
  type JourneyNavigationIntent,
} from "./journeyNavigationCoordinator";
import {
  loadDedicatedJourneyConversation,
  saveActiveSettlementProjection,
  saveAdmittedTurnProjection,
  saveDedicatedJourneyConversation,
  savePostFrontierReceiptProjection,
} from "./journeyConversationStorage";
import { loadJourneyPreferences, saveJourneyPreferences } from "./journeyPreferenceStorage";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { loadComposerDrafts, saveComposerDrafts } from "./composerDraftStorage";
import { createComposerDraftPersistence, type ComposerDraftPersistence } from "./composerDraftPersistence";
import {
  advanceTurnJournal,
  decideTurnJournalRecovery,
  decideTurnJournalTerminal,
  findBlockingTurnJournalRecord,
  findExactTurnJournalRecord,
  hasFreshCompleteTurnJournalEvidence,
  isTurnJournalSuccessorEligible,
  interruptInactiveTurnJournal,
  loadTurnJournal,
  providerTerminalFailureDetail,
  requireExactTurnJournalRecord,
  type TurnJournalRecord,
} from "./turnJournal";
import { listPiModels, loadAgentSettings, saveAgentSettings, type PiModelCatalogEntry } from "./agentSettingsStorage";
import { loadJourneyRegistry, refreshJourneyRegistry } from "./journeyRegistryStorage";
import { chooseProjectDirectory, mutateJourneyRegistry } from "./journeyMutationStorage";
import {
  createMissionExtractionPacket,
  createUserConversationMessage,
  grammarStateFromViewModel,
  type ConversationMessage,
} from "../agent/piTaskPacket";
import {
  availableConversationActions,
  createAgentHandoffPrompt,
  conversationDraftKey,
  desktopConversationThread,
  reduceConversationFocus,
  type ConversationCatalogEntry,
  type ConversationFocusState,
  DEFAULT_FOCUSED_SIDEBAR_WIDTH,
} from "../domain/conversationSpaces";
import {
  createJourneyConversation,
  createDedicatedJourneyConversation,
  restoreDedicatedJourneyConversation,
  replaceJourneyConversationMessages,
} from "../domain/journeyConversation";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";
import {
  commitHarnessTurn,
  pendingMirrorTurnRepair,
  stageCorrelatedTurn,
} from "../domain/threeBodyTurnCommit";
import {
  applyMirrorAppendReceipt,
  applyPiExecutionEvidence,
  classifyMirrorAppendMessagePair,
  classifyPendingMirrorAppend,
  createMirrorAppendOutboxItem,
} from "../domain/mirrorAppendOutbox";
import {
  acknowledgeMirrorAppendItem,
  appendMirrorOutboxItem,
  deliverPiBackedMirrorOutboxItem,
  enqueueMirrorAppendItem,
  listMirrorAppendOutbox,
  reconcilePiBackedMirrorDeliveryDebt,
  type MirrorAppendOutboxSummary,
} from "./mirrorAppendOutboxStorage";
import {
  deriveOrderedSidebarJourneys,
  filterCollapsedJourneyTree,
  findJourneyById,
  flattenJourneyRegistry,
  markJourneyRecent,
  orderPinnedJourneys,
  orderSearchResults,
  reconcileReloadedJourneyState,
  searchJourneyRegistry,
  type JourneyListOrder,
  type JourneyPreferences,
  type JourneyRegistry,
  type SidebarJourneyItem,
} from "../domain/journeyRegistry";
import type { JourneyConversation, SteeringEvidence } from "../domain/journeyConversation";
import {
  appendPendingSteering,
  reconcileSteeringUserEntries,
  settleUnconsumedSteering,
  transitionSteering,
} from "../domain/steeringState";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority, samePiProcessEventAuthority } from "../domain/runAuthority";
import { classifyDedicatedTurnState, dedicatedTurnBlocksNewInvocation, interruptDedicatedTurn } from "../domain/dedicatedTurnCommit";
import {
  defaultJourneyPreferenceState,
  sanitizeJourneyPreferenceState,
  type JourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";
import { appendJourneyPosition, createMutationRequest, journeyAdministrationError, replacementJourneyAfterDeletion, suggestJourneySlug, type JourneyMutationRequest } from "../domain/journeyMutation";
import {
  agentThinkingLevels,
  createDefaultAgentSettings,
  describeEffectiveAgentProfile,
  resolveAgentProfile,
  setJourneyAgentOverride,
  type AgentModelSelection,
  type AgentSettings,
  type AgentThinkingLevel,
} from "../domain/agentProfile";
import type { NautilusViewModel } from "../domain/nautilusViewModel";
import {
  COMPOSER_DRAFT_MAX_CHARS,
  updateComposerDraft,
  type ComposerDraftMap,
} from "../domain/composerDrafts";
import type { JourneyProjectionBundle } from "../domain/journeyProjections";
import { applicationThemeGroups, type ApplicationTheme } from "../domain/applicationTheme";
import {
  journeySystemIcons,
  isJourneySystemIconSelected,
  sanitizeJourneyAppearanceById,
  type JourneyAppearanceById,
  type JourneySystemIconId,
} from "../domain/journeyAppearance";
import {
  addFileAttachments,
  MAX_FILE_ATTACHMENTS,
  removeFileAttachment,
  toAgentFileReferences,
  type FileAttachment,
  type FileAttachmentResponse,
} from "../domain/fileAttachments";
import appIconUrl from "../../src-tauri/icons/icon.svg";
import {
  chooseRuntimeDirectory, inspectRuntimeBindingCandidate, inspectRuntimeChannel,
  saveRuntimeBinding, validateRuntimeBinding,
  type RuntimeBinding, type RuntimeChannelDiagnostic,
} from "./runtimeChannelStorage";
import { JourneyTreeIcon } from "./JourneyTreeIcon";
import { JourneySearchControl } from "./JourneySearchControl";
import { JourneyItemCopy } from "./JourneyItemCopy";
import { JourneyItemContextMenu } from "./JourneyItemContextMenu";
import { cacheJourneyCustomImage, JourneyVisualMark } from "./JourneyVisualMark";
import {
  importJourneyCustomImage,
  removeJourneyCustomImage,
} from "./journeyAppearanceStorage";
import { recordJourneyLastWorked, relativeLastWorkedLabel } from "./journeyLastWorked";
import { followRecentJourneyAdmission } from "./recentJourneyAdmissionFollower";
import {
  activateJourneyTree,
  defaultNewJourneyParentId,
  sidebarToggleLabel,
  toggleJourneySidebar,
} from "./journeySidebarPresentation";
import { SettingsTabList, type SettingsTab } from "./SettingsTabList";
import { SelfUpdatePanel } from "./SelfUpdatePanel";
import { SelfUpdateNotification } from "./SelfUpdateNotification";
import { currentMirrorDesktopVersion, type SelfUpdateCheckResult } from "./selfUpdateStorage";
import { loadResolvedWhatsNewState, saveWhatsNewState } from "./whatsNewStorage";
import { acknowledgeWhatsNew, resolveWhatsNewState, type ResolvedWhatsNewState } from "../domain/whatsNewState";
import { UserAvatarSettings } from "./UserAvatar";
import { importUserAvatar, loadUserAvatar, removeUserAvatar } from "./userAvatarStorage";
import { useDelayedVisibility } from "./useDelayedVisibility";

type AppProps = {
  model: NautilusViewModel;
};

const DEVELOPMENT_BADGE_LABEL = "DEV LAB";
const EVALUATION_BADGE_LABEL = "EVAL";

const journeyVisuals: Record<string, { icon: string; accent: string }> = {
  "vida-criativa": { icon: "✺", accent: "green" },
  nautilus: { icon: "◌", accent: "teal" },
  "nautilus-harness": { icon: "◌", accent: "teal" },
  amplia: { icon: "✦", accent: "violet" },
  "lideranca-soberana": { icon: "◇", accent: "gold" },
  "livro-lideranca-soberana": { icon: "✎", accent: "gold" },
  "mirror-dev": { icon: "⬡", accent: "blue" },
  softwarezen: { icon: "✺", accent: "green" },
  ariad: { icon: "△", accent: "rose" },
};

function journeyVisual(journeyId: string) {
  return journeyVisuals[journeyId] ?? { icon: "•", accent: "teal" };
}

function sidebarDescription(journey: SidebarJourneyItem) {
  return journey.breadcrumb.length > 1 ? journey.breadcrumb.slice(0, -1).join(" / ") : "~";
}

async function* missingRunAuthorityStream(): AsyncGenerator<AgentStreamEvent> {
  yield createMissingRunAuthorityEvent();
  yield { type: "done" };
}

function createMissingRunAuthorityEvent() {
  return { type: "error" as const, message: "Live dedicated invocation requires RunAuthority." };
}

function applyCertifiedModeTransition(
  conversation: JourneyConversation,
  transition: CertifiedModeTransition,
  sourceId: string,
): JourneyConversation {
  const mode = transition.kind === "activate" ? transition.mode : null;
  if (
    conversation.certifiedMirrorMode?.mode === mode
    && conversation.certifiedMirrorMode.sourceId === sourceId
  ) {
    return conversation;
  }
  return {
    ...conversation,
    certifiedMirrorMode: { mode, certifiedAt: new Date().toISOString(), sourceId },
  };
}

const emptyJourneyRegistry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "fixture",
  syncedAt: "1970-01-01T00:00:00.000Z",
  roots: [],
};

const initialMessages: ConversationMessage[] = [
  {
    id: "assistant-opening",
    role: "assistant",
    content:
      "How can I help you?",
    createdAt: "2026-08-21T00:00:00.000Z",
  },
];

function waitForCatalogLoadingFeedbackPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

export function App({ model }: AppProps) {
  const [selectedJourney, setSelectedJourney] = useState(defaultJourneyPreferenceState.activeJourneyId ?? "");
  const [selectedAltitude, setSelectedAltitude] = useState(defaultJourneyAltitude);
  const [selectedOperationalSurface, setSelectedOperationalSurface] = useState<OperationalSurface>("chat");
  const presentedJourneySurface = normalizeJourneySurfaceSelection(selectedAltitude, selectedOperationalSurface);
  const presentedAltitude = presentedJourneySurface.altitude;
  const presentedOperationalSurface = presentedJourneySurface.operationalSurface;
  const [artifactNavigationRequest, setArtifactNavigationRequest] = useState<{
    journeyId: string;
    relativePath: string;
    requestId: number;
    expandPreview: boolean;
  }>();
  const [localReferenceError, setLocalReferenceError] = useState<string>();
  const [dismissedStreamWarningKey, setDismissedStreamWarningKey] = useState<string>();
  const [journeyPreferences, setJourneyPreferences] = useState<JourneyPreferences>({
    pinnedJourneyIds: defaultJourneyPreferenceState.pinnedJourneyIds,
    activeJourneyId: defaultJourneyPreferenceState.activeJourneyId,
    recentJourneyIds: defaultJourneyPreferenceState.recentJourneyIds,
  });
  const [journeySearch, dispatchJourneySearch] = useReducer(journeySearchReducer, "");
  const [journeyListOrder, setJourneyListOrder] = useState<JourneyListOrder>(defaultJourneyPreferenceState.journeyListOrder);
  const [sidebarCompact, setSidebarCompact] = useState(defaultJourneyPreferenceState.sidebarCompact);
  const [lastWorkedAtByJourneyId, setLastWorkedAtByJourneyId] = useState(defaultJourneyPreferenceState.lastWorkedAtByJourneyId);
  const [applicationTheme, setApplicationTheme] = useState<ApplicationTheme>(defaultJourneyPreferenceState.applicationTheme);
  const [journeyAppearanceById, setJourneyAppearanceById] = useState<JourneyAppearanceById>(defaultJourneyPreferenceState.journeyAppearanceById);
  const [journeyAppearanceBusy, setJourneyAppearanceBusy] = useState(false);
  const [journeyAppearanceMessage, setJourneyAppearanceMessage] = useState<string>();
  const [userAvatar, setUserAvatar] = useState<string>();
  const [userAvatarBusy, setUserAvatarBusy] = useState(false);
  const [userAvatarMessage, setUserAvatarMessage] = useState<string>();
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const [collapsedJourneyIds, setCollapsedJourneyIds] = useState<Set<string>>(() => new Set());
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [journeyTreeMenuOpen, setJourneyTreeMenuOpen] = useState(false);
  const [journeyRegistryRefreshState, setJourneyRegistryRefreshState] = useState<"idle" | "refreshing" | "succeeded" | "failed">("idle");
  const [journeyRegistryRefreshMessage, setJourneyRegistryRefreshMessage] = useState<string | undefined>();
  const [journeyItemMenu, setJourneyItemMenu] = useState<{ journeyId: string; x: number; y: number } | null>(null);
  const [journeyAdminDialog, setJourneyAdminDialog] = useState<{ mode: "create" | "edit" | "move" | "delete"; journeyId?: string; parentId?: string } | null>(null);
  const [journeyAdminName, setJourneyAdminName] = useState("");
  const [journeyAdminSlug, setJourneyAdminSlug] = useState("");
  const [journeyAdminDescription, setJourneyAdminDescription] = useState("");
  const [journeyAdminParent, setJourneyAdminParent] = useState("");
  const [journeyAdminPosition, setJourneyAdminPosition] = useState(0);
  const [journeyAdminPath, setJourneyAdminPath] = useState("");
  const [journeyAdminState, setJourneyAdminState] = useState<"idle" | "saving" | "failed">("idle");
  const [journeyAdminMessage, setJourneyAdminMessage] = useState<string | undefined>();
  const [journeyAdminPendingRequest, setJourneyAdminPendingRequest] = useState<JourneyMutationRequest | null>(null);
  const [draggedJourneyId, setDraggedJourneyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [composerDrafts, setComposerDrafts] = useState<ComposerDraftMap>({});
  const composerDraftsRef = useRef<ComposerDraftMap>({});
  const composerDraftPersistenceRef = useRef<ComposerDraftPersistence | null>(null);
  if (!composerDraftPersistenceRef.current) {
    composerDraftPersistenceRef.current = createComposerDraftPersistence({
      save: saveComposerDrafts,
      idleMs: 750,
      onError: (error) => console.warn("Could not persist Composer drafts.", error),
    });
  }
  const composerDraftPersistence = composerDraftPersistenceRef.current;
  const [composerDraftsLoaded, setComposerDraftsLoaded] = useState(false);
  const [pendingFileAttachments, setPendingFileAttachments] = useState<FileAttachment[]>([]);
  const [fileAttachmentMaxFiles, setFileAttachmentMaxFiles] = useState(MAX_FILE_ATTACHMENTS);
  const [fileAttachmentBusy, setFileAttachmentBusy] = useState(false);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [fileAttachmentError, setFileAttachmentError] = useState<string>();
  const [conversation, setConversation] = useState(() =>
    createJourneyConversation({ journeyId: selectedJourney, initialMessages }),
  );
  const [inactiveNativeAttempt, setInactiveNativeAttempt] = useState<InactiveNativeAttemptCandidate>();
  const [journeyRuntimeState, dispatchJourneyRuntime] = useReducer(
    journeyRuntimeReducer,
    undefined,
    createInitialJourneyRuntimeState,
  );
  const [runStartReservation, setRunStartReservation] = useState<JourneyRunIdentity | undefined>(undefined);
  const [piInvocationOccupancy, setPiInvocationOccupancy] = useState(createUnknownPiInvocationOccupancy);
  const [piInvocationBootstrapComplete, setPiInvocationBootstrapComplete] = useState(false);
  const [piContextState, setPiContextState] = useState<PiContextState>("checking");
  const [isRetryingMirrorCommit, setIsRetryingMirrorCommit] = useState(false);
  const postTerminalRecoveryRef = useRef(false);
  const [mirrorCommitErrors, setMirrorCommitErrors] = useState<Record<string, string | undefined>>({});
  const [exactSettlementErrors, setExactSettlementErrors] = useState<Record<string, ExactSettlementError>>({});
  const [mirrorOutboxItems, setMirrorOutboxItems] = useState<MirrorAppendOutboxSummary[]>([]);
  const [journeyTurnJournalRecords, setJourneyTurnJournalRecords] = useState<TurnJournalRecord[]>([]);
  const [unsentDraftNotices, setUnsentDraftNotices] = useState<UnsentDraftNotices>({});
  // CV-008.DS-005 — voice prompt composition. Recording and transcription are
  // Desktop-local; the destination draft key is captured at recording start.
  const [voiceStatus, setVoiceStatus] = useState<VoiceComponentStatus>();
  const [voiceSession, setVoiceSession] = useState<VoiceSession>(idleVoiceSession);
  const [voiceInstalling, setVoiceInstalling] = useState(false);
  const [voiceRemoving, setVoiceRemoving] = useState(false);
  const [voiceInstallProgress, setVoiceInstallProgress] = useState<VoiceInstallProgress>();
  const [voiceInstallDialogOpen, setVoiceInstallDialogOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string>();
  const [voiceNotice, setVoiceNotice] = useState<string>();
  const [voiceElapsedSeconds, setVoiceElapsedSeconds] = useState(0);
  const [voiceCatalog, setVoiceCatalog] = useState<VoiceComponentCatalog>();
  const [voiceCatalogLoading, setVoiceCatalogLoading] = useState(false);
  const [voiceModelId, setVoiceModelId] = useState<string>();
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>(defaultJourneyPreferenceState.voiceLanguage);
  const voiceCaptureRef = useRef<VoiceCaptureHandle | undefined>(undefined);
  const voiceOriginRef = useRef<{ draftKey: string; label: string; language: VoiceLanguage } | undefined>(undefined);
  const [providerConfig, setProviderConfig] = useState(defaultPiProviderConfig);
  const [providerCommand, setProviderCommand] = useState(defaultPiProviderConfig.command);
  const [providerArgsText, setProviderArgsText] = useState(providerConfigToArgsText(defaultPiProviderConfig));
  const [providerUseStdin, setProviderUseStdin] = useState(defaultPiProviderConfig.useStdin);
  const [providerSafeTestMode, setProviderSafeTestMode] = useState(defaultPiProviderConfig.safeTestMode);
  const [providerInvocationMode, setProviderInvocationMode] = useState<AgentInvocationMode>(defaultPiProviderConfig.invocationMode);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(() => createDefaultAgentSettings());
  const [agentSettingsState, setAgentSettingsState] = useState<"checking" | "ready" | "saving" | "error">("checking");
  const [agentSettingsMessage, setAgentSettingsMessage] = useState<string | undefined>();
  const [agentProfileConfigured, setAgentProfileConfigured] = useState<boolean>();
  const [piModelCatalog, setPiModelCatalog] = useState<PiModelCatalogEntry[]>([]);
  const [piModelCatalogState, setPiModelCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [onboardingModelDraft, setOnboardingModelDraft] = useState("");
  const [globalModelDraft, setGlobalModelDraft] = useState(() => modelOptionValue(createDefaultAgentSettings().globalProfile.model));
  const [globalThinkingDraft, setGlobalThinkingDraft] = useState<AgentThinkingLevel>(createDefaultAgentSettings().globalProfile.thinkingLevel);
  const [journeyModelDraft, setJourneyModelDraft] = useState("inherit");
  const [journeyThinkingDraft, setJourneyThinkingDraft] = useState<AgentThinkingLevel | "inherit">("inherit");
  const [journeyAgentProfileOpen, setJourneyAgentProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [reviewedUpdate, setReviewedUpdate] = useState<SelfUpdateCheckResult & { status: "available" }>();
  const [whatsNewState, setWhatsNewState] = useState<ResolvedWhatsNewState>();
  const [conversationFocus, dispatchConversationFocus] = useReducer(
    reduceConversationFocus,
    { kind: "all_journeys" } as ConversationFocusState,
  );
  const [conversationCatalog, setConversationCatalog] = useState<ConversationCatalogEntry[]>([]);
  const [conversationCatalogStatus, setConversationCatalogStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [conversationCatalogError, setConversationCatalogError] = useState<string>();
  const [historicalSegmentCount, setHistoricalSegmentCount] = useState(0);
  const [loadedHistoricalSegmentCount, setLoadedHistoricalSegmentCount] = useState(0);
  const [historicalSegmentState, setHistoricalSegmentState] = useState<"idle" | "loading" | "error">("idle");
  const [focusedJourneyRootThreadId, setFocusedJourneyRootThreadId] = useState<string>();
  const [conversationActionBusy, setConversationActionBusy] = useState(false);
  const [conversationActionMessage, setConversationActionMessage] = useState<string>();
  const [conversationCreateOpen, setConversationCreateOpen] = useState(false);
  const [conversationCreateDraft, setConversationCreateDraft] = useState("");
  const [conversationCreateError, setConversationCreateError] = useState<string>();
  const [mirrorRenameTarget, setMirrorRenameTarget] = useState<{
    journeyId: string;
    entry: ConversationCatalogEntry;
  }>();
  const [mirrorRenameDraft, setMirrorRenameDraft] = useState("");
  const [mirrorRenameError, setMirrorRenameError] = useState<string>();
  const [conversationDeleteTarget, setConversationDeleteTarget] = useState<Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>>();
  const [conversationDeleteError, setConversationDeleteError] = useState<string>();
  const [focusedSidebarWidth, setFocusedSidebarWidth] = useState(DEFAULT_FOCUSED_SIDEBAR_WIDTH);
  const [runtimeChannel, setRuntimeChannel] = useState<RuntimeChannelDiagnostic>();

  useEffect(() => {
    if (!runtimeChannel?.channel) return;
    setFocusedSidebarWidth(loadFocusedSidebarWidth(runtimeChannel.channel, window.innerWidth));
  }, [runtimeChannel?.channel]);

  useEffect(() => {
    const resize = () => setFocusedSidebarWidth((current) => saveFocusedSidebarWidth(
      runtimeChannel?.channel ?? "checking", current, window.innerWidth,
    ));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [runtimeChannel?.channel]);

  useEffect(() => {
    let cancelled = false;
    void currentMirrorDesktopVersion()
      .then((version) => loadResolvedWhatsNewState(version))
      .then((state) => { if (!cancelled) setWhatsNewState(state); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function acknowledgeInstalledRelease() {
    const installed = whatsNewState?.installed;
    if (!installed) return;
    const acknowledged = acknowledgeWhatsNew(whatsNewState, installed.version);
    await saveWhatsNewState(acknowledged);
    setWhatsNewState(resolveWhatsNewState(acknowledged, installed.version));
  }
  const [runtimeChannelError, setRuntimeChannelError] = useState<string>();
  const [runtimeMirrorRoot, setRuntimeMirrorRoot] = useState("");
  const [runtimeMirrorHome, setRuntimeMirrorHome] = useState("");
  const [runtimeMirrorUser, setRuntimeMirrorUser] = useState("");
  const [runtimeBindingState, setRuntimeBindingState] = useState<"idle" | "validating" | "saving">("idle");
  const [runtimeBindingFeedback, setRuntimeBindingFeedback] = useState<string>();
  const [runtimeOnboardingState, setRuntimeOnboardingState] = useState<"idle" | "importing" | "empty" | "error" | "ready">("idle");
  const [runtimeOnboardingEditing, setRuntimeOnboardingEditing] = useState(false);
  const [runtimeOnboardingMessage, setRuntimeOnboardingMessage] = useState<string>();
  const [journeyMenuOpen, setJourneyMenuOpen] = useState(false);
  const [closeConfirmationOpen, setCloseConfirmationOpen] = useState(false);
  const [closeConfirmationBusy, setCloseConfirmationBusy] = useState(false);
  const [closeConfirmationError, setCloseConfirmationError] = useState<string>();
  const [conversationSearchOpen, setConversationSearchOpen] = useState(false);
  const [conversationTurnNavigatorOpen, setConversationTurnNavigatorOpen] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [journeyThreadState, setJourneyThreadState] = useState<JourneyThreadDisplayState>({ kind: "loading" });
  const [startingJourneyId, setStartingJourneyId] = useState<string | undefined>();
  const [journeyStartPhase, setJourneyStartPhase] = useState<string | undefined>();
  const [journeyStartError, setJourneyStartError] = useState<string | undefined>();
  const [journeyReloadStatus, setJourneyReloadStatus] = useState<string | undefined>();
  const [isJourneyReloading, setIsJourneyReloading] = useState(false);
  const [restartConfirmationOpen, setRestartConfirmationOpen] = useState(false);
  const [blockingTurnJournalRecord, setBlockingTurnJournalRecord] = useState<TurnJournalRecord>();
  const [turnRecoveryBusy, setTurnRecoveryBusy] = useState(false);
  const [turnRecoveryError, setTurnRecoveryError] = useState<string>();
  const [turnRecoveryNotice, setTurnRecoveryNotice] = useState<string>();
  const [activeRecoveryRoute, setActiveRecoveryRoute] = useState<ConversationRecoveryRouteId>();
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [loadedJourneyRegistry, setLoadedJourneyRegistry] = useState<JourneyRegistry>(emptyJourneyRegistry);
  const [journeyProjections, setJourneyProjections] = useState<JourneyProjectionBundle | undefined>();
  const [projectionLoadStatus, setProjectionLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const chatStreamRef = useRef<HTMLElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatAutoFollowRef = useRef(true);
  const journeyMenuRef = useRef<HTMLDivElement | null>(null);
  const journeyTreeButtonRef = useRef<HTMLButtonElement | null>(null);
  const journeyTreeMenuRef = useRef<HTMLDivElement | null>(null);
  const journeyItemMenuTriggerRef = useRef<HTMLElement | null>(null);
  const journeyListRef = useRef<HTMLDivElement | null>(null);
  const journeyListPresentationRef = useRef({ order: journeyListOrder, pinnedOnly });
  const checkedMirrorTurnRef = useRef<Set<string>>(new Set());
  const artifactNavigationSequenceRef = useRef(0);
  const conversationRef = useRef<JourneyConversation>(conversation);
  const selectedJourneyRef = useRef(selectedJourney);
  const journeyRuntimeStateRef = useRef(journeyRuntimeState);
  const conversationLoadCoordinatorRef = useRef(createJourneyConversationLoadCoordinator());
  const runStartReservationRef = useRef<JourneyRunIdentity | undefined>(undefined);
  const piInvocationInspectionSequenceRef = useRef(0);
  const steeringEvidenceByRunRef = useRef<Record<string, SteeringEvidence[]>>({});
  conversationRef.current = conversation;
  selectedJourneyRef.current = selectedJourney;
  journeyRuntimeStateRef.current = journeyRuntimeState;
  journeyListPresentationRef.current = { order: journeyListOrder, pinnedOnly };

  const currentState = useMemo(() => grammarStateFromViewModel(model), [model]);
  const journeyRegistry = loadedJourneyRegistry;
  const sidebarJourneys = useMemo(
    () => deriveOrderedSidebarJourneys(journeyRegistry, journeyPreferences, journeyListOrder),
    [journeyPreferences, journeyRegistry, journeyListOrder],
  );
  const searchResults = useMemo(
    () =>
      orderSearchResults(searchJourneyRegistry(journeyRegistry, journeySearch), journeyPreferences, journeyListOrder).map((journey) => ({
        ...journey,
        pinned: journeyPreferences.pinnedJourneyIds.includes(journey.id),
        active: journey.id === selectedJourney,
        reasonVisible: "search" as const,
      })),
    [journeyPreferences, journeyListOrder, journeySearch, selectedJourney, journeyRegistry],
  );
  const visibleSidebarJourneys = useMemo(() => {
    const orderedJourneys = journeySearch.trim()
      ? searchResults
      : journeyListOrder === "tree"
        ? filterCollapsedJourneyTree(sidebarJourneys, collapsedJourneyIds)
        : sidebarJourneys;
    return pinnedOnly ? orderPinnedJourneys(orderedJourneys, journeyPreferences.pinnedJourneyIds) : orderedJourneys;
  }, [collapsedJourneyIds, journeyListOrder, journeyPreferences.pinnedJourneyIds, journeySearch, pinnedOnly, searchResults, sidebarJourneys]);
  const selectedJourneyItem = findJourneyById(journeyRegistry, selectedJourney) ??
    sidebarJourneys[0] ?? {
      id: selectedJourney,
      name: selectedJourney,
      breadcrumb: [selectedJourney],
      depth: 0,
    };
  const selectedJourneyVisual = journeyVisual(selectedJourneyItem.id);
  const selectedJourneyAppearance = journeyAppearanceById[selectedJourneyItem.id];
  const selectedJourneyBasePath = selectedJourneyItem.projectPath;
  const selectedConversationSpace = conversationFocus.kind === "focused_journey" && conversationFocus.journeyId === selectedJourney
    ? conversationFocus.selection
    : { kind: "journey_workspace" as const, journeyId: selectedJourney };
  const selectedConversationEntry = selectedConversationSpace.kind === "journey_workspace"
    ? undefined
    : conversationCatalog.find((entry) => entry.kind === selectedConversationSpace.kind
      && entry.conversationId === selectedConversationSpace.conversationId);
  const projectedMirrorCommitErrors = projectJourneySettlementErrors(mirrorCommitErrors, exactSettlementErrors);
  const navigationPresentation = deriveJourneyNavigationPresentation({
    runtimeState: journeyRuntimeState,
    selectedJourneyId: selectedJourney,
    loadedConversation: conversation,
    selectedThreadId: selectedConversationEntry?.kind === "desktop_conversation"
      ? selectedConversationEntry.threadId
      : conversationFocus.kind === "focused_journey" ? focusedJourneyRootThreadId : undefined,
    mirrorCommitErrors: projectedMirrorCommitErrors,
  });
  const selectedRuntime = navigationPresentation.selectedRuntime;
  const {
    agentRun,
    isStreaming,
    isFinalizingTurn,
    missionDraft: streamMissionDraft,
    warnings: streamWarnings,
    diagnostics: streamDiagnostics,
    safety: streamSafety,
    mode: streamMode,
    runtimeProjection,
    runtimeProjectionMessageId,
  } = selectedRuntime;
  const runtimeBusy = Boolean(runStartReservation)
    || navigationPresentation.runtimeBusy
    || hasBlockingPiInvocationOccupancy(piInvocationOccupancy);
  const selectedRuntimeBusy = isJourneyRuntimeActiveOrFinalizing(selectedRuntime);
  const terminalStreamWarningKey = selectedRuntimeBusy
    ? undefined
    : terminalStreamWarningNoticeKey(selectedJourney, agentRun.id, streamWarnings, agentRun.status);
  const showTransientStreamWarning = Boolean(
    terminalStreamWarningKey && terminalStreamWarningKey !== dismissedStreamWarningKey,
  );
  const piInvocationPresentation = derivePiInvocationAdmission(piInvocationOccupancy, selectedJourney);
  const runtimeBindingReady = runtimeChannel?.status === "validated";
  const mirrorCommitError = navigationPresentation.mirrorCommitError;
  const unsentDraftNotice = unsentDraftNotices[selectedJourney];
  const messages = navigationPresentation.messages;
  const presentedConversation = navigationPresentation.conversation ?? conversation;
  const presentedImportedActivity = presentedConversation.importedActivity?.events;
  const importedActivity = useMemo(
    () => groupImportedActivityByMessage(presentedImportedActivity ?? []),
    [presentedImportedActivity],
  );
  const assistantTurnProximity = useMemo(
    () => classifyAssistantTurnProximity(messages, runtimeProjectionMessageId, selectedRuntimeBusy),
    [messages, runtimeProjectionMessageId, selectedRuntimeBusy],
  );
  const effectiveAgentProfile = useMemo(
    () => resolveAgentProfile(agentSettings, selectedJourney),
    [agentSettings, selectedJourney],
  );
  const effectiveProviderConfig = useMemo(
    () => projectAgentProfile(providerConfig, effectiveAgentProfile),
    [effectiveAgentProfile, providerConfig],
  );
  const selectedCanSteer = isStreaming
    && agentRun.status === "running"
    && !isFinalizingTurn
    && selectedRuntime.identity?.kind === "live"
    && (selectedConversationEntry?.kind !== "desktop_conversation"
      || selectedRuntime.identity.authority.threadId === selectedConversationEntry.threadId)
    && effectiveProviderConfig.invocationMode === "mirror"
    && !effectiveProviderConfig.safeTestMode;
  const providerErrors = useMemo(() => validateProviderConfig(effectiveProviderConfig), [effectiveProviderConfig]);
  const onboardingModelOptions = useMemo(
    () => uniqueModelOptions(piModelCatalog.map(({ provider, model }) => ({ provider, model }))),
    [piModelCatalog],
  );
  const modelOptions = useMemo(() => uniqueModelOptions([
    ...piModelCatalog.map(({ provider, model }) => ({ provider, model })),
    agentSettings.globalProfile.model,
    effectiveAgentProfile.model,
    ...Object.values(agentSettings.journeyOverrides).flatMap((override) => override.model ? [override.model] : []),
  ]), [agentSettings, effectiveAgentProfile.model, piModelCatalog]);
  const authoritativeContextStats = conversation.authoritativeContextStats;
  const contextIdentityMatches = authoritativeContextStats
    && authoritativeContextStats.piSessionId === conversation.liveIdentity.piSessionId
    && authoritativeContextStats.generation === conversation.liveIdentity.generation
    && authoritativeContextStats.providerModel === providerModelLabel(effectiveProviderConfig);
  const reportedContextUsage = contextIdentityMatches ? authoritativeContextStats.usage : undefined;
  const pendingMirrorRepair = useMemo(
    () => pendingMirrorTurnRepair(presentedConversation),
    [presentedConversation],
  );
  const pendingSettlementRecoveryEvidence: PiInvocationAuthorityInspection | undefined = pendingMirrorRepair
    && pendingMirrorRepair.correlation.threadId
    && pendingMirrorRepair.correlation.mirrorConversationId
    ? {
        schemaVersion: "0.1.0",
        journeyId: pendingMirrorRepair.correlation.journeyId,
        runId: pendingMirrorRepair.correlation.runId,
        turnId: pendingMirrorRepair.correlation.turnId,
        threadId: pendingMirrorRepair.correlation.threadId,
        generation: pendingMirrorRepair.correlation.generation,
        piSessionId: pendingMirrorRepair.correlation.piSessionId,
        mirrorConversationId: pendingMirrorRepair.correlation.mirrorConversationId,
        harnessUserMessageId: pendingMirrorRepair.correlation.harnessUserMessageId,
        harnessAssistantMessageId: pendingMirrorRepair.correlation.harnessAssistantMessageId,
      }
    : undefined;
  const exactRetainedSettlementRecovery = pendingSettlementRecoveryEvidence
    ? resolveExactSettlementRecovery(piInvocationOccupancy, selectedJourney, pendingSettlementRecoveryEvidence)
    : null;
  const selectedNativeLease = piInvocationOccupancy.entries.find((entry) => (
    entry.authority.journeyId === selectedJourney
  ));
  const selectedActiveNativeLease = selectedNativeLease && isActivePiInvocationLease(selectedNativeLease)
    ? selectedNativeLease
    : undefined;
  const blockingTurnAwaitingNativeLease = Boolean(blockingTurnJournalRecord && selectedActiveNativeLease);
  const retainedLeaseWithoutRecovery = selectedNativeLease?.leasePhase === "finalizing"
    && !selectedRuntimeBusy
    && !exactRetainedSettlementRecovery;
  const delayedRetainedLeaseNotice = useDelayedVisibility(retainedLeaseWithoutRecovery, {
    showDelayMs: 300,
    minimumVisibleMs: 700,
  });
  const showRetainedLeaseNotice = delayedRetainedLeaseNotice
    || Boolean(retainedLeaseWithoutRecovery && mirrorCommitError);
  const pendingMirrorOutboxItem = mirrorOutboxItems.find((item) => item.itemId === pendingMirrorRepair?.correlation.turnId);
  const pendingMirrorDisposition = pendingMirrorRepair
    ? classifyPendingMirrorAppend(
        classifyMirrorAppendMessagePair(presentedConversation, pendingMirrorRepair.correlation),
        Boolean(pendingMirrorOutboxItem),
      )
    : undefined;
  const durableSyncDebt = useMemo(() => deriveDurableSynchronizationDebt({
    journalRecords: journeyTurnJournalRecords
      .filter((record) => record.authority.journeyId === selectedJourney)
      .map((record) => ({
        turnId: record.authority.turnId,
        phase: record.phase,
        terminalOutcome: record.terminalOutcome,
      })),
    outboxItems: mirrorOutboxItems
      .filter((item) => item.journeyId === selectedJourney)
      .map((item) => ({ itemId: item.itemId })),
  }), [journeyTurnJournalRecords, mirrorOutboxItems, selectedJourney]);
  const durableSyncFailureEvidence = Boolean(mirrorCommitError)
    || Object.values(exactSettlementErrors).some((error) => (
      error.journeyId === selectedJourney && error.turnId === durableSyncDebt?.turnId
    ));
  const durableSyncAttention = Boolean(durableSyncDebt) && durableSyncFailureEvidence;
  const legacyMirrorGap = durableSyncAttention && pendingMirrorDisposition === "legacy_gap";
  const dedicatedThreadReady = journeyThreadState.kind === "ready";
  const dedicatedTurnState = classifyDedicatedTurnState(conversation, selectedRuntimeBusy);
  const latestNautilusTurn = [...conversation.reconciliation.turns].reverse().find((turn) => turn.origin === "nautilus");
  const interruptedProviderFailure = providerTerminalFailureDetail(journeyTurnJournalRecords, {
    threadId: conversation.id,
    generation: conversation.liveIdentity.generation,
    piSessionId: conversation.liveIdentity.piSessionId,
  });
  const durableInterruptedTurn = latestNautilusTurn?.pi.state === "failed"
    && latestNautilusTurn.pi.failureCode?.startsWith("turn_journal_")
    ? latestNautilusTurn
    : undefined;
  const reconciliationBlocksInvocation = dedicatedThreadReady
    ? dedicatedTurnBlocksNewInvocation(dedicatedTurnState)
    : conversation.reconciliation.classification !== "in_sync";
  const composerTurnStatus = deriveComposerTurnStatus({
    agentRunStatus: agentRun.status,
    runBelongsToSelectedJourney: selectedRuntime.identity
      ? identityJourneyId(selectedRuntime.identity) === selectedJourney
      : false,
    isStreaming,
    isFinalizingTurn,
    reconciliationBlocksInvocation,
    mirrorRepairPending: durableSyncAttention,
  });
  const showBlockingTurnRecoveryNotice = Boolean(blockingTurnJournalRecord)
    && !isStreaming
    && (!blockingTurnAwaitingNativeLease || composerTurnStatus !== "finishing");
  const nativeOccupancyNoticeRequested = piInvocationOccupancy.status !== "known"
    && composerTurnStatus !== "finishing";
  const showNativeOccupancyNotice = useDelayedVisibility(nativeOccupancyNoticeRequested, {
    showDelayMs: 300,
    minimumVisibleMs: 700,
  });
  const showConversationSyncNotice = shouldShowConversationSyncNotice({
    mirrorRepairPending: durableSyncAttention,
    legacyMirrorGap,
    isStreaming,
    isFinalizingTurn,
  });
  const conversationAvailability = decideConversationAvailability({
    runtimeBindingReady,
    conversationAuthorityReady: journeyThreadState.kind === "ready",
    sameConversationExecutionActive: Boolean(runStartReservation) || selectedRuntimeBusy,
    nativeAdmission: piInvocationPresentation.allowed ? "allowed" : piInvocationPresentation.reason,
    recoveryInspectionActive: turnRecoveryBusy || isJourneyReloading,
    mirrorSynchronizationPending: showConversationSyncNotice,
  });
  const selectedInvocationAdmissionBlocked = !conversationAvailability.canSend;
  const blockingRecoveryEvidence = blockingTurnJournalRecord
    && ["admitted", "running", "terminal_durable", "projected"].includes(blockingTurnJournalRecord.phase)
    ? {
        phase: blockingTurnJournalRecord.phase as "admitted" | "running" | "terminal_durable" | "projected",
        terminalOutcome: blockingTurnJournalRecord.terminalOutcome,
        hasFreshCompletePiEvidence: hasFreshCompleteTurnJournalEvidence(blockingTurnJournalRecord),
        exactRunInactive: piInvocationOccupancy.status === "known"
          && !selectedActiveNativeLease
          && !selectedRuntimeBusy,
      }
    : undefined;
  const recoveryRoutes = decideConversationRecoveryRoutes({
    availability: conversationAvailability,
    blockingTurn: blockingRecoveryEvidence,
    mirrorSynchronization: durableSyncAttention
      ? legacyMirrorGap ? "legacy_gap" : "exact_repair_available"
      : "none",
    canCreateDesktopConversation: journeyThreadState.kind === "ready",
  });
  const showConversationRecoveryNotice = recoveryRoutes.length > 0
    && !isStreaming
    && (Boolean(blockingTurnJournalRecord) || legacyMirrorGap || showConversationSyncNotice);
  const showInactiveNativeAttemptNotice = shouldPresentInactiveNativeAttempt({
    candidate: inactiveNativeAttempt,
    journeyId: selectedJourney,
    threadId: conversation.id,
    generation: conversation.liveIdentity.generation,
    piSessionId: conversation.liveIdentity.piSessionId,
    occupancyKnown: piInvocationOccupancy.status === "known",
    exactNativeLeaseActive: Boolean(selectedActiveNativeLease),
    selectedRuntimeBusy,
    isStreaming,
  });
  const configuredContextWindow = piModelCatalog.find((entry) =>
    entry.provider === effectiveAgentProfile.model.provider && entry.model === effectiveAgentProfile.model.model,
  )?.contextWindow ?? configuredModelContextWindow(effectiveProviderConfig);
  const displayContextWindow = configuredContextWindow ?? reportedContextUsage?.contextWindow ?? null;
  const authoritativeContextUsage = reportedContextUsage
    ? {
        ...reportedContextUsage,
        contextWindow: displayContextWindow,
        percent: reportedContextUsage.tokens !== null && displayContextWindow !== null
          ? (reportedContextUsage.tokens / displayContextWindow) * 100
          : reportedContextUsage.percent,
      }
    : undefined;
  const hasInlineGrammar = Boolean(streamMissionDraft || streamWarnings.length > 0 || streamSafety || streamDiagnostics.length > 0);
  const altitudeSwitchDisabled = isJourneyReloading || projectionLoadStatus === "loading";
  const operationalChatSelected = presentedAltitude === "operational" && presentedOperationalSurface === "chat";

  useEffect(() => {
    if (selectedAltitude !== presentedAltitude) setSelectedAltitude(presentedAltitude);
    if (selectedOperationalSurface !== presentedOperationalSurface) setSelectedOperationalSurface(presentedOperationalSurface);
  }, [presentedAltitude, presentedOperationalSurface, selectedAltitude, selectedOperationalSurface]);

  async function reconcilePiInvocationOccupancy() {
    const requestId = piInvocationInspectionSequenceRef.current + 1;
    piInvocationInspectionSequenceRef.current = requestId;
    setPiInvocationOccupancy((current) => beginPiInvocationReconciliation(current, requestId));
    try {
      const inspection = await inspectPiInvocations();
      setPiInvocationOccupancy((current) => applyPiInvocationInspection(current, requestId, inspection));
      const validInspection = validatePiInvocationRegistryInspection(inspection);
      if (validInspection) setPiInvocationBootstrapComplete(true);
      return validInspection ? inspection : undefined;
    } catch (error) {
      setPiInvocationOccupancy((current) => failPiInvocationReconciliation(
        current,
        requestId,
        `Could not inspect native Pi invocation occupancy: ${error instanceof Error ? error.message : String(error)}`,
      ));
      return undefined;
    }
  }

  async function releaseDurablePiInvocationLease(authority: PiInvocationAuthorityInspection) {
    const requestId = piInvocationInspectionSequenceRef.current + 1;
    piInvocationInspectionSequenceRef.current = requestId;
    setPiInvocationOccupancy((current) => beginPiInvocationReconciliation(current, requestId));
    try {
      const inspection = await releaseAndReinspectPiInvocationLease(authority, {
        releaseLease: releasePiInvocationLease,
        inspectRegistry: inspectPiInvocations,
      });
      setPiInvocationOccupancy((current) => applyPiInvocationInspection(current, requestId, inspection));
    } catch (error) {
      setPiInvocationOccupancy((current) => failPiInvocationReconciliation(
        current,
        requestId,
        `Could not confirm native Pi invocation cleanup: ${error instanceof Error ? error.message : String(error)}`,
      ));
      throw error;
    }
  }

  useEffect(() => {
    void piProcessEventDispatcher.mount().catch((error) => {
      dispatchJourneyRuntime({
        type: "append_warning",
        journeyId: selectedJourneyRef.current,
        message: `Could not attach to the Pi process event stream: ${error instanceof Error ? error.message : String(error)}`,
      });
    });
    return () => {
      void piProcessEventDispatcher.dispose();
    };
  }, []);

  useEffect(() => {
    void reconcilePiInvocationOccupancy();
  }, []);

  useEffect(() => {
    if (!shouldRehydratePiProcessRoute(selectedActiveNativeLease, selectedRuntimeBusy)
      || !selectedActiveNativeLease
      || !conversationLoaded
      || journeyThreadState.kind !== "ready"
      || selectedActiveNativeLease.authority.generation !== conversation.liveIdentity.generation) return;
    const evidence = conversation.reconciliation.turns.find((turn) => (
      turn.turnId === selectedActiveNativeLease.authority.turnId
      && turn.runId === selectedActiveNativeLease.authority.runId
      && turn.harness.userMessageId === selectedActiveNativeLease.authority.harnessUserMessageId
      && turn.harness.assistantMessageId === selectedActiveNativeLease.authority.harnessAssistantMessageId
    ));
    if (!evidence) return;
    try {
      const correlation = createDedicatedTurnAuthority(
        journeyThreadState.thread,
        selectedActiveNativeLease.authority.runId,
        selectedActiveNativeLease.authority.turnId,
        selectedActiveNativeLease.authority.harnessUserMessageId,
        selectedActiveNativeLease.authority.harnessAssistantMessageId,
      );
      const recoveredAuthority = createRunAuthority(
        correlation,
        conversation.liveIdentity,
        journeyThreadState.activeGeneration,
      );
      if (!samePiProcessEventAuthority(selectedActiveNativeLease.authority, recoveredAuthority)) return;
      void piProcessEventDispatcher.rehydrate(recoveredAuthority, (event) => {
        if (event.kind === "done") void reconcilePiInvocationOccupancy();
      }).catch(() => {
        dispatchJourneyRuntime({
          type: "append_warning",
          journeyId: recoveredAuthority.journeyId,
          message: "settlement_route_rehydration_failed",
        });
      });
    } catch {
      dispatchJourneyRuntime({
        type: "append_warning",
        journeyId: selectedActiveNativeLease.authority.journeyId,
        message: "settlement_authority_mismatch",
      });
    }
  }, [
    conversation,
    conversationLoaded,
    journeyThreadState,
    selectedActiveNativeLease,
    selectedRuntimeBusy,
  ]);

  useEffect(() => {
    if (!journeyMenuOpen) {
      return;
    }

    function closeMenuOnOutsidePointer(event: MouseEvent) {
      if (!journeyMenuRef.current?.contains(event.target as Node)) {
        setJourneyMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenuOnOutsidePointer);
    return () => document.removeEventListener("mousedown", closeMenuOnOutsidePointer);
  }, [journeyMenuOpen]);

  useEffect(() => {
    if (!journeyTreeMenuOpen) return;
    const focusTimer = window.setTimeout(() => {
      journeyTreeMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }, 0);
    function closeTreeMenu(event: MouseEvent) {
      const target = event.target as Node;
      if (!journeyTreeMenuRef.current?.contains(target) && !journeyTreeButtonRef.current?.contains(target)) {
        setJourneyTreeMenuOpen(false);
      }
    }
    function closeTreeMenuWithKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJourneyTreeMenuOpen(false);
        journeyTreeButtonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", closeTreeMenu);
    document.addEventListener("keydown", closeTreeMenuWithKeyboard);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", closeTreeMenu);
      document.removeEventListener("keydown", closeTreeMenuWithKeyboard);
    };
  }, [journeyTreeMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    void loadAgentSettings()
      .then((stored) => {
        if (cancelled) return;
        const next = stored ?? createDefaultAgentSettings();
        setAgentSettings(next);
        setProviderInvocationMode(next.globalProfile.invocationMode);
        setAgentProfileConfigured(Boolean(stored));
        setAgentSettingsState("ready");
        setAgentSettingsMessage(stored ? "Agent defaults restored from this device." : undefined);
      })
      .catch((error) => {
        if (cancelled) return;
        setAgentProfileConfigured(false);
        setAgentSettingsState("error");
        setAgentSettingsMessage(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadUserAvatar()
      .then((avatar) => {
        if (!cancelled) setUserAvatar(avatar);
      })
      .catch((error) => {
        if (!cancelled) setUserAvatarMessage(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void inspectRuntimeChannel()
      .then((diagnostic) => {
        if (!cancelled) {
          setRuntimeChannel(diagnostic);
          if (diagnostic.status === "validated") {
            setRuntimeMirrorRoot(diagnostic.mirrorRoot ?? "");
            setRuntimeMirrorHome(diagnostic.mirrorHome ?? "");
            setRuntimeMirrorUser(diagnostic.mirrorUser ?? "");
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setRuntimeChannelError(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (runtimeChannel?.status !== "unbound" || runtimeMirrorRoot || runtimeMirrorHome || runtimeMirrorUser) return;
    let cancelled = false;
    void inspectRuntimeBindingCandidate()
      .then((candidate) => {
        if (!cancelled && candidate) {
          setRuntimeMirrorRoot(candidate.mirrorRoot);
          setRuntimeMirrorHome(candidate.mirrorHome);
          setRuntimeMirrorUser(candidate.mirrorUser);
        }
      })
      .catch((error) => {
        if (!cancelled) setRuntimeChannelError(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, [runtimeChannel?.status, runtimeMirrorHome, runtimeMirrorRoot, runtimeMirrorUser]);

  useEffect(() => {
    if (runtimeChannel?.status !== "validated" || !registryLoaded) return;
    if (flattenJourneyRegistry(loadedJourneyRegistry).length > 0) {
      setRuntimeOnboardingState("ready");
      return;
    }
    if (runtimeOnboardingState === "idle") void importJourneysAfterBinding();
  }, [loadedJourneyRegistry, registryLoaded, runtimeChannel?.status, runtimeOnboardingState]);

  useEffect(() => {
    if (!settingsOpen) return;
    setGlobalModelDraft(modelOptionValue(agentSettings.globalProfile.model));
    setGlobalThinkingDraft(agentSettings.globalProfile.thinkingLevel);
    setProviderInvocationMode(agentSettings.globalProfile.invocationMode);
  }, [agentSettings, settingsOpen]);

  useEffect(() => {
    if (!journeyAgentProfileOpen) return;
    const override = agentSettings.journeyOverrides[selectedJourney];
    setJourneyModelDraft(override?.model ? modelOptionValue(override.model) : "inherit");
    setJourneyThinkingDraft(override?.thinkingLevel ?? "inherit");
  }, [agentSettings, journeyAgentProfileOpen, selectedJourney]);

  useEffect(() => {
    if (!runtimeBindingReady || piModelCatalogState !== "idle") return;
    setPiModelCatalogState("loading");
    void listPiModels()
      .then((catalog) => {
        setPiModelCatalog(catalog);
        setPiModelCatalogState("ready");
      })
      .catch((error) => {
        setPiModelCatalogState("error");
        setAgentSettingsMessage(error instanceof Error ? error.message : String(error));
      });
  }, [piModelCatalogState, runtimeBindingReady]);

  useEffect(() => {
    let cancelled = false;

    async function restoreJourneyRegistryAndPreferences() {
      let registry = emptyJourneyRegistry;
      let preferences: JourneyPreferenceState = defaultJourneyPreferenceState;
      let restoredDrafts: ComposerDraftMap = {};
      try {
        const [loadedRegistry, loadedPreferences, loadedComposerDrafts] = await Promise.all([
          loadJourneyRegistry(),
          loadJourneyPreferences(),
          loadComposerDrafts().catch((error) => {
            console.warn("Composer drafts could not be restored.", error);
            return {};
          }),
          retireLegacyParityState().catch((error) => {
            console.warn("Legacy parity state was retained for manual review.", error);
          }),
        ]);
        registry = loadedRegistry ?? emptyJourneyRegistry;
        preferences = loadedPreferences ? { ...defaultJourneyPreferenceState, ...loadedPreferences } : defaultJourneyPreferenceState;
        restoredDrafts = loadedComposerDrafts;
      } catch (error) {
        console.warn("Could not load Journey registry/preferences from user disk.", error);
      }

      const sanitizedPreferences = sanitizeJourneyPreferenceState(preferences, registry);
      const firstJourney = flattenJourneyRegistry(registry)[0];
      const nextActiveJourney = findJourneyById(registry, sanitizedPreferences.activeJourneyId ?? "")
        ? sanitizedPreferences.activeJourneyId
        : firstJourney?.id ?? sanitizedPreferences.activeJourneyId;

      if (cancelled) {
        return;
      }

      setLoadedJourneyRegistry(registry);
      composerDraftsRef.current = restoredDrafts;
      setComposerDrafts(restoredDrafts);
      setJourneyPreferences({
        pinnedJourneyIds: sanitizedPreferences.pinnedJourneyIds,
        activeJourneyId: nextActiveJourney,
        recentJourneyIds: sanitizedPreferences.recentJourneyIds,
      });
      setJourneyListOrder(sanitizedPreferences.journeyListOrder);
      setSidebarCompact(sanitizedPreferences.sidebarCompact);
      setLastWorkedAtByJourneyId(sanitizedPreferences.lastWorkedAtByJourneyId);
      setApplicationTheme(sanitizedPreferences.applicationTheme);
      setVoiceLanguage(sanitizedPreferences.voiceLanguage);
      setJourneyAppearanceById(sanitizedPreferences.journeyAppearanceById);
      if (nextActiveJourney) {
        setSelectedJourney(nextActiveJourney);
        setDraft(restoredDrafts[nextActiveJourney] ?? "");
      }
      setComposerDraftsLoaded(true);
      setRegistryLoaded(true);
      setPreferencesLoaded(true);
    }

    void restoreJourneyRegistryAndPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (journeyRegistryRefreshState !== "succeeded") return;
    const timeout = window.setTimeout(() => {
      setJourneyRegistryRefreshMessage(undefined);
      setJourneyRegistryRefreshState("idle");
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [journeyRegistryRefreshState]);

  useEffect(() => {
    setActiveRecoveryRoute(undefined);
    setTurnRecoveryNotice(undefined);
    setTurnRecoveryError(undefined);
    chatAutoFollowRef.current = nextConversationAutoFollow(
      chatAutoFollowRef.current,
      { type: "journey_changed" },
    );
    if (composerDraftsLoaded) {
      setDraft(composerDrafts[selectedJourney] ?? "");
    }
  }, [selectedJourney, composerDraftsLoaded]);

  useEffect(() => {
    if (!composerDraftsLoaded) return;
    const conversationId = selectedConversationSpace.kind === "desktop_conversation"
      ? selectedConversationSpace.conversationId
      : undefined;
    setDraft(composerDrafts[conversationDraftKey(selectedJourney, conversationId)] ?? "");
  }, [
    selectedJourney,
    selectedConversationSpace.kind,
    selectedConversationSpace.kind === "journey_workspace" ? undefined : selectedConversationSpace.conversationId,
    composerDraftsLoaded,
  ]);

  useEffect(() => {
    setInactiveNativeAttempt(undefined);
  }, [
    selectedJourney,
    selectedConversationSpace.kind,
    selectedConversationSpace.kind === "journey_workspace" ? undefined : selectedConversationSpace.conversationId,
  ]);

  useEffect(() => {
    setLocalReferenceError(undefined);
    setFileAttachmentError(undefined);
    setDismissedStreamWarningKey(undefined);
  }, [selectedJourney]);

  useEffect(() => {
    if (!runtimeBindingReady || !selectedJourney || !registryLoaded || !preferencesLoaded) {
      return;
    }

    let cancelled = false;
    setHistoricalSegmentCount(0);
    setLoadedHistoricalSegmentCount(0);
    setHistoricalSegmentState("idle");
    const loadRequest = conversationLoadCoordinatorRef.current.begin(selectedJourney);
    const requestIsCurrent = () => !cancelled
      && conversationLoadCoordinatorRef.current.isCurrent(loadRequest, selectedJourneyRef.current);
    const preserveReadyConversation = shouldPreserveReadyJourneyConversation({
      selectedJourneyId: selectedJourney,
      currentConversationJourneyId: conversation.journeyId,
      threadReady: journeyThreadState.kind === "ready",
    });
    if (!preserveReadyConversation) {
      setConversationLoaded(false);
      setJourneyThreadState({ kind: "loading" });
    }
    setPiContextState("checking");

    async function restoreConversation() {
      let threadAuthorityLoaded = false;
      try {
        const childEntry = selectedConversationEntry?.kind === "desktop_conversation"
          ? selectedConversationEntry
          : undefined;
        const dedicatedThread = childEntry
          ? desktopConversationThread(selectedJourney, childEntry)
          : await loadNautilusJourneyThread(selectedJourney);
        threadAuthorityLoaded = true;
        if (!requestIsCurrent()) return;
        const classified = classifyNautilusJourneyThread(dedicatedThread, selectedJourney);
        const restoreDecision = classified.kind === "ready"
          ? resolveJourneyConversationRestore(
              journeyRuntimeStateRef.current,
              selectedJourney,
              classified.activeGeneration.generation,
              classified.thread.threadId,
            )
          : { runtimeConversation: undefined, allowPersistedRecovery: true };
        const persistedConversation = classified.kind === "ready" && restoreDecision.allowPersistedRecovery
          ? await loadDedicatedJourneyConversation(
              selectedJourney,
              classified.activeGeneration.generation,
              classified.thread.threadId,
              classified.activeGeneration.piSessionFile ? {
                sessionId: classified.activeGeneration.piSessionId,
                sessionFile: classified.activeGeneration.piSessionFile,
              } : undefined,
            )
          : undefined;
        if (!requestIsCurrent()) return;
        setHistoricalSegmentCount(0);
        let restoredConversation = restoreDecision.runtimeConversation ?? (classified.kind === "ready"
          ? restoreDedicatedJourneyConversation(classified.thread, persistedConversation)
          : createJourneyConversation({ journeyId: selectedJourney, initialMessages }));
        if (classified.kind === "ready" && classified.activeGeneration.piSessionFile
          && !restoreDecision.runtimeConversation) {
          const inspection = await inspectDedicatedPiTranscript(
            selectedJourney,
            classified.thread.threadId,
            classified.activeGeneration.generation,
            classified.activeGeneration.piSessionId,
            classified.activeGeneration.piSessionFile,
          );
          restoredConversation = projectPiBackedConversationSurface(restoredConversation, inspection);
          setInactiveNativeAttempt(deriveInactiveNativeAttemptCandidate({
            journeyId: selectedJourney,
            threadId: classified.thread.threadId,
            generation: classified.activeGeneration.generation,
            piSessionId: classified.activeGeneration.piSessionId,
          }, inspection));
        }
        const repairableSteering = restoredConversation.steeringEvidence?.some((item) => (
          item.status === "pending" || item.status === "accepted" || item.status === "terminally_unconsumed"
        ));
        const steeringSessionFile = restoredConversation.liveIdentity.piSessionFile;
        const steeringMirrorConversationId = restoredConversation.liveIdentity.mirrorConversationId;
        const steeringActivationReceipt = restoredConversation.liveIdentity.activationReceiptActivatedAt;
        if (classified.kind === "ready"
          && repairableSteering
          && steeringSessionFile
          && steeringMirrorConversationId
          && steeringActivationReceipt) {
          const userEntries = await loadDedicatedPiUserEntries(
            selectedJourney,
            classified.thread.threadId,
            classified.activeGeneration.generation,
            classified.activeGeneration.piSessionId,
            steeringSessionFile,
          );
          let repairedConversation = restoredConversation;
          for (const turn of restoredConversation.reconciliation.turns) {
            if (!turn.runId || !turn.harness.userMessageId || !turn.harness.assistantMessageId) continue;
            if (!restoredConversation.steeringEvidence?.some((item) => item.runId === turn.runId)) continue;
            const correlation: TurnCorrelation = {
              schemaVersion: "0.2.0",
              journeyId: selectedJourney,
              threadId: restoredConversation.id,
              harnessConversationId: restoredConversation.id,
              piSessionId: restoredConversation.liveIdentity.piSessionId,
              generation: restoredConversation.liveIdentity.generation,
              activationReceiptActivatedAt: steeringActivationReceipt,
              turnId: turn.turnId,
              runId: turn.runId,
              harnessUserMessageId: turn.harness.userMessageId,
              harnessAssistantMessageId: turn.harness.assistantMessageId,
              mirrorConversationId: steeringMirrorConversationId,
            };
            const authority = createRunAuthority(correlation, restoredConversation.liveIdentity, classified.activeGeneration);
            repairedConversation = reconcileSteeringUserEntries(repairedConversation, authority, userEntries);
          }
          if (repairedConversation !== restoredConversation) {
            restoredConversation = repairedConversation;
            await saveDedicatedJourneyConversation(restoredConversation);
          }
        }
        if (!requestIsCurrent()) return;
        conversationRef.current = restoredConversation;
        setConversation(restoredConversation);
        setJourneyThreadState(classified);
        setJourneyStartError(undefined);
      } catch {
        if (requestIsCurrent()) {
          setJourneyThreadState(threadAuthorityLoaded
            ? { kind: "unavailable", reason: "runtime_read_failed" }
            : { kind: "inconsistent", reasonCodes: ["invalid_record"] });
        }
      } finally {
        if (requestIsCurrent()) setConversationLoaded(true);
      }

    }

    void restoreConversation();

    return () => {
      cancelled = true;
      conversationLoadCoordinatorRef.current.cancel(loadRequest);
    };
  }, [
    selectedJourney,
    selectedConversationSpace.kind,
    selectedConversationSpace.kind === "journey_workspace" ? undefined : selectedConversationSpace.conversationId,
    registryLoaded,
    preferencesLoaded,
    runtimeBindingReady,
    piInvocationBootstrapComplete,
    selectedNativeLease?.leasePhase,
    selectedNativeLease?.terminalState,
  ]);

  useEffect(() => {
    if (!conversationLoaded || !piInvocationBootstrapComplete || journeyThreadState.kind !== "ready") return;
    let cancelled = false;
    const ownerJourneyId = selectedJourney;
    const activeGeneration = journeyThreadState.activeGeneration.generation;
    void loadTurnJournal(ownerJourneyId)
      .then(async (journal) => {
        if (cancelled || selectedJourneyRef.current !== ownerJourneyId) return;
        setJourneyTurnJournalRecords(journal.records);
        const blockingRecord = findBlockingTurnJournalRecord(
          journal,
          ownerJourneyId,
          activeGeneration,
          journeyThreadState.thread.threadId,
          selectedActiveNativeLease?.authority.runId,
        );
        if (!blockingRecord) {
          setBlockingTurnJournalRecord(undefined);
          setTurnRecoveryError(undefined);
          setTurnRecoveryBusy(false);
          const projectedSyncRecord = [...journal.records].reverse().find((record) => (
            record.authority.journeyId === ownerJourneyId
            && record.authority.threadId === journeyThreadState.thread.threadId
            && record.authority.generation === activeGeneration
            && record.phase === "projected"
            && isTurnJournalSuccessorEligible(record)
          ));
          if (projectedSyncRecord && !checkedMirrorTurnRef.current.has(projectedSyncRecord.authority.turnId)) {
            checkedMirrorTurnRef.current.add(projectedSyncRecord.authority.turnId);
            void recoverPostTerminalPersistence(ownerJourneyId);
          }
          return;
        }
        setBlockingTurnJournalRecord(blockingRecord);
        setTurnRecoveryError(undefined);
        setTurnRecoveryBusy(false);
      })
      .catch(() => {
        if (cancelled || selectedJourneyRef.current !== ownerJourneyId) return;
        setTurnRecoveryError("Mirror couldn’t prepare the previous attempt automatically. Your data is preserved.");
        setTurnRecoveryBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    conversationLoaded,
    journeyThreadState,
    piInvocationBootstrapComplete,
    selectedJourney,
    selectedNativeLease?.authority.runId,
    selectedNativeLease?.leasePhase,
    selectedNativeLease?.terminalState,
  ]);

  useEffect(() => {
    if (!localReferenceError) return;
    const scheduled = localReferenceError;
    return scheduleTransientComposerNotice(() => {
      setLocalReferenceError((current) => clearScheduledNotice(current, scheduled));
    });
  }, [localReferenceError]);

  useEffect(() => {
    if (!fileAttachmentError) return;
    const scheduled = fileAttachmentError;
    return scheduleTransientComposerNotice(() => {
      setFileAttachmentError((current) => clearScheduledNotice(current, scheduled));
    });
  }, [fileAttachmentError]);

  useEffect(() => {
    if (!voiceError) return;
    const scheduled = voiceError;
    return scheduleTransientComposerNotice(() => {
      setVoiceError((current) => clearScheduledNotice(current, scheduled));
    });
  }, [voiceError]);

  useEffect(() => {
    if (!voiceNotice) return;
    const scheduled = voiceNotice;
    return scheduleTransientComposerNotice(() => {
      setVoiceNotice((current) => clearScheduledNotice(current, scheduled));
    });
  }, [voiceNotice]);

  useEffect(() => {
    let cancelled = false;
    loadVoiceComponentStatus()
      .then((status) => { if (!cancelled) setVoiceStatus(status); })
      .catch((error) => { if (!cancelled) setVoiceStatus({ state: "unsupported", platform: "unknown", architecture: "unknown", manifestUrl: "", message: voiceErrorMessage(error) }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (voiceSession.kind !== "recording") {
      setVoiceElapsedSeconds(0);
      return;
    }
    const startedAt = voiceSession.startedAt;
    const timer = setInterval(() => setVoiceElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(timer);
  }, [voiceSession]);

  useEffect(() => () => { voiceCaptureRef.current?.cancel(); }, []);

  useEffect(() => {
    if (settingsOpen && settingsTab === "voice") void loadVoiceCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, settingsTab]);

  useEffect(() => {
    if (!turnRecoveryNotice) return;
    const scheduled = turnRecoveryNotice;
    return scheduleTransientComposerNotice(() => {
      setTurnRecoveryNotice((current) => clearScheduledNotice(current, scheduled));
    });
  }, [turnRecoveryNotice]);

  useEffect(() => {
    if (!terminalStreamWarningKey || terminalStreamWarningKey === dismissedStreamWarningKey) return;
    return scheduleTransientComposerNotice(() => setDismissedStreamWarningKey(terminalStreamWarningKey));
  }, [dismissedStreamWarningKey, terminalStreamWarningKey]);

  useEffect(() => {
    if (!runtimeBindingReady || !selectedJourney || !registryLoaded) return;
    let cancelled = false;
    setJourneyProjections(undefined);
    setProjectionLoadStatus("loading");
    void loadJourneyProjections(selectedJourney)
      .then((bundle) => {
        if (cancelled || bundle.journeyId !== selectedJourney) return;
        setJourneyProjections(bundle);
        setProjectionLoadStatus(bundle.errors.length > 0 ? "error" : "ready");
      })
      .catch(() => {
        if (cancelled) return;
        setJourneyProjections(undefined);
        setProjectionLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedJourney, registryLoaded, runtimeBindingReady]);

  useEffect(() => {
    if (!conversationLoaded || isStreaming || effectiveProviderConfig.safeTestMode) {
      return;
    }
    const providerModel = providerModelLabel(effectiveProviderConfig);
    const identity = conversation.liveIdentity;
    const hasMatchingCache = hasMatchingContextStats(
      conversation.authoritativeContextStats,
      identity,
      providerModel,
    );
    if (hasMatchingCache) {
      if (piContextState !== "updating") setPiContextState("available");
    } else if (piContextState !== "unknown_after_compaction") {
      setPiContextState("checking");
    }
    if (!identity.piSessionFile) {
      if (!hasMatchingCache) setPiContextState("session_missing");
      return;
    }

    let cancelled = false;
    void readContextStatsWithBoundedRetry(() => readJourneyPiContextStats(
      conversation.journeyId,
      identity.piSessionId,
      identity.piSessionFile as string,
      identity.generation,
      identity.harnessConversationId,
    )).then((inspection) => {
      if (cancelled) return;
      const nextState = contextStateForInspection(inspection, providerModel);
      const snapshot = inspection.snapshot;
      if (nextState !== "available" || !snapshot) {
        if (!hasMatchingCache) setPiContextState(nextState);
        return;
      }
      setPiContextState("available");
      setConversation((currentConversation) => {
        if (
          currentConversation.liveIdentity.piSessionId !== identity.piSessionId
          || currentConversation.liveIdentity.generation !== identity.generation
        ) {
          return currentConversation;
        }
        return {
          ...currentConversation,
          authoritativeContextStats: {
            piSessionId: currentConversation.liveIdentity.piSessionId,
            generation: currentConversation.liveIdentity.generation,
            providerModel: snapshot.providerModel,
            capturedAt: new Date().toISOString(),
            usage: { tokens: snapshot.tokens, contextWindow: null, percent: null },
          },
        };
      });
    }).catch(() => {
      if (!cancelled && !hasMatchingCache) setPiContextState("inspection_failed");
    });

    return () => {
      cancelled = true;
    };
  }, [
    conversation.id,
    conversation.journeyId,
    conversation.liveIdentity.generation,
    conversation.liveIdentity.piSessionFile,
    conversation.liveIdentity.piSessionId,
    conversationLoaded,
    isStreaming,
    effectiveProviderConfig,
  ]);

  useEffect(() => {
    if (!composerDraftsLoaded) return;
    void composerDraftPersistence.flush().catch((error) => {
      console.warn("Could not flush Composer drafts after destination change.", error);
    });
  }, [
    composerDraftPersistence,
    composerDraftsLoaded,
    selectedJourney,
    selectedConversationSpace.kind,
    selectedConversationSpace.kind === "journey_workspace" ? undefined : selectedConversationSpace.conversationId,
  ]);

  const activeCloseWorkCount = useMemo(
    () => Object.values(journeyRuntimeState.entries).filter(isJourneyRuntimeActiveOrFinalizing).length,
    [journeyRuntimeState],
  );

  const closeAfterDraftFlush = useCallback(async () => {
    const appWindow = getCurrentWindow();
    setCloseConfirmationBusy(true);
    setCloseConfirmationError(undefined);
    try {
      await composerDraftPersistence.flush();
      await appWindow.destroy();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCloseConfirmationError(`Could not close Mirror Desktop: ${message}`);
      setCloseConfirmationBusy(false);
      console.warn("Could not close the app after flushing Composer drafts.", error);
    }
  }, [composerDraftPersistence]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void appWindow.onCloseRequested((event) => {
      event.preventDefault();
      if (hasActiveOrFinalizingJourneyRuntime(journeyRuntimeStateRef.current)) {
        setCloseConfirmationError(undefined);
        setCloseConfirmationOpen(true);
        return;
      }
      void closeAfterDraftFlush();
    }).then((stopListening) => {
      unlisten = stopListening;
    }).catch((error) => {
      console.warn("Could not install the Composer draft close boundary.", error);
    });
    return () => {
      unlisten?.();
      composerDraftPersistence.dispose();
    };
  }, [closeAfterDraftFlush, composerDraftPersistence]);

  useEffect(() => {
    if (!registryLoaded || !preferencesLoaded) {
      return;
    }

    void saveJourneyPreferences({
      ...journeyPreferences,
      journeyListOrder,
      sidebarCompact,
      lastWorkedAtByJourneyId,
      applicationTheme,
      journeyAppearanceById,
      voiceLanguage,
    });
  }, [journeyPreferences, journeyListOrder, sidebarCompact, lastWorkedAtByJourneyId, applicationTheme, journeyAppearanceById, voiceLanguage, registryLoaded, preferencesLoaded]);

  useEffect(() => {
    const interval = window.setInterval(() => setRelativeTimeNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!conversationLoaded || journeyThreadState.kind !== "ready" || runtimeBusy) return;
    void saveDedicatedJourneyConversation(conversation).catch((error) => {
      console.warn("Could not persist dedicated Journey projection.", error);
    });
  }, [conversation, conversationLoaded, runtimeBusy, journeyThreadState.kind]);

  useEffect(() => {
    if (!conversationLoaded || conversation.certifiedMirrorMode !== undefined) {
      return;
    }
    const transition = deriveLatestCertifiedModeTransition(
      conversation.messages,
      conversation.importedActivity?.events,
    );
    if (!transition) {
      return;
    }
    setConversation((currentConversation) => ({
      ...currentConversation,
      certifiedMirrorMode: {
        mode: transition.kind === "activate" ? transition.mode : null,
        certifiedAt: new Date().toISOString(),
        sourceId: "persisted-certified-surface",
      },
    }));
  }, [
    conversation.certifiedMirrorMode,
    conversation.id,
    conversation.importedActivity?.events,
    conversation.messages,
    conversationLoaded,
  ]);

  useEffect(() => {
    if (!conversationLoaded || journeyThreadState.kind !== "ready") return;
    let cancelled = false;
    void listMirrorAppendOutbox(conversation.journeyId).then((items) => {
      if (cancelled) return;
      setMirrorOutboxItems(items);
      void (async () => {
        if (!selectedRuntimeBusy && piInvocationOccupancy.status === "known") {
          await recoverPostTerminalPersistence(conversation.journeyId);
        }
      })();
    }).catch((error) => {
      if (!cancelled) setJourneyMirrorCommitError(conversation.journeyId, error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [conversation.journeyId, conversationLoaded, journeyThreadState.kind, piInvocationOccupancy.status, selectedRuntimeBusy]);

  useEffect(() => {
    checkedMirrorTurnRef.current.clear();
    setMirrorOutboxItems([]);
    setJourneyTurnJournalRecords([]);
  }, [selectedJourney]);

  useEffect(() => turnFinalizationCoordinator.subscribe((event) => {
    if (event.type === "durable_evidence_changed") {
      if (selectedJourneyRef.current !== event.journeyId) return;
      void listMirrorAppendOutbox(event.journeyId).then((items) => {
        if (selectedJourneyRef.current === event.journeyId) setMirrorOutboxItems(items);
      }).catch(() => {});
      void refreshTurnJournalEvidence(event.journeyId);
      return;
    }
    const authority = event.authority;
    const entryIdentity = journeyRuntimeStateRef.current.entries[authority.journeyId]?.identity;
    if (entryIdentity?.kind === "live"
      && entryIdentity.authority.runId === authority.runId
      && entryIdentity.authority.generation === authority.generation) {
      dispatchJourneyRuntime({
        type: "conversation_snapshot",
        identity: entryIdentity,
        conversation: event.projection,
      });
    }
    if (selectedJourneyRef.current !== authority.journeyId) return;
    if (event.phase === "frontier") setBlockingTurnJournalRecord(undefined);
    const current = conversationRef.current;
    if (current.id !== authority.threadId
      || current.liveIdentity.generation !== authority.generation) return;
    const currentTurnId = lastItem(current.reconciliation.turns)?.turnId;
    const next = !currentTurnId
      || event.projection.reconciliation.turns.some((turn) => turn.turnId === currentTurnId)
      ? event.projection
      : upgradeMirrorCommitments(current, event.projection);
    if (next === current) return;
    conversationRef.current = next;
    setConversation(next);
  }), []);

  useEffect(() => {
    const chatStream = chatStreamRef.current;
    const chatEnd = chatEndRef.current;
    chatAutoFollowRef.current = nextConversationAutoFollow(
      chatAutoFollowRef.current,
      { type: "content_updated" },
    );
    if (!chatStream || !chatEnd || !chatAutoFollowRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (chatAutoFollowRef.current) {
        chatEnd.scrollIntoView({ block: "end", behavior: isStreaming ? "auto" : "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isStreaming, runtimeProjection]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listenForFileAttachments({
      onActiveChange: (active) => {
        if (!disposed) setFileDropActive(active && journeyThreadState.kind === "ready" && !runtimeBusy && !isJourneyReloading);
      },
      onDrop: (paths) => {
        if (!disposed) void attachDroppedFiles(paths);
      },
    }).then((dispose) => {
      if (disposed) dispose();
      else unlisten = dispose;
    }).catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [journeyThreadState.kind, runtimeBusy, isJourneyReloading]);

  function addPendingFiles(response: FileAttachmentResponse, ownerJourneyId: string) {
    if (selectedJourneyRef.current !== ownerJourneyId) return;
    setFileAttachmentMaxFiles(response.maxFiles);
    setPendingFileAttachments((current) => {
      try {
        const combined = addFileAttachments(current, response.attachments, ownerJourneyId, response.maxFiles);
        setFileAttachmentError(undefined);
        return combined;
      } catch (error) {
        setFileAttachmentError(error instanceof Error ? error.message : String(error));
        return current;
      }
    });
  }

  async function chooseFiles() {
    if (fileAttachmentBusy || selectedRuntimeBusy || isJourneyReloading) return;
    const ownerJourneyId = selectedJourneyRef.current;
    setFileAttachmentBusy(true);
    setFileAttachmentError(undefined);
    try {
      addPendingFiles(await chooseFileAttachments(ownerJourneyId), ownerJourneyId);
    } catch (error) {
      if (selectedJourneyRef.current === ownerJourneyId) setFileAttachmentError(error instanceof Error ? error.message : String(error));
    } finally {
      if (selectedJourneyRef.current === ownerJourneyId) setFileAttachmentBusy(false);
    }
  }

  function updateComposerDrafts(
    update: (current: ComposerDraftMap) => ComposerDraftMap,
    flush = false,
  ) {
    const next = update(composerDraftsRef.current);
    composerDraftsRef.current = next;
    setComposerDrafts(next);
    composerDraftPersistence.schedule(next);
    if (flush) {
      void composerDraftPersistence.flush().catch((error) => {
        console.warn("Could not flush Composer drafts.", error);
      });
    }
  }

  function flushComposerDrafts() {
    void composerDraftPersistence.flush().catch((error) => {
      console.warn("Could not flush Composer drafts.", error);
    });
  }

  function currentComposerDraftKey(): string {
    const childEntry = selectedConversationEntry?.kind === "desktop_conversation" ? selectedConversationEntry : undefined;
    return conversationDraftKey(selectedJourneyRef.current, childEntry?.conversationId);
  }

  function currentComposerDestinationLabel(): string {
    const journeyName = findJourneyById(journeyRegistry, selectedJourneyRef.current)?.name ?? selectedJourneyRef.current;
    return selectedConversationEntry?.kind === "desktop_conversation" ? `${journeyName} · ${selectedConversationEntry.title}` : journeyName;
  }

  /**
   * Read-only manifest lookup so the Navigator can weigh model size, speed and
   * accuracy. Triggered only by opening the install dialog or Settings -> Voice.
   */
  async function loadVoiceCatalog() {
    if (voiceCatalog || voiceCatalogLoading) return;
    setVoiceCatalogLoading(true);
    try {
      const catalog = await loadVoiceComponentCatalog();
      setVoiceCatalog(catalog);
      setVoiceModelId((current) => current ?? voiceStatus?.modelId ?? catalog.defaultModel);
    } catch (error) {
      setVoiceError(voiceErrorMessage(error));
    } finally {
      setVoiceCatalogLoading(false);
    }
  }

  async function installVoice() {
    if (voiceInstalling || voiceSession.kind !== "idle") return;
    setVoiceInstalling(true);
    setVoiceError(undefined);
    setVoiceInstallProgress(undefined);
    try {
      setVoiceStatus(await installVoiceComponent(setVoiceInstallProgress, voiceModelId));
    } catch (error) {
      setVoiceError(voiceErrorMessage(error));
    } finally {
      setVoiceInstalling(false);
    }
  }

  async function removeVoice() {
    if (voiceInstalling || voiceRemoving || voiceSession.kind !== "idle") return;
    setVoiceRemoving(true);
    setVoiceError(undefined);
    try {
      setVoiceStatus(await removeVoiceComponent());
    } catch (error) {
      setVoiceError(voiceErrorMessage(error));
    } finally {
      setVoiceRemoving(false);
    }
  }

  async function startVoiceRecording() {
    if (voiceSession.kind !== "idle" || voiceStatus?.state !== "ready") return;
    const draftKey = currentComposerDraftKey();
    // Destination and language are both fixed at recording start, so changing
    // either mid-recording cannot retarget or relabel the in-flight transcript.
    voiceOriginRef.current = { draftKey, label: currentComposerDestinationLabel(), language: voiceLanguage };
    setVoiceError(undefined);
    setVoiceSession({ kind: "requesting_permission", draftKey });
    try {
      const capture = await startVoiceCapture({
        onLimitReached: () => { void stopVoiceRecording(); },
      });
      voiceCaptureRef.current = capture;
      setVoiceSession({ kind: "recording", draftKey, startedAt: Date.now() });
    } catch (error) {
      voiceCaptureRef.current = undefined;
      setVoiceSession(idleVoiceSession);
      setVoiceError(voiceErrorMessage(error));
    }
  }

  async function stopVoiceRecording() {
    const capture = voiceCaptureRef.current;
    const origin = voiceOriginRef.current;
    if (!capture || !origin) return;
    voiceCaptureRef.current = undefined;
    setVoiceSession({ kind: "transcribing", draftKey: origin.draftKey });
    try {
      const recording = await capture.stop();
      const transcript = await transcribeVoiceWav(await recordingToPcm16Wav(recording), origin.language);
      if (voiceOriginRef.current !== origin) return; // cancelled while transcribing
      if (!transcript.text.trim()) {
        setVoiceError(voiceErrorMessage("voice_recording_empty"));
        return;
      }
      let merged = "";
      updateComposerDrafts((current) => {
        merged = appendTranscriptToDraft(current[origin.draftKey] ?? "", transcript.text);
        return updateComposerDraft(current, origin.draftKey, merged);
      }, true);
      const visibleDraftKey = currentComposerDraftKey();
      if (visibleDraftKey === origin.draftKey) setDraft(merged);
      setVoiceNotice(transcriptDestinationNotice(origin.draftKey, visibleDraftKey, origin.label));
    } catch (error) {
      if (voiceOriginRef.current === origin) setVoiceError(voiceErrorMessage(error));
    } finally {
      if (voiceOriginRef.current === origin) {
        voiceOriginRef.current = undefined;
        setVoiceSession(idleVoiceSession);
      }
    }
  }

  function cancelVoiceRecording() {
    voiceCaptureRef.current?.cancel();
    voiceCaptureRef.current = undefined;
    voiceOriginRef.current = undefined;
    setVoiceSession(idleVoiceSession);
  }

  function handleVoiceIntent(intent: VoiceControlIntent) {
    if (intent === "install") {
      setVoiceInstallDialogOpen(true);
      void loadVoiceCatalog();
    }
    else if (intent === "record") void startVoiceRecording();
    else if (intent === "stop") void stopVoiceRecording();
    else if (intent === "explain") {
      setVoiceError(voiceStatus?.message ?? voiceErrorMessage("voice_component_damaged"));
      setSettingsTab("voice");
      setSettingsOpen(true);
    }
  }

  function setJourneyComposerDraft(journeyId: string, text: string, flush = false) {
    const boundedText = text.slice(0, COMPOSER_DRAFT_MAX_CHARS);
    const childEntry = selectedConversationEntry?.kind === "desktop_conversation"
      ? selectedConversationEntry
      : undefined;
    const draftKey = conversationDraftKey(journeyId, childEntry?.conversationId);
    const selectedAuthorityStillMatches = selectedJourneyRef.current === journeyId
      && (!childEntry || conversationRef.current.id === childEntry.threadId);
    if (selectedAuthorityStillMatches) setDraft(boundedText);
    updateComposerDrafts((current) => updateComposerDraft(current, draftKey, boundedText), flush);
  }

  async function attachDroppedFiles(paths: string[]) {
    if (journeyThreadState.kind !== "ready" || selectedRuntimeBusy || isJourneyReloading) return;
    const ownerJourneyId = selectedJourneyRef.current;
    setFileAttachmentBusy(true);
    setFileAttachmentError(undefined);
    try {
      addPendingFiles(await inspectDroppedFileAttachments(ownerJourneyId, paths), ownerJourneyId);
    } catch (error) {
      if (selectedJourneyRef.current === ownerJourneyId) setFileAttachmentError(error instanceof Error ? error.message : String(error));
    } finally {
      if (selectedJourneyRef.current === ownerJourneyId) setFileAttachmentBusy(false);
    }
  }

  function recordAdmittedJourneyActivity(ownerJourneyId: string, admittedAt: string) {
    setLastWorkedAtByJourneyId((current) => recordJourneyLastWorked(current, ownerJourneyId, admittedAt));
    setJourneyPreferences((preferences) => markJourneyRecent(preferences, ownerJourneyId));
    window.requestAnimationFrame(() => {
      followRecentJourneyAdmission(
        journeyListRef.current,
        journeyListPresentationRef.current,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    });
  }

  async function generatePacket(mode: "mock" | "live", retryContent?: string) {
    const content = (retryContent ?? draft).trim();
    const invocationAdmissionBlocked = mode === "live"
      ? selectedInvocationAdmissionBlocked || turnRecoveryBusy
      : selectedRuntimeBusy;
    if (!content || fileAttachmentError || journeyThreadState.kind !== "ready" || invocationAdmissionBlocked || runStartReservationRef.current || (mode === "live" && (providerErrors.length > 0 || agentSettingsState !== "ready"))) {
      return;
    }

    let baseConversation = conversation;
    if (mode === "live") {
      baseConversation = conversationRef.current;
      const preflightBlocked = baseConversation.journeyId !== selectedJourney
        || journeyThreadState.kind !== "ready";
      if (preflightBlocked) {
        const message = "Live invocation stopped because Journey conversation authority changed or is still being inspected. Reconcile the selected Journey and try again.";
        setUnsentDraftNotices((current) => recordUnsentDraft(current, selectedJourney, message));
        dispatchJourneyRuntime({ type: "append_warning", journeyId: selectedJourney, message });
        return;
      }
      const modelRejection = unavailableModelReason(piModelCatalog, effectiveAgentProfile.model);
      if (modelRejection) {
        const message = `Live invocation stopped: ${modelRejection}`;
        setUnsentDraftNotices((current) => recordUnsentDraft(current, selectedJourney, message));
        dispatchJourneyRuntime({ type: "append_warning", journeyId: selectedJourney, message });
        return;
      }
      const durableMetadata = await loadDedicatedJourneyConversation(
        selectedJourney,
        journeyThreadState.activeGeneration.generation,
        journeyThreadState.thread.threadId,
      );
      const metadataBase = durableMetadata ?? baseConversation;
      if (metadataBase.id !== baseConversation.id
        || metadataBase.journeyId !== selectedJourney
        || metadataBase.liveIdentity.generation !== baseConversation.liveIdentity.generation
        || !journeyThreadState.activeGeneration.piSessionFile) {
        const message = "Live invocation stopped because exact Conversation metadata or Pi session authority changed.";
        setUnsentDraftNotices((current) => recordUnsentDraft(current, selectedJourney, message));
        dispatchJourneyRuntime({ type: "append_warning", journeyId: selectedJourney, message });
        return;
      }
      try {
        const inspection = await inspectDedicatedPiTranscript(
          selectedJourney,
          journeyThreadState.thread.threadId,
          journeyThreadState.activeGeneration.generation,
          journeyThreadState.activeGeneration.piSessionId,
          journeyThreadState.activeGeneration.piSessionFile,
        );
        baseConversation = projectPiBackedConversationSurface(metadataBase, inspection);
      } catch (error) {
        const message = `Live invocation stopped because the Pi transcript could not be inspected: ${error instanceof Error ? error.message : String(error)}`;
        setUnsentDraftNotices((current) => recordUnsentDraft(current, selectedJourney, message));
        dispatchJourneyRuntime({ type: "append_warning", journeyId: selectedJourney, message });
        return;
      }
    }

    const fileAttachments = pendingFileAttachments;
    if (fileAttachments.some((attachment) => attachment.journeyId !== selectedJourney) || fileAttachments.length > fileAttachmentMaxFiles) {
      setFileAttachmentError("Pending files no longer match the selected Journey or file-count limit.");
      return;
    }
    const userMessage: ConversationMessage = {
      ...createUserConversationMessage(content),
      ...(fileAttachments.length ? { attachments: fileAttachments } : {}),
    };
    const nextMessages = [...baseConversation.messages, userMessage];
    const packet = createMissionExtractionPacket({
      conversation: nextMessages,
      currentState,
      journeyId: selectedJourney,
      liveConversation: baseConversation.liveIdentity,
      fileAttachments: toAgentFileReferences(fileAttachments),
    });
    const assistantMessage: ConversationMessage = {
      id: `assistant-${new Date().toISOString()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    const run = startAgentRun({ content, mode });
    const correlation: TurnCorrelation | undefined = mode === "live" && run.id && journeyThreadState.kind === "ready"
      ? createDedicatedTurnAuthority(
          journeyThreadState.thread,
          run.id,
          `turn-${run.id}`,
          userMessage.id,
          assistantMessage.id,
        )
      : undefined;
    const stagedConversation = correlation
      ? stageCorrelatedTurn(baseConversation, correlation, userMessage, assistantMessage)
      : replaceJourneyConversationMessages(baseConversation, [...nextMessages, assistantMessage]);
    let runAuthority: ReturnType<typeof createRunAuthority> | undefined;
    try {
      runAuthority = correlation && journeyThreadState.kind === "ready"
        ? createRunAuthority(correlation, baseConversation.liveIdentity, journeyThreadState.activeGeneration)
        : undefined;
    } catch (error) {
      const message = `Live invocation stopped because run authority could not be built: ${error instanceof Error ? error.message : String(error)}`;
      setUnsentDraftNotices((current) => recordUnsentDraft(current, selectedJourney, message));
      dispatchJourneyRuntime({ type: "append_warning", journeyId: selectedJourney, message });
      return;
    }
    const settlementAuthority = runAuthority
      ? createJourneySettlementAuthority(runAuthority)
      : undefined;
    const runtimeIdentity: JourneyRunIdentity = runAuthority
      ? { kind: "live", authority: runAuthority }
      : { kind: "mock", journeyId: selectedJourney, runId: run.id ?? `mock-${assistantMessage.id}` };
    const invocationAuthority = runAuthority
      ? piInvocationAuthorityFromRunAuthority(runAuthority)
      : undefined;
    const provider: AgentStreamProvider = mode === "mock"
      ? mockPiAgentStream
      : (packet) => runAuthority
        ? livePiAgentStream(packet, effectiveProviderConfig, runAuthority)
        : missingRunAuthorityStream();
    const ownerJourneyId = baseConversation.journeyId;
    const ownerGeneration = baseConversation.liveIdentity.generation;
    if (mode === "live" && selectedJourneyRef.current === ownerJourneyId) {
      setPiContextState(hasMatchingContextStats(
        baseConversation.authoritativeContextStats,
        baseConversation.liveIdentity,
        providerModelLabel(effectiveProviderConfig),
      ) ? "updating" : "waiting");
    }
    runStartReservationRef.current = runtimeIdentity;
    setRunStartReservation(runtimeIdentity);

    if (invocationAuthority) {
      setPiInvocationOccupancy((current) => retainExpectedPiInvocationLease(current, invocationAuthority));
    }
    setUnsentDraftNotices((current) => clearUnsentDraft(current, ownerJourneyId));
    dispatchJourneyRuntime({
      type: "register",
      identity: runtimeIdentity,
      run,
      assistantMessageId: assistantMessage.id,
      conversationSnapshot: stagedConversation,
    });
    if (selectedJourneyRef.current === ownerJourneyId) {
      chatAutoFollowRef.current = nextConversationAutoFollow(
        chatAutoFollowRef.current,
        { type: "explicit_bottom" },
      );
      conversationRef.current = stagedConversation;
      setConversation(stagedConversation);
    }
    if (mode === "mock") {
      setJourneyComposerDraft(baseConversation.journeyId, "", true);
    } else if (selectedJourneyRef.current === ownerJourneyId) {
      setDraft("");
    }
    setPendingFileAttachments([]);
    setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
    setFileAttachmentError(undefined);

    const conversationBeforeRun = baseConversation;
    const ownerDraftKey = conversationDraftKey(
      ownerJourneyId,
      selectedConversationEntry?.kind === "desktop_conversation"
        ? selectedConversationEntry.conversationId
        : undefined,
    );
    const persistOwnerComposerDraft = (text: string, flush = false) => {
      const boundedText = text.slice(0, COMPOSER_DRAFT_MAX_CHARS);
      updateComposerDrafts((current) => updateComposerDraft(current, ownerDraftKey, boundedText), flush);
      if (selectedJourneyRef.current === ownerJourneyId
        && conversationRef.current.id === baseConversation.id) {
        setDraft(boundedText);
      }
    };
    let agentStartApplied = false;
    let rawLiveOutput = "";
    let runReachedAgent = false;
    let workActivityRecorded = false;
    let runTerminal: JourneyRunTerminal | undefined;
    let preAgentFailureMessage = "The local Pi invocation was rejected before the agent started.";
    const preAgentProviderWarnings: string[] = [];
    const diagnostics: string[] = [];
    let streamedAssistantContent = "";
    let runConversation = stagedConversation;
    let runRuntimeProjection = initialRuntimeProjectionState;

    function updateRunConversation(update: (current: JourneyConversation) => JourneyConversation) {
      runConversation = update(runConversation);
      const liveSteering = steeringEvidenceByRunRef.current[run.id ?? ""];
      if (liveSteering) {
        runConversation = {
          ...runConversation,
          steeringEvidence: [
            ...(runConversation.steeringEvidence ?? []).filter((item) => item.runId !== run.id),
            ...liveSteering,
          ],
        };
      }
      dispatchJourneyRuntime({ type: "conversation_snapshot", identity: runtimeIdentity, conversation: runConversation });
      if (
        selectedJourneyRef.current === ownerJourneyId
        && conversationRef.current.id === baseConversation.id
        && conversationRef.current.liveIdentity.generation === ownerGeneration
      ) {
        conversationRef.current = runConversation;
        setConversation(runConversation);
      }
    }

    try {
      for await (const event of provider(packet)) {
        runRuntimeProjection = reduceRuntimeProjection(runRuntimeProjection, event);
        if (runStartReservationRef.current === runtimeIdentity) {
          runStartReservationRef.current = undefined;
          setRunStartReservation((current) => current === runtimeIdentity ? undefined : current);
        }
        dispatchJourneyRuntime({ type: "stream_event", identity: runtimeIdentity, event });
        if (mode === "live" && !workActivityRecorded && event.type === "run_status" && event.status === "starting") {
          workActivityRecorded = true;
          const admittedAt = new Date().toISOString();
          recordAdmittedJourneyActivity(ownerJourneyId, admittedAt);
        }
        if (event.type === "run_status" && event.status === "working") {
          runReachedAgent = true;
          if (mode === "live" && correlation && settlementAuthority && !agentStartApplied) {
            agentStartApplied = true;
            setInactiveNativeAttempt((current) => current
              && current.journeyId === ownerJourneyId
              && current.threadId === baseConversation.id
              && current.generation === ownerGeneration
              && current.piSessionId === baseConversation.liveIdentity.piSessionId
                ? undefined
                : current);
            persistOwnerComposerDraft("", true);
            try {
              await journeyPersistenceCoordinator.run(
                settlementAuthority,
                "pre_frontier",
                () => saveAdmittedTurnProjection(stagedConversation, settlementAuthority),
              );
            } catch (error) {
              diagnostics.push(`Could not persist the admitted compatibility projection: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
        if (event.type === "context_usage") {
          if (
            selectedJourneyRef.current === ownerJourneyId
            && conversationRef.current.liveIdentity.generation === ownerGeneration
          ) {
            setPiContextState(contextStateForLiveUsage(event.usage));
          }
          updateRunConversation((currentConversation) => {
            const currentStats = currentConversation.authoritativeContextStats;
            const sameAuthority = currentStats
              && currentStats.piSessionId === currentConversation.liveIdentity.piSessionId
              && currentStats.generation === currentConversation.liveIdentity.generation
              && currentStats.providerModel === providerModelLabel(effectiveProviderConfig);
            return {
              ...currentConversation,
              authoritativeContextStats: {
                piSessionId: currentConversation.liveIdentity.piSessionId,
                generation: currentConversation.liveIdentity.generation,
                providerModel: providerModelLabel(effectiveProviderConfig),
                capturedAt: new Date().toISOString(),
                usage: mergeRuntimeContextUsage(sameAuthority ? currentStats.usage : undefined, event.usage),
              },
            };
          });
        }
        if (event.type === "persona_context") {
          updateRunConversation((currentConversation) =>
            replaceJourneyConversationMessages(
              currentConversation,
              currentConversation.messages.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: withCertifiedPersona(message.content, event.persona) }
                  : message,
              ),
            ),
          );
        }
        if (event.type === "message_delta") {
          streamedAssistantContent = `${streamedAssistantContent}${event.content}`;
          const transition = extractCertifiedModeTransition(streamedAssistantContent);
          updateRunConversation((currentConversation) => {
            const withMode = transition
              ? applyCertifiedModeTransition(currentConversation, transition, assistantMessage.id)
              : currentConversation;
            return replaceJourneyConversationMessages(
              withMode,
              withMode.messages.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: reduceStreamedAssistantMessage(message.content, event) }
                  : message,
              ),
            );
          });
        }
        if (event.type === "operation_update" && event.operation.output) {
          const transition = extractCertifiedModeTransition(event.operation.output);
          if (transition) {
            updateRunConversation((currentConversation) =>
              applyCertifiedModeTransition(currentConversation, transition, `runtime-${event.operation.id}`),
            );
          }
        }
        if (event.type === "raw_output") {
          rawLiveOutput = `${rawLiveOutput}${event.content}`;
        }
        if (event.type === "diagnostic") {
          diagnostics.push(event.message);
        }
        if (event.type === "cancelled" && mode === "mock") {
          runTerminal = captureJourneyRunTerminal(runTerminal, "cancelled");
        }
        if (event.type === "warning" && !runReachedAgent) {
          preAgentProviderWarnings.push(event.message);
        }
        if (event.type === "error") {
          if (mode === "mock") runTerminal = captureJourneyRunTerminal(runTerminal, "failed");
          preAgentFailureMessage = event.message;
        }
        if (event.type === "done" && mode === "live") {
          if (!settlementAuthority) throw new Error("turn_journal_settlement_authority_missing");
          const journal = await loadTurnJournal(settlementAuthority.journeyId);
          const journalRecord = findExactTurnJournalRecord(journal, settlementAuthority);
          if (!journalRecord) {
            runTerminal = "failed";
            continue;
          }
          const decision = decideTurnJournalTerminal(journalRecord);
          runTerminal = decision === "cancelled" ? "cancelled" : decision === "failed" ? "failed" : undefined;
          if (runAuthority && runConversation.steeringEvidence?.some((item) => (
            item.runId === runAuthority.runId && (item.status === "pending" || item.status === "accepted")
          ))) {
            try {
              const userEntries = await loadDedicatedPiUserEntries(
                runAuthority.journeyId,
                runAuthority.threadId,
                runAuthority.generation,
                runAuthority.piSessionId,
                runAuthority.piSessionFile,
              );
              let reconciled = reconcileSteeringUserEntries(runConversation, runAuthority, userEntries);
              reconciled = settleUnconsumedSteering(
                reconciled,
                runAuthority,
                decision === "cancelled" ? "cancelled" : decision === "failed" ? "provider_failed" : "settled_without_application",
              );
              steeringEvidenceByRunRef.current[runAuthority.runId] = reconciled.steeringEvidence?.filter(
                (item) => item.runId === runAuthority.runId,
              ) ?? [];
              updateRunConversation(() => reconciled);
            } catch (error) {
              diagnostics.push(`Could not reconcile Steering evidence: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          if (decision !== "completed" || rawLiveOutput.trim().length === 0) continue;
          const normalized = normalizePiResponse(rawLiveOutput, diagnostics);
          updateRunConversation((currentConversation) =>
            replaceJourneyConversationMessages(
              currentConversation,
              currentConversation.messages.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: normalized.assistantMessage } : message,
              ),
            ),
          );
          dispatchJourneyRuntime({
            type: "patch",
            journeyId: ownerJourneyId,
            identity: runtimeIdentity,
            patch: {
              missionDraft: normalized.missionDraft,
              warnings: normalized.openQuestions,
              diagnostics: normalized.diagnostics,
              safety: normalized.safety,
            },
          });
        }
      }
    } catch (error) {
      runTerminal = captureJourneyRunTerminal(runTerminal, "failed");
      if (mode === "live" && settlementAuthority) {
        try {
          const journal = await loadTurnJournal(settlementAuthority.journeyId);
          const journalRecord = requireExactTurnJournalRecord(journal, settlementAuthority);
          if (journalRecord.phase === "terminal_durable") {
            runReachedAgent = true;
            const decision = decideTurnJournalTerminal(journalRecord);
            runTerminal = decision === "completed"
              ? undefined
              : decision === "cancelled" ? "cancelled" : "failed";
          }
        } catch {
          // No exact durable terminal means reversible pre-agent rejection remains authoritative.
        }
      }
      const message = error instanceof Error ? error.message : String(error);
      preAgentFailureMessage = message;
      dispatchJourneyRuntime({ type: "stream_event", identity: runtimeIdentity, event: { type: "error", message } });
    } finally {
      const runWasCancelled = runTerminal === "cancelled";
      const runFailed = runTerminal === "failed";
      dispatchJourneyRuntime({ type: "stream_finished", identity: runtimeIdentity });
      if (invocationAuthority && !(runFailed && !runReachedAgent)) {
        await reconcilePiInvocationOccupancy();
      }
      if (runFailed && !runReachedAgent) {
        runConversation = conversationBeforeRun;
        if (selectedJourneyRef.current === ownerJourneyId
          && conversationRef.current.id === baseConversation.id
          && conversationRef.current.liveIdentity.generation === ownerGeneration) {
          conversationRef.current = conversationBeforeRun;
          setConversation(conversationBeforeRun);
        }
        if (correlation) {
          try {
            if (invocationAuthority) {
              await rollbackRejectedReservation({
                authority: invocationAuthority,
              }, {
                inspectAfterRollback: async () => {
                  const inspection = await reconcilePiInvocationOccupancy();
                  if (!inspection) throw new Error("rejected_reservation_reinspection_invalid");
                  return inspection;
                },
                isExactFinalizingLease: (inspection, authority) => Boolean(inspection.entries.some((entry) => (
                  entry.authority.journeyId === authority.journeyId
                  && entry.authority.runId === authority.runId
                  && entry.leasePhase === "finalizing"
                ))),
                cleanupExactFinalizingLease: releaseDurablePiInvocationLease,
                onRollbackConfirmed: () => {
                  persistOwnerComposerDraft(content);
                  if (selectedJourneyRef.current === ownerJourneyId) {
                    setPendingFileAttachments(fileAttachments);
                  }
                  dispatchJourneyRuntime({ type: "cleanup", identity: runtimeIdentity });
                  const message = `Message returned to the composer: ${resolveUnsentReason(preAgentProviderWarnings, preAgentFailureMessage)}`;
                  setUnsentDraftNotices((current) => recordUnsentDraft(current, ownerJourneyId, message));
                  dispatchJourneyRuntime({ type: "append_warning", journeyId: ownerJourneyId, message });
                },
              });
            }
          } catch (error) {
            persistOwnerComposerDraft(content);
            if (selectedJourneyRef.current === ownerJourneyId) {
              setPendingFileAttachments(fileAttachments);
            }
            const rollbackMessage = `Message returned to the composer after rollback failed: ${resolveUnsentReason(preAgentProviderWarnings, error instanceof Error ? error.message : String(error))}`;
            setUnsentDraftNotices((current) => recordUnsentDraft(current, ownerJourneyId, rollbackMessage));
            dispatchJourneyRuntime({
              type: "append_warning", journeyId: ownerJourneyId, identity: runtimeIdentity,
              message: rollbackMessage,
            });
          }
        }
      } else if (runWasCancelled || runFailed) {
        let interrupted = replaceJourneyConversationMessages(
          runConversation,
          runConversation.messages.filter(
            (message) => message.id !== assistantMessage.id || message.content.trim().length > 0,
          ),
        );
        if (correlation) {
          interrupted = interruptDedicatedTurn(
            interrupted,
            correlation.turnId,
            mode === "live"
              ? runWasCancelled ? "turn_journal_cancelled" : "turn_journal_failed"
              : runWasCancelled ? "provider_cancelled" : "provider_failed",
            new Date().toISOString(),
          );
        }
        if (correlation) {
          runRuntimeProjection = reduceRuntimeProjection(
            runRuntimeProjection,
            runWasCancelled
              ? { type: "cancelled", message: "Pi invocation cancelled." }
              : { type: "error", message: "Pi invocation failed." },
          );
          interrupted = attachTerminalAgentActionEvidence(
            interrupted,
            createTerminalAgentActionEvidence({
              correlation,
              projection: runRuntimeProjection,
              terminalStatus: runWasCancelled ? "cancelled" : "failed",
            }),
          );
        }
        runConversation = interrupted;
        dispatchJourneyRuntime({ type: "conversation_snapshot", identity: runtimeIdentity, conversation: runConversation });
        if (selectedJourneyRef.current === ownerJourneyId
          && conversationRef.current.id === baseConversation.id
          && conversationRef.current.liveIdentity.generation === ownerGeneration) {
          conversationRef.current = interrupted;
          setConversation(interrupted);
        }
        if (correlation) {
          try {
            if (settlementAuthority) {
              await turnFinalizationCoordinator.finalizeInterruptedTurn({
                projection: interrupted,
                authority: settlementAuthority,
              }, {
                loadActiveEvidence: loadActiveSettlementEvidence,
                saveInterruptedProjection: saveInterruptedTurnLifecycle,
                cleanupLease: releaseDurablePiInvocationLease,
              });
              if (selectedJourneyRef.current === ownerJourneyId) {
                setBlockingTurnJournalRecord(undefined);
                setTurnRecoveryError(undefined);
                setTurnRecoveryBusy(false);
              }
            } else {
              await saveDedicatedJourneyConversation(interrupted);
            }
          } catch (error) {
            dispatchJourneyRuntime({
              type: "append_warning", journeyId: ownerJourneyId, identity: runtimeIdentity,
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
        dispatchJourneyRuntime({ type: "finalization_finished", identity: runtimeIdentity });
      } else if (correlation && settlementAuthority) {
        dispatchJourneyRuntime({ type: "finalization_started", identity: runtimeIdentity });
        try {
          await turnFinalizationCoordinator.finalizeCompletedTurn({
            authority: settlementAuthority,
            correlation,
            projection: runConversation,
            decorate: (settled) => {
              runRuntimeProjection = reduceRuntimeProjection(runRuntimeProjection, { type: "done" });
              return attachTerminalAgentActionEvidence(
                settled,
                createTerminalAgentActionEvidence({ correlation, projection: runRuntimeProjection }),
              );
            },
          }, finalizationPorts);
          setExactSettlementError(settlementAuthority, undefined);
        } catch (error) {
          setExactSettlementError(settlementAuthority, error instanceof Error ? error.message : String(error));
        } finally {
          dispatchJourneyRuntime({ type: "finalization_finished", identity: runtimeIdentity });
          await refreshTurnJournalEvidence(ownerJourneyId);
        }
      }
    }
    if (runStartReservationRef.current === runtimeIdentity) runStartReservationRef.current = undefined;
    setRunStartReservation((current) => current === runtimeIdentity ? undefined : current);
  }

  async function startSelectedJourney() {
    if (runtimeBusy || journeyThreadState.kind !== "absent" || startingJourneyId) return;
    const ownerJourneyId = selectedJourney;
    const ownerJourneyName = selectedJourneyItem.name;
    setStartingJourneyId(ownerJourneyId);
    setJourneyStartPhase("reserving_operation");
    setJourneyStartError(undefined);
    try {
      const thread = await provisionNautilusJourneyThread(ownerJourneyId, ownerJourneyName, (phase) => {
        if (selectedJourneyRef.current === ownerJourneyId) setJourneyStartPhase(phase);
      });
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      const classified = classifyNautilusJourneyThread(thread, ownerJourneyId);
      if (classified.kind !== "ready") throw new Error("activation_receipt_invalid");
      const dedicatedConversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
      conversationRef.current = dedicatedConversation;
      setConversation(dedicatedConversation);
      setJourneyThreadState(classified);
      setPiContextState("not_initialized");
    } catch (error) {
      if (selectedJourneyRef.current === ownerJourneyId) {
        setJourneyStartError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setStartingJourneyId((current) => current === ownerJourneyId ? undefined : current);
      setJourneyStartPhase(undefined);
    }
  }

  function setJourneyMirrorCommitError(journeyId: string, error: string | undefined) {
    setMirrorCommitErrors((current) => ({ ...current, [journeyId]: error }));
  }

  function setExactSettlementError(authority: ExactSettlementIdentity, error: string | undefined) {
    setExactSettlementErrors((current) => updateExactSettlementError(current, authority, error));
  }

  async function loadConversationThreadAuthority(journeyId: string, threadId: string) {
    const root = await loadNautilusJourneyThread(journeyId);
    if (root?.threadId === threadId) return root;
    const child = (await loadDesktopConversationCatalog(journeyId))
      .find((entry) => entry.kind === "desktop_conversation" && entry.threadId === threadId);
    if (!child || child.kind !== "desktop_conversation") return undefined;
    return desktopConversationThread(journeyId, child);
  }

  const finalizationPorts = createProductionFinalizationPorts({
    loadActiveEvidence: (authority) => loadActiveSettlementEvidence(authority),
    saveProjection: (projection, authority) => saveProjectedTurnLifecycle(projection, authority),
    cleanupLease: (authority) => releaseDurablePiInvocationLease(authority),
  });

  async function loadActiveSettlementEvidence(authority: JourneySettlementAuthority) {
    const [thread, persisted] = await Promise.all([
      loadConversationThreadAuthority(authority.journeyId, authority.threadId),
      loadDedicatedJourneyConversation(authority.journeyId, authority.generation, authority.threadId, {
        sessionId: authority.piSessionId, sessionFile: authority.piSessionFile,
      }),
    ]);
    const classified = classifyNautilusJourneyThread(thread, authority.journeyId);
    const currentTurn = lastItem(persisted?.reconciliation.turns ?? []);
    if (classified.kind !== "ready" || !persisted || !currentTurn) {
      throw new Error("settlement_pre_frontier_authority_stale");
    }
    const evidence = {
      activeGeneration: classified.activeGeneration.generation,
      currentRunId: currentTurn.runId ?? "",
      currentTurnId: currentTurn.turnId,
    };
    validatePreFrontierSettlement(authority, persisted, evidence);
    return evidence;
  }

  async function saveProjectedTurnLifecycle(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ): Promise<void> {
    await saveActiveSettlementProjection(projection, authority);
    let catalogMessageCount = projection.messages.length;
    const settledCompaction = Object.values(projection.terminalAgentActionEvidence ?? {}).some((evidence) => (
      evidence.runId === authority.runId
      && evidence.projection.operations.some((operation) => operation.kind === "compaction" && operation.status === "completed")
    ));
    if (projection.liveIdentity.piSessionFile) {
      const segmentAuthority = {
        journeyId: authority.journeyId,
        threadId: authority.threadId,
        generation: authority.generation,
        sessionId: authority.piSessionId,
        sessionFile: projection.liveIdentity.piSessionFile,
      };
      const manifest = settledCompaction
        ? await refreshConversationSegments(segmentAuthority)
        : await loadConversationSegments(segmentAuthority);
      if (manifest) {
        const availableProjections = partitionConversationBySegments(projection, manifest);
        const projectionsToPublish = settledCompaction
          ? availableProjections
          : availableProjections.slice(-1);
        catalogMessageCount = await publishConversationSegmentProjections(
          segmentAuthority,
          projectionsToPublish,
        );
      }
    }
    if (authority.threadId.startsWith("desktop-thread-")) {
      const updatedEntry = await reconcileDesktopConversationCatalogEntry({
        journeyId: authority.journeyId,
        threadId: authority.threadId,
        generation: authority.generation,
        updatedAt: lastItem(projection.messages)?.createdAt ?? new Date().toISOString(),
        messageCount: catalogMessageCount,
      });
      setConversationCatalog((current) => current.map((entry) => (
        entry.kind === "desktop_conversation" && entry.threadId === authority.threadId ? updatedEntry : entry
      )));
    }
  }

  async function saveInterruptedTurnLifecycle(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ): Promise<void> {
    await saveActiveSettlementProjection(projection, authority);
    const journal = await loadTurnJournal(authority.journeyId);
    if (journal.records.some((record) => record.authority.runId === authority.runId)) {
      await advanceTurnJournal(authority, ["admitted", "running", "terminal_durable"], "interrupted");
    }
  }

  const convergenceDeps = {
    ports: finalizationPorts,
    reconcileDeliveryDebt: (journeyId: string) => reconcilePiBackedMirrorDeliveryDebt(journeyId),
    loadProjectionByCoords: (journeyId: string, generation: number, threadId: string) => (
      loadDedicatedJourneyConversation(journeyId, generation, threadId)
    ),
    deliverPiBackedOutboxItem: (itemId: string, journeyId: string) => (
      deliverPiBackedMirrorOutboxItem(itemId, journeyId)
    ),
    loadThread: (journeyId: string, threadId: string) => loadConversationThreadAuthority(journeyId, threadId),
    inspectTranscript: (
      journeyId: string, threadId: string, generation: number, piSessionId: string, piSessionFile: string,
    ) => inspectDedicatedPiTranscript(journeyId, threadId, generation, piSessionId, piSessionFile, true),
    inspectNativeOccupancy: () => inspectPiInvocations(),
    onExactError: (
      identity: ExactSettlementIdentity | JourneySettlementAuthority,
      message: string | undefined,
    ) => setExactSettlementError(identity, message),
  };

  async function refreshTurnJournalEvidence(ownerJourneyId: string) {
    try {
      const journal = await loadTurnJournal(ownerJourneyId);
      if (selectedJourneyRef.current === ownerJourneyId) {
        setJourneyTurnJournalRecords(journal.records);
      }
    } catch {
      // Presentation evidence refresh only; durable stores stay authoritative.
    }
  }

  async function recoverPostTerminalPersistence(ownerJourneyId: string) {
    if (postTerminalRecoveryRef.current || selectedRuntimeBusy || piInvocationOccupancy.status !== "known") return;
    const ownerEntry = journeyRuntimeStateRef.current.entries[ownerJourneyId];
    if (ownerEntry && isJourneyRuntimeActiveOrFinalizing(ownerEntry)) return;
    postTerminalRecoveryRef.current = true;
    setIsRetryingMirrorCommit(true);
    try {
      await turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, convergenceDeps);
      await reconcilePiInvocationOccupancy();
      setJourneyMirrorCommitError(ownerJourneyId, undefined);
      setExactSettlementErrors((current) => Object.fromEntries(
        Object.entries(current).filter(([, error]) => error.journeyId !== ownerJourneyId),
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("mirror_append_pi_recovery_active_lease")) {
        setJourneyMirrorCommitError(ownerJourneyId, message);
      }
    } finally {
      postTerminalRecoveryRef.current = false;
      setIsRetryingMirrorCommit(false);
      await refreshTurnJournalEvidence(ownerJourneyId);
    }
  }

  function publishSteeringConversation(next: JourneyConversation, identity: JourneyRunIdentity) {
    if (identity.kind !== "live") return;
    steeringEvidenceByRunRef.current[identity.authority.runId] = next.steeringEvidence?.filter(
      (item) => item.runId === identity.authority.runId,
    ) ?? [];
    dispatchJourneyRuntime({ type: "conversation_snapshot", identity, conversation: next });
    if (selectedJourneyRef.current === identity.authority.journeyId
      && conversationRef.current.id === identity.authority.threadId) {
      conversationRef.current = next;
      setConversation(next);
    }
  }

  async function submitActiveSteering() {
    const identity = selectedRuntime.identity;
    const text = draft.trim();
    if (!selectedCanSteer || identity?.kind !== "live" || !text) return;
    if (pendingFileAttachments.length > 0) {
      setFileAttachmentError("File attachments cannot be added to a Steering message yet.");
      return;
    }
    let staged: JourneyConversation;
    let requestId: string;
    try {
      const result = appendPendingSteering(conversationRef.current, identity.authority, text);
      staged = result.conversation;
      requestId = result.evidence.requestId;
      publishSteeringConversation(staged, identity);
      await saveDedicatedJourneyConversation(staged);
      setJourneyComposerDraft(identity.authority.journeyId, "", true);
    } catch (error) {
      dispatchJourneyRuntime({
        type: "append_warning",
        journeyId: identity.authority.journeyId,
        identity,
        message: `Steering was not staged: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }

    try {
      const evidence = staged.steeringEvidence?.find((item) => item.requestId === requestId);
      if (!evidence) throw new Error("steering_request_missing");
      const admission = await steerLivePiInvocation({
        requestId,
        sequence: evidence.sequence,
        text: evidence.text,
        runAuthority: identity.authority,
      });
      const next = admission.status === "accepted"
        ? transitionSteering(staged, identity.authority, requestId, "accepted")
        : staged;
      publishSteeringConversation(next, identity);
      await saveDedicatedJourneyConversation(next);
    } catch (error) {
      const rejected = transitionSteering(staged, identity.authority, requestId, "rejected");
      publishSteeringConversation(rejected, identity);
      await saveDedicatedJourneyConversation(rejected).catch(() => undefined);
      dispatchJourneyRuntime({
        type: "append_warning",
        journeyId: identity.authority.journeyId,
        identity,
        message: `Steering was rejected: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  async function cancelActiveRun() {
    if (!navigationPresentation.cancelVisible || !selectedRuntime.identity) {
      return;
    }
    const identity = selectedRuntime.identity;

    try {
      await cancelExactJourneyRun(identity, { cancelInvocation: cancelLivePiInvocation });
      dispatchJourneyRuntime({
        type: "cancel_requested",
        identity,
        message: "Pi invocation cancelled.",
      });
    } catch (error) {
      dispatchJourneyRuntime({
        type: "stream_event",
        identity,
        event: { type: "error", message: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  function requestConversationRestart() {
    if (runtimeBusy || isJourneyReloading || turnRecoveryBusy || journeyThreadState.kind !== "ready" || blockingTurnJournalRecord || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)) return;
    setJourneyMenuOpen(false);
    setRestartConfirmationOpen(true);
    setJourneyReloadStatus(undefined);
  }

  async function confirmConversationRestart() {
    if (runtimeBusy || isJourneyReloading || journeyThreadState.kind !== "ready" || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)) return;
    const ownerJourneyId = selectedJourney;
    const previousGeneration = journeyThreadState.activeGeneration.generation;
    setIsJourneyReloading(true);
    setJourneyReloadStatus("Checking durable turn recovery…");
    try {
      const journal = await loadTurnJournal(ownerJourneyId);
      const blockingRecord = findBlockingTurnJournalRecord(
        journal,
        ownerJourneyId,
        previousGeneration,
        journeyThreadState.thread.threadId,
        selectedActiveNativeLease?.authority.runId,
      );
      if (blockingRecord) {
        setBlockingTurnJournalRecord(blockingRecord);
        setRestartConfirmationOpen(false);
        throw new Error("Mirror is still preparing the previous message. Try again when the conversation is ready.");
      }
      setJourneyReloadStatus("Reserving next generation…");
      const childEntry = selectedConversationEntry?.kind === "desktop_conversation"
        ? selectedConversationEntry
        : undefined;
      const thread = childEntry
        ? await restartDesktopConversation({ journeyId: ownerJourneyId, conversationId: childEntry.conversationId })
            .then((updated) => {
              setConversationCatalog((current) => current.map((entry) => entry.conversationId === updated.conversationId ? updated : entry));
              return desktopConversationThread(ownerJourneyId, updated);
            })
        : await restartNautilusJourneyThread(ownerJourneyId, selectedJourneyItem.name, (phase) => {
            if (selectedJourneyRef.current !== ownerJourneyId) return;
            const labels: Record<string, string> = {
              reserving_generation: "Reserving next generation…",
              creating_pi_session: "Creating native Pi session…",
              creating_mirror_conversation: "Creating Mirror conversation…",
              activating_journey_context: "Activating Journey context…",
              verifying_replacement: "Verifying replacement authority…",
              switching_generation: "Switching active generation…",
            };
            setJourneyReloadStatus(labels[phase] ?? "Resetting agent context…");
          });
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      const classified = classifyNautilusJourneyThread(thread, ownerJourneyId);
      if (classified.kind !== "ready" || classified.activeGeneration.generation !== previousGeneration + 1) {
        throw new Error("Restart did not publish the expected next generation.");
      }
      const restartedConversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
      await saveDedicatedJourneyConversation(restartedConversation);
      conversationRef.current = restartedConversation;
      setConversation(restartedConversation);
      setJourneyThreadState(classified);
      setJourneyComposerDraft(ownerJourneyId, "", true);
      setPendingFileAttachments([]);
      setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
      setFileAttachmentError(undefined);
      setFileDropActive(false);
      dispatchJourneyRuntime({ type: "reset", journeyId: ownerJourneyId });
      setPiContextState("not_initialized");
      setJourneyPreferences((preferences) => markJourneyRecent(preferences, ownerJourneyId));
      setRestartConfirmationOpen(false);
      setJourneyReloadStatus(`Generation ${classified.activeGeneration.generation} is ready. Previous conversation preserved.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJourneyReloadStatus(`Restart failed. The current generation remains active. ${message}`);
    } finally {
      setIsJourneyReloading(false);
    }
  }

  async function recoverPreservedResponse() {
    const record = blockingTurnJournalRecord;
    if (!record || record.phase !== "terminal_durable" || journeyThreadState.kind !== "ready"
      || selectedRuntimeBusy || !hasFreshCompleteTurnJournalEvidence(record)) return;
    const ownerJourneyId = selectedJourney;
    let localCompletionEstablished = false;
    setTurnRecoveryBusy(true);
    setTurnRecoveryError(undefined);
    try {
      const durable = await loadDedicatedJourneyConversation(
        ownerJourneyId,
        record.authority.generation,
        record.authority.threadId,
      );
      if (!durable) throw new Error("complete_durable_conversation_missing");
      const correlation = createDedicatedTurnAuthority(
        journeyThreadState.thread,
        record.authority.runId,
        record.authority.turnId,
        record.authority.harnessUserMessageId,
        record.authority.harnessAssistantMessageId,
      );
      const authority = createJourneySettlementAuthority(
        createRunAuthority(correlation, durable.liveIdentity, journeyThreadState.activeGeneration),
      );
      const exactRecord = requireExactTurnJournalRecord(await loadTurnJournal(ownerJourneyId), authority);
      if (decideTurnJournalRecovery(exactRecord) !== "project_completed"
        || !hasFreshCompleteTurnJournalEvidence(exactRecord)) {
        throw new Error("preserved_response_authority_changed");
      }
      const execution = exactRecord.terminalEvidence!.piExecution!;
      const sessionFile = durable.liveIdentity.piSessionFile;
      if (!sessionFile) throw new Error("preserved_response_session_authority_missing");
      const user = durable.messages.find((message) => message.id === authority.harnessUserMessageId);
      const assistant = durable.messages.find((message) => message.id === authority.harnessAssistantMessageId);
      if (!user || !assistant) throw new Error("preserved_response_staged_messages_missing");
      let recovered = replaceJourneyConversationMessages(
        durable,
        durable.messages.map((message) => message.id === authority.harnessAssistantMessageId
          ? { ...message, content: execution.assistantText }
          : message),
      );
      recovered = applyPiExecutionEvidence(recovered, correlation, {
        userEntryId: execution.userEntryId,
        assistantEntryId: execution.assistantEntryId,
        leafEntryId: execution.leafEntryId,
        entryCount: execution.entryCount,
        sessionFile,
        committedAt: execution.committedAt,
      });
      recovered = commitHarnessTurn(recovered, correlation, new Date().toISOString());
      await saveProjectedTurnLifecycle(recovered, authority);
      localCompletionEstablished = true;
      conversationRef.current = recovered;
      setConversation(recovered);
      setBlockingTurnJournalRecord(undefined);
      setTurnRecoveryNotice("The preserved response was recovered without running the agent again.");
      requireExactTurnJournalRecord(await loadTurnJournal(ownerJourneyId), authority);
      await turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, convergenceDeps);
      const settled = await loadDedicatedJourneyConversation(
        ownerJourneyId,
        authority.generation,
        authority.threadId,
      );
      if (settled && selectedJourneyRef.current === ownerJourneyId) {
        conversationRef.current = settled;
        setConversation(settled);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (localCompletionEstablished) {
        setJourneyMirrorCommitError(ownerJourneyId, message);
      } else {
        setTurnRecoveryError(`Recover preserved response failed: ${message}. Durable evidence remains preserved.`);
      }
    } finally {
      if (selectedJourneyRef.current === ownerJourneyId) setTurnRecoveryBusy(false);
    }
  }

  async function interruptInactiveTurnRecord(
    record: TurnJournalRecord,
    ownerJourneyId: string,
    activeGeneration: number,
  ) {
    const interruptedRecord = await interruptInactiveTurnJournal(record, activeGeneration);
    if (interruptedRecord.authority.generation === activeGeneration) {
      const currentConversation = conversationRef.current;
      const ownsTurn = currentConversation.journeyId === ownerJourneyId
        && currentConversation.reconciliation.turns.some((turn) => turn.turnId === interruptedRecord.authority.turnId);
      if (ownsTurn) {
        let interruptedConversation = interruptDedicatedTurn(
          currentConversation,
          interruptedRecord.authority.turnId,
          "turn_interrupted_after_native_inactivity",
          new Date().toISOString(),
        );
        interruptedConversation = replaceJourneyConversationMessages(
          interruptedConversation,
          interruptedConversation.messages.filter(
            (message) => message.id !== interruptedRecord.authority.harnessAssistantMessageId,
          ),
        );
        await saveDedicatedJourneyConversation(interruptedConversation);
        conversationRef.current = interruptedConversation;
        setConversation(interruptedConversation);
      }
    }
    return loadTurnJournal(ownerJourneyId);
  }

  async function markBlockingTurnInterrupted() {
    if (!blockingTurnJournalRecord || journeyThreadState.kind !== "ready" || selectedRuntimeBusy) return;
    const ownerJourneyId = selectedJourney;
    const activeGeneration = journeyThreadState.activeGeneration.generation;
    setTurnRecoveryBusy(true);
    setTurnRecoveryError(undefined);
    try {
      const journal = await interruptInactiveTurnRecord(
        blockingTurnJournalRecord,
        ownerJourneyId,
        activeGeneration,
      );
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      setBlockingTurnJournalRecord(
        findBlockingTurnJournalRecord(
          journal,
          ownerJourneyId,
          activeGeneration,
          journeyThreadState.thread.threadId,
          selectedActiveNativeLease?.authority.runId,
        ),
      );
      setTurnRecoveryNotice("The durable attempt was preserved. You can continue without the unverified response.");
      setJourneyReloadStatus(undefined);
    } catch {
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      setTurnRecoveryError("Preserve attempt and continue failed. Durable evidence remains preserved.");
    } finally {
      if (selectedJourneyRef.current === ownerJourneyId) setTurnRecoveryBusy(false);
    }
  }

  async function performRecoveryRoute(route: ConversationRecoveryRouteId) {
    if (activeRecoveryRoute) return;
    if (route === "start_new_conversation") {
      requestBlankDesktopConversation();
      return;
    }
    if (route === "reset_agent_context") {
      requestConversationRestart();
      return;
    }
    setActiveRecoveryRoute(route);
    try {
      if (route === "retry_mirror_sync") {
        await recoverPostTerminalPersistence(selectedJourney);
      } else if (route === "recover_preserved_response") {
        await recoverPreservedResponse();
      } else if (route === "preserve_attempt_and_continue") {
        await markBlockingTurnInterrupted();
      }
    } finally {
      setActiveRecoveryRoute(undefined);
    }
  }

  async function persistAgentSettings(next: AgentSettings, successMessage: string) {
    setAgentSettingsState("saving");
    setAgentSettingsMessage(undefined);
    try {
      await saveAgentSettings(next);
      setAgentSettings(next);
      setAgentSettingsState("ready");
      setAgentSettingsMessage(successMessage);
      return true;
    } catch (error) {
      setAgentSettingsState("error");
      setAgentSettingsMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async function saveOnboardingAgentProfile() {
    const selectedModel = onboardingModelOptions.find(
      (model) => modelOptionValue(model) === onboardingModelDraft,
    );
    if (!selectedModel) {
      setAgentSettingsMessage("Choose one of the models available through Pi.");
      return;
    }
    const saved = await persistAgentSettings({
      ...agentSettings,
      globalProfile: {
        ...agentSettings.globalProfile,
        model: selectedModel,
        thinkingLevel: "pi-default",
        invocationMode: "mirror",
      },
    }, "Model saved on this device.");
    if (saved) {
      setProviderInvocationMode("mirror");
      setAgentProfileConfigured(true);
    }
  }

  async function saveGlobalAgentProfile() {
    try {
      const model = modelFromOptionValue(globalModelDraft);
      await persistAgentSettings({
        ...agentSettings,
        globalProfile: {
          model,
          thinkingLevel: globalThinkingDraft,
          invocationMode: providerInvocationMode,
        },
      }, "Global agent defaults saved on this device.");
    } catch (error) {
      setAgentSettingsMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveSelectedJourneyAgentOverride() {
    try {
      const override = {
        model: journeyModelDraft === "inherit" ? undefined : modelFromOptionValue(journeyModelDraft),
        thinkingLevel: journeyThinkingDraft === "inherit" ? undefined : journeyThinkingDraft,
      };
      const saved = await persistAgentSettings(
        setJourneyAgentOverride(agentSettings, selectedJourney, override),
        `Agent profile saved for ${selectedJourneyItem.name}.`,
      );
      if (saved) setJourneyAgentProfileOpen(false);
    } catch (error) {
      setAgentSettingsMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function resetSelectedJourneyAgentOverride() {
    const saved = await persistAgentSettings(
      setJourneyAgentOverride(agentSettings, selectedJourney, {}),
      `${selectedJourneyItem.name} now inherits global agent defaults.`,
    );
    if (saved) setJourneyAgentProfileOpen(false);
  }

  function openJourneyAgentProfileSelector() {
    setAgentSettingsMessage(undefined);
    setJourneyAgentProfileOpen(true);
  }

  async function restoreDefaultAgentSettings() {
    const defaults = createDefaultAgentSettings();
    await persistAgentSettings(defaults, "Mirror Desktop agent defaults restored.");
    setProviderInvocationMode(defaults.globalProfile.invocationMode);
  }

  function applyProviderConfiguration() {
    const nextConfig = createProviderConfig({
      command: providerCommand,
      argsText: providerArgsText,
      useStdin: providerUseStdin,
      safeTestMode: providerSafeTestMode,
      invocationMode: agentSettings.globalProfile.invocationMode,
    });
    setProviderConfig(nextConfig);
    setProviderCommand(nextConfig.command);
    setProviderArgsText(providerConfigToArgsText(nextConfig));
    setProviderUseStdin(nextConfig.useStdin);
    setProviderSafeTestMode(nextConfig.safeTestMode);
  }

  function resetProviderConfiguration() {
    setProviderConfig(defaultPiProviderConfig);
    setProviderCommand(defaultPiProviderConfig.command);
    setProviderArgsText(providerConfigToArgsText(defaultPiProviderConfig));
    setProviderUseStdin(defaultPiProviderConfig.useStdin);
    setProviderSafeTestMode(defaultPiProviderConfig.safeTestMode);
  }

  async function expandJourneyConversations(ownerJourneyId: string) {
    if (!ownerJourneyId) return;
    if (ownerJourneyId !== selectedJourney) {
      selectJourney(ownerJourneyId, "pointer");
      dispatchJourneySearch({ type: "journey_selected", intent: "pointer" });
    }
    dispatchConversationFocus({ type: "expand", journeyId: ownerJourneyId });
    setConversationCatalogStatus("loading");
    setConversationCatalogError(undefined);
    setConversationActionMessage(undefined);
    await waitForCatalogLoadingFeedbackPaint();
    try {
      const rootThread = ownerJourneyId === selectedJourney && journeyThreadState.kind === "ready"
        ? journeyThreadState.thread
        : await loadNautilusJourneyThread(ownerJourneyId);
      if (!rootThread) throw new Error("Start this Journey before creating additional conversations.");
      setFocusedJourneyRootThreadId(rootThread.threadId);
      const desktopEntries = await loadDesktopConversationCatalog(ownerJourneyId);
      const managedMirrorConversationIds = [
        ...rootThread.generations.map((generation) => generation.mirrorConversationId),
        ...desktopEntries.flatMap((entry) => entry.kind === "desktop_conversation"
          ? entry.authority.generations.map((generation) => generation.mirrorConversationId)
          : []),
      ];
      const mirrorEntries = await loadMirrorConversationCatalog({
        journeyId: ownerJourneyId,
        rootThreadId: rootThread.threadId,
        managedMirrorConversationIds,
        limit: 50,
      });
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      setConversationCatalog([...desktopEntries, ...mirrorEntries]
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)));
      setConversationCatalogStatus("ready");
    } catch (error) {
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      setConversationCatalogStatus("error");
      setConversationCatalogError(error instanceof Error ? error.message : String(error));
    }
  }

  function requestBlankDesktopConversation() {
    setConversationCreateDraft(nextDesktopConversationTitle(conversationCatalog));
    setConversationCreateError(undefined);
    setConversationCreateOpen(true);
  }

  async function createBlankDesktopConversation() {
    const title = normalizeConversationTitle(conversationCreateDraft);
    const validationError = validateConversationTitle(conversationCatalog, title);
    if (validationError || conversationActionBusy) {
      setConversationCreateError(validationError);
      return;
    }
    setConversationActionBusy(true);
    setConversationCreateError(undefined);
    setConversationActionMessage("Creating dedicated Desktop authority…");
    try {
      const created = await createDesktopConversation({
        journeyId: selectedJourney,
        journeyName: selectedJourneyItem.name,
        title,
      });
      setConversationCatalog((current) => [created, ...current]);
      dispatchConversationFocus({ type: "select_desktop", journeyId: selectedJourney, conversationId: created.conversationId });
      setConversationCreateOpen(false);
      setConversationActionMessage(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setConversationCreateError(message);
      setConversationActionMessage(message);
    } finally {
      setConversationActionBusy(false);
    }
  }

  async function createConversationFromMirrorHistory(entry: Extract<ConversationCatalogEntry, { kind: "mirror_history" }>) {
    if (!availableConversationActions(entry).includes("create_agent_handoff")) return;
    setConversationActionBusy(true);
    setConversationActionMessage("Creating dedicated Desktop authority…");
    try {
      const created = await createDesktopConversation({
        journeyId: selectedJourney,
        journeyName: selectedJourneyItem.name,
        title: nextDesktopConversationTitle(conversationCatalog),
        sourceConversationId: entry.conversationId,
        sourceMessageLimit: 30,
      });
      const prompt = createAgentHandoffPrompt({
        journeyId: selectedJourney,
        sourceConversationId: entry.conversationId,
        messageLimit: 30,
      });
      setConversationCatalog((current) => [created, ...current]);
      updateComposerDrafts((current) => updateComposerDraft(
        current, conversationDraftKey(selectedJourney, created.conversationId), prompt,
      ));
      dispatchConversationFocus({ type: "select_desktop", journeyId: selectedJourney, conversationId: created.conversationId });
      setConversationActionMessage(undefined);
    } catch (error) {
      setConversationActionMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setConversationActionBusy(false);
    }
  }

  async function openSelectedMirrorHistoryInTerminal(entry: Extract<ConversationCatalogEntry, { kind: "mirror_history" }>) {
    if (!availableConversationActions(entry).includes("open_terminal_recall")) return;
    setConversationActionBusy(true);
    setConversationActionMessage("Opening bounded recalled context in Terminal…");
    try {
      await openMirrorConversationInTerminal({ journeyId: selectedJourney, conversationId: entry.conversationId, messageLimit: 30 });
      setConversationActionMessage("Terminal opened with a bounded recalled-context handoff.");
    } catch (error) {
      setConversationActionMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setConversationActionBusy(false);
    }
  }

  function requestDesktopConversationDeletion(entry: Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>) {
    if (selectedRuntimeBusy || runStartReservation || conversationActionBusy) return;
    setConversationDeleteError(undefined);
    setConversationDeleteTarget(entry);
  }

  async function confirmDesktopConversationDeletion() {
    const entry = conversationDeleteTarget;
    if (!entry || selectedRuntimeBusy || runStartReservation || conversationActionBusy) return;
    setConversationActionBusy(true);
    setConversationDeleteError(undefined);
    setConversationActionMessage("Deleting Desktop Conversation…");
    try {
      await deleteDesktopConversation({ journeyId: selectedJourney, conversationId: entry.conversationId });
      setConversationCatalog((current) => current.filter((candidate) => candidate.conversationId !== entry.conversationId));
      updateComposerDrafts((current) => {
        const next = { ...current };
        delete next[conversationDraftKey(selectedJourney, entry.conversationId)];
        return next;
      }, true);
      dispatchConversationFocus({ type: "select_root", journeyId: selectedJourney });
      setConversationActionMessage("Desktop Conversation deleted.");
      setConversationDeleteTarget(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setConversationDeleteError(message);
      setConversationActionMessage(message);
    } finally {
      setConversationActionBusy(false);
    }
  }

  function requestConversationRename(entry: ConversationCatalogEntry) {
    if (entry.kind === "mirror_history" && !availableConversationActions(entry).includes("rename_in_mirror")) return;
    setMirrorRenameTarget({ journeyId: selectedJourney, entry });
    setMirrorRenameDraft(entry.title);
    setMirrorRenameError(undefined);
  }

  async function suggestSelectedConversationTitle() {
    const target = mirrorRenameTarget;
    if (!target || target.entry.kind !== "desktop_conversation" || conversationActionBusy
      || conversationRef.current.id !== target.entry.threadId) return;
    const excerpts = conversationRef.current.messages.slice(-8).map((message) => (
      `${message.role === "user" ? "User" : "Assistant"}: ${message.content.slice(0, 4000)}`
    )).filter((item) => item.trim());
    if (!excerpts.length) {
      setMirrorRenameError("Add at least one message before requesting a title suggestion.");
      return;
    }
    setConversationActionBusy(true);
    setMirrorRenameError(undefined);
    try {
      const suggestion = await suggestDesktopConversationTitle({
        journeyId: target.journeyId,
        conversationId: target.entry.conversationId,
        excerpts,
        config: effectiveProviderConfig,
      });
      setMirrorRenameDraft(suggestion);
      setMirrorRenameError(validateConversationTitle(conversationCatalog, suggestion, {
        kind: target.entry.kind,
        conversationId: target.entry.conversationId,
      }));
    } catch (error) {
      setMirrorRenameError(error instanceof Error ? error.message : String(error));
    } finally {
      setConversationActionBusy(false);
    }
  }

  async function confirmMirrorConversationRename() {
    const target = mirrorRenameTarget;
    if (!target || conversationActionBusy) return;
    const title = normalizeConversationTitle(mirrorRenameDraft);
    const validationError = validateConversationTitle(conversationCatalog, title, {
      kind: target.entry.kind,
      conversationId: target.entry.conversationId,
    });
    if (validationError) {
      setMirrorRenameError(validationError);
      return;
    }
    if (title === normalizeConversationTitle(target.entry.title)) return;
    setConversationActionBusy(true);
    setMirrorRenameError(undefined);
    setConversationActionMessage(target.entry.kind === "mirror_history" ? "Renaming in Mirror…" : "Renaming Desktop Conversation…");
    try {
      const renamed = target.entry.kind === "mirror_history"
        ? await renameMirrorConversation({ journeyId: target.journeyId, conversationId: target.entry.conversationId, title })
        : await renameDesktopConversation({ journeyId: target.journeyId, conversationId: target.entry.conversationId, title });
      if (selectedJourney === target.journeyId) {
        setConversationCatalog((current) => current.map((candidate) => (
          candidate.kind === target.entry.kind && candidate.conversationId === target.entry.conversationId
            ? { ...candidate, title: renamed.title }
            : candidate
        )));
      }
      setConversationActionMessage(target.entry.kind === "mirror_history"
        ? "Canonical Mirror title updated."
        : "Desktop Conversation title updated.");
      setMirrorRenameTarget(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMirrorRenameError(message);
      setConversationActionMessage(message);
    } finally {
      setConversationActionBusy(false);
    }
  }

  function selectJourney(journeyId: string, intent: JourneyNavigationIntent = "pointer") {
    journeyId = resolveJourneySelection(selectedJourney, journeyId, intent);
    if (journeyId === selectedJourney) return;
    if (conversationFocus.kind === "focused_journey") {
      dispatchConversationFocus({ type: "collapse", journeyId: conversationFocus.journeyId });
    }
    setConversationCatalog([]);
    setFocusedJourneyRootThreadId(undefined);
    setConversationCatalogStatus("idle");
    setInactiveNativeAttempt(undefined);

    const runtimeEntry = selectJourneyRuntime(journeyRuntimeState, journeyId);
    const runtimeSnapshot = runtimeEntry.conversationSnapshot
      ? selectJourneyRuntimeConversation(
          journeyRuntimeState,
          journeyId,
          runtimeEntry.conversationSnapshot.liveIdentity.generation,
        )
      : undefined;
    const nextConversation = runtimeSnapshot
      ?? createJourneyConversation({ journeyId, initialMessages });
    conversationRef.current = nextConversation;
    setConversation(nextConversation);
    setConversationLoaded(false);
    setJourneyThreadState({ kind: "loading" });
    setPiContextState("checking");
    setJourneyReloadStatus(undefined);
    selectedJourneyRef.current = journeyId;
    setSelectedJourney(journeyId);
    setDraft(composerDrafts[journeyId] ?? "");
    setJourneyPreferences((preferences) => ({
      ...preferences,
      activeJourneyId: journeyId,
    }));
    setPendingFileAttachments([]);
    setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
    setFileAttachmentError(undefined);
    setFileDropActive(false);
  }

  function openJourneyTreeMenu(
    button: HTMLButtonElement,
    event: Pick<ReactMouseEvent<HTMLButtonElement> | ReactKeyboardEvent<HTMLButtonElement>, "preventDefault" | "stopPropagation">,
  ) {
    event.preventDefault();
    event.stopPropagation();
    journeyTreeButtonRef.current = button;
    setJourneyTreeMenuOpen(true);
  }

  async function reloadJourneyTree() {
    if (runtimeBusy || journeyRegistryRefreshState === "refreshing") return;
    setJourneyTreeMenuOpen(false);
    setJourneyRegistryRefreshState("refreshing");
    setJourneyRegistryRefreshMessage("Reloading Journeys from Mirror…");
    try {
      const refreshedRegistry = await refreshJourneyRegistry();
      const reconciled = reconcileReloadedJourneyState(refreshedRegistry, {
        selectedJourneyId: selectedJourney,
        pinnedJourneyIds: journeyPreferences.pinnedJourneyIds,
        recentJourneyIds: journeyPreferences.recentJourneyIds,
        collapsedJourneyIds,
      });
      if (!reconciled) {
        throw new Error("Mirror returned an empty Journey registry.");
      }
      const selectionChanged = reconciled.selectedJourneyId !== selectedJourney;
      setLoadedJourneyRegistry(refreshedRegistry);
      setJourneyPreferences((current) => ({
        ...current,
        activeJourneyId: reconciled.selectedJourneyId,
        pinnedJourneyIds: reconciled.pinnedJourneyIds,
        recentJourneyIds: reconciled.recentJourneyIds,
      }));
      if (selectionChanged) setSelectedJourney(reconciled.selectedJourneyId);
      setCollapsedJourneyIds(reconciled.collapsedJourneyIds);
      setJourneyRegistryRefreshState("succeeded");
      setJourneyRegistryRefreshMessage("Journey tree reloaded.");
    } catch (error) {
      setJourneyRegistryRefreshState("failed");
      setJourneyRegistryRefreshMessage(journeyAdministrationError(error));
    } finally {
      journeyTreeButtonRef.current?.focus();
    }
  }

  function toggleCollapsedJourney(journeyId: string) {
    setCollapsedJourneyIds((current) => {
      const next = new Set(current);
      if (next.has(journeyId)) next.delete(journeyId);
      else next.add(journeyId);
      return next;
    });
  }

  function toggleSidebarPresentation() {
    const next = toggleJourneySidebar({ sidebarCompact, journeyListOrder, pinnedOnly });
    setSidebarCompact(next.sidebarCompact);
    setJourneyListOrder(next.journeyListOrder);
    setPinnedOnly(next.pinnedOnly);
    setJourneyTreeMenuOpen(false);
  }

  function showJourneyTree() {
    const next = activateJourneyTree();
    setSidebarCompact(next.sidebarCompact);
    setJourneyListOrder(next.journeyListOrder);
    setPinnedOnly(next.pinnedOnly);
    setJourneyTreeMenuOpen(false);
  }

  function togglePinnedJourney(journeyId: string) {
    if (runtimeBusy) return;
    setJourneyPreferences((preferences) => ({
      ...preferences,
      pinnedJourneyIds: preferences.pinnedJourneyIds.includes(journeyId)
        ? preferences.pinnedJourneyIds.filter((id) => id !== journeyId)
        : [...preferences.pinnedJourneyIds, journeyId],
    }));
  }

  function openJourneyItemMenu(journeyId: string, trigger: HTMLElement, x: number, y: number) {
    if (runtimeBusy) return;
    journeyItemMenuTriggerRef.current = trigger;
    setJourneyTreeMenuOpen(false);
    setJourneyItemMenu({ journeyId, x, y });
  }

  function openCreateJourney(parentId = "") {
    if (runtimeBusy) return;
    setJourneyAdminDialog({ mode: "create", parentId: parentId || undefined });
    setJourneyAdminName(""); setJourneyAdminSlug(""); setJourneyAdminDescription("");
    setJourneyAdminParent(parentId); setJourneyAdminPosition(appendJourneyPosition(journeyRegistry, parentId));
    setJourneyAdminPath(""); setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null);
    setJourneyTreeMenuOpen(false); setJourneyItemMenu(null);
  }

  function openEditJourney(journeyId: string) {
    if (runtimeBusy) return;
    const journey = findJourneyById(journeyRegistry, journeyId);
    if (!journey) return;
    setJourneyAdminDialog({ mode: "edit", journeyId });
    setJourneyAdminName(journey.name);
    setJourneyAdminSlug(journey.id);
    setJourneyAdminDescription(journey.description ?? "");
    setJourneyAdminPath(journey.projectPath ?? "");
    setJourneyAppearanceMessage(undefined);
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  async function applyJourneySystemAppearance(journeyId: string, icon?: JourneySystemIconId) {
    if (runtimeBusy || journeyAppearanceBusy) return;
    if (icon && !journeyAppearanceById[journeyId] && Object.keys(journeyAppearanceById).length >= 256) {
      setJourneyAppearanceMessage("At most 256 Journey appearance choices can be retained on this device.");
      return;
    }
    setJourneyAppearanceBusy(true); setJourneyAppearanceMessage(undefined);
    try {
      await removeJourneyCustomImage(journeyId);
      cacheJourneyCustomImage(journeyId, null);
      setJourneyAppearanceById((current) => {
        const next = { ...current };
        if (icon) next[journeyId] = { kind: "system", icon };
        else delete next[journeyId];
        return next;
      });
      setJourneyAppearanceMessage(icon ? "System icon applied on this device." : "Default Journey appearance restored on this device.");
    } catch (error) {
      setJourneyAppearanceMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setJourneyAppearanceBusy(false);
    }
  }

  async function chooseJourneyCustomAppearance(journeyId: string) {
    if (runtimeBusy || journeyAppearanceBusy) return;
    const currentIsCustom = journeyAppearanceById[journeyId]?.kind === "custom";
    if (!journeyAppearanceById[journeyId] && Object.keys(journeyAppearanceById).length >= 256) {
      setJourneyAppearanceMessage("At most 256 Journey appearance choices can be retained on this device.");
      return;
    }
    const customCount = Object.values(journeyAppearanceById).filter((appearance) => appearance.kind === "custom").length;
    if (!currentIsCustom && customCount >= 32) {
      setJourneyAppearanceMessage("At most 32 Journeys can use custom images on this device.");
      return;
    }
    setJourneyAppearanceBusy(true); setJourneyAppearanceMessage(undefined);
    try {
      const image = await importJourneyCustomImage(journeyId);
      if (!image) return;
      cacheJourneyCustomImage(journeyId, image);
      setJourneyAppearanceById((current) => ({ ...current, [journeyId]: { kind: "custom" } }));
      setJourneyAppearanceMessage("Custom image imported into channel-local Mirror Desktop storage.");
    } catch (error) {
      setJourneyAppearanceMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setJourneyAppearanceBusy(false);
    }
  }

  async function chooseUserAvatar() {
    if (userAvatarBusy) return;
    setUserAvatarBusy(true);
    setUserAvatarMessage(undefined);
    try {
      const avatar = await importUserAvatar();
      if (!avatar) return;
      setUserAvatar(avatar);
      setUserAvatarMessage("User avatar saved in this app channel.");
    } catch (error) {
      setUserAvatarMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUserAvatarBusy(false);
    }
  }

  async function clearUserAvatar() {
    if (userAvatarBusy || !userAvatar) return;
    setUserAvatarBusy(true);
    setUserAvatarMessage(undefined);
    try {
      await removeUserAvatar();
      setUserAvatar(undefined);
      setUserAvatarMessage("Default user avatar restored.");
    } catch (error) {
      setUserAvatarMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUserAvatarBusy(false);
    }
  }

  function openMoveJourney(journeyId: string) {
    if (runtimeBusy) return;
    const journey = findJourneyById(journeyRegistry, journeyId);
    setJourneyAdminDialog({ mode: "move", journeyId });
    setJourneyAdminParent(journey?.parentId ?? ""); setJourneyAdminPosition(journey?.siblingPosition ?? 0);
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  function openDeleteJourney(journeyId: string) {
    if (runtimeBusy) return;
    const journey = findJourneyById(journeyRegistry, journeyId);
    if (!journey || (journey.children?.length ?? 0) > 0) return;
    setJourneyAdminDialog({ mode: "delete", journeyId });
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  async function executeJourneyMutation(operation: "create_journey" | "update_journey" | "set_project_path" | "clear_project_path" | "move_journey" | "delete_journey", payload: Record<string, unknown>) {
    if (runtimeBusy) return;
    setJourneyAdminState("saving"); setJourneyAdminMessage(undefined);
    try {
      const request = journeyAdminPendingRequest?.operation === operation && JSON.stringify(journeyAdminPendingRequest.payload) === JSON.stringify(payload)
        ? journeyAdminPendingRequest
        : createMutationRequest(journeyRegistry, operation, payload);
      setJourneyAdminPendingRequest(request);
      const deletedJourneyId = operation === "delete_journey" && typeof payload.journeyId === "string" ? payload.journeyId : undefined;
      const replacementJourneyId = deletedJourneyId === selectedJourney ? replacementJourneyAfterDeletion(journeyRegistry, deletedJourneyId) : undefined;
      if (deletedJourneyId === selectedJourney && !replacementJourneyId) throw new Error("The only remaining Journey cannot be deleted.");
      const selectedAfterMutation = replacementJourneyId ?? selectedJourney;
      const result = await mutateJourneyRegistry(selectedJourney, request, replacementJourneyId);
      const reconciled = reconcileReloadedJourneyState(result.registry, {
        selectedJourneyId: selectedAfterMutation, pinnedJourneyIds: journeyPreferences.pinnedJourneyIds,
        recentJourneyIds: journeyPreferences.recentJourneyIds, collapsedJourneyIds,
      });
      if (!reconciled) throw new Error("Verified Journey authority no longer contains the active Journey.");
      setLoadedJourneyRegistry(result.registry);
      if (deletedJourneyId && journeyAppearanceById[deletedJourneyId]?.kind === "custom") {
        void removeJourneyCustomImage(deletedJourneyId)
          .then(() => cacheJourneyCustomImage(deletedJourneyId, null))
          .catch((error) => console.warn("Deleted Journey custom image could not be cleaned up.", error));
      }
      setJourneyAppearanceById((current) => sanitizeJourneyAppearanceById(current, result.registry));
      if (selectedAfterMutation !== selectedJourney) setSelectedJourney(selectedAfterMutation);
      setJourneyPreferences((current) => ({ ...current, activeJourneyId: selectedAfterMutation, pinnedJourneyIds: reconciled.pinnedJourneyIds, recentJourneyIds: reconciled.recentJourneyIds }));
      setCollapsedJourneyIds(reconciled.collapsedJourneyIds);
      setJourneyAdminDialog(null); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null);
      setJourneyRegistryRefreshState("succeeded"); setJourneyRegistryRefreshMessage("Journey structure updated from Mirror.");
    } catch (error) {
      const message = journeyAdministrationError(error);
      setJourneyAdminState("failed"); setJourneyAdminMessage(message);
    }
  }

  async function submitJourneyAdministration(event: FormEvent) {
    event.preventDefault();
    if (!journeyAdminDialog) return;
    if (journeyAdminDialog.mode === "create") {
      await executeJourneyMutation("create_journey", {
        name: journeyAdminName.trim(), slug: journeyAdminSlug.trim(), description: journeyAdminDescription.trim(),
        parentId: journeyAdminParent || null, position: appendJourneyPosition(journeyRegistry, journeyAdminParent),
        ...(journeyAdminPath.trim() ? { projectPath: journeyAdminPath.trim() } : {}),
      });
    } else if (journeyAdminDialog.mode === "edit") {
      await executeJourneyMutation("update_journey", {
        journeyId: journeyAdminDialog.journeyId,
        name: journeyAdminName.trim(),
        description: journeyAdminDescription.trim(),
        projectPath: journeyAdminPath.trim() || null,
      });
    } else if (journeyAdminDialog.mode === "move") {
      await executeJourneyMutation("move_journey", { journeyId: journeyAdminDialog.journeyId, parentId: journeyAdminParent || null, position: journeyAdminPosition });
    } else {
      await executeJourneyMutation("delete_journey", { journeyId: journeyAdminDialog.journeyId });
    }
  }

  const handleChatLocalPath = useCallback(async (path: string) => {
    const ownerJourneyId = selectedJourneyRef.current;
    const ownerBasePath = findJourneyById(journeyRegistry, ownerJourneyId)?.projectPath;
    setLocalReferenceError(undefined);
    try {
      const disposition = await classifyChatLocalReference(ownerJourneyId, path);
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      if (disposition.kind === "journey_document") {
        setSelectedAltitude("operational");
        setSelectedOperationalSurface("artifacts");
        setArtifactNavigationRequest({
          journeyId: ownerJourneyId,
          relativePath: disposition.relativePath,
          requestId: ++artifactNavigationSequenceRef.current,
          expandPreview: true,
        });
        return;
      }
      await openExternalChatLocalReference(path, ownerBasePath);
    } catch (error) {
      if (selectedJourneyRef.current === ownerJourneyId) {
        setLocalReferenceError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [journeyRegistry]);

  function showConversation() {
    setSelectedAltitude("operational");
    setSelectedOperationalSurface("chat");
    chatAutoFollowRef.current = nextConversationAutoFollow(
      chatAutoFollowRef.current,
      { type: "explicit_bottom" },
    );
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }

  const developmentChannel = runtimeChannel?.channel === "development";
  const evaluationChannel = runtimeChannel?.channel === "evaluation";
  const runtimeBindingDraft: RuntimeBinding | undefined = runtimeChannel && runtimeMirrorRoot && runtimeMirrorHome && runtimeMirrorUser
    ? {
        schemaVersion: "1.0.0",
        channel: runtimeChannel.channel === "development" ? "development" : "user",
        mirrorRoot: runtimeMirrorRoot,
        mirrorHome: runtimeMirrorHome,
        mirrorUser: runtimeMirrorUser,
        dbPath: `${runtimeMirrorHome.replace(/\/$/, "")}/memory.db`,
      }
    : undefined;

  async function importJourneysAfterBinding() {
    setRuntimeOnboardingState("importing");
    setRuntimeOnboardingMessage(undefined);
    try {
      const refreshedRegistry = await refreshJourneyRegistry();
      const reconciled = reconcileReloadedJourneyState(refreshedRegistry, {
        selectedJourneyId: selectedJourney,
        pinnedJourneyIds: journeyPreferences.pinnedJourneyIds,
        recentJourneyIds: journeyPreferences.recentJourneyIds,
        collapsedJourneyIds,
      });
      if (!reconciled) {
        setLoadedJourneyRegistry(refreshedRegistry);
        setRuntimeOnboardingState("empty");
        setRuntimeOnboardingMessage("Mirror is connected, but no Journeys were found.");
        return false;
      }
      setLoadedJourneyRegistry(refreshedRegistry);
      setSelectedJourney(reconciled.selectedJourneyId);
      setJourneyPreferences((current) => ({
        ...current,
        activeJourneyId: reconciled.selectedJourneyId,
        pinnedJourneyIds: reconciled.pinnedJourneyIds,
        recentJourneyIds: reconciled.recentJourneyIds,
      }));
      setCollapsedJourneyIds(reconciled.collapsedJourneyIds);
      setRuntimeOnboardingState("ready");
      setRuntimeOnboardingEditing(false);
      setRuntimeOnboardingMessage(undefined);
      setSettingsOpen(false);
      return true;
    } catch {
      setRuntimeOnboardingState("error");
      setRuntimeOnboardingMessage("Mirror was connected, but Journeys couldn’t be loaded.");
      return false;
    }
  }

  async function submitRuntimeBinding(persist: boolean) {
    if (!runtimeBindingDraft) {
      setRuntimeChannelError("Choose Mirror source and home, then enter the Mirror user.");
      setRuntimeBindingFeedback(undefined);
      return;
    }
    setRuntimeBindingState(persist ? "saving" : "validating");
    setRuntimeChannelError(undefined);
    setRuntimeBindingFeedback(undefined);
    try {
      const diagnostic = persist
        ? await saveRuntimeBinding(runtimeBindingDraft)
        : await validateRuntimeBinding(runtimeBindingDraft);
      setRuntimeChannel(diagnostic);
      if (persist) {
        setRuntimeBindingFeedback("Mirror connected. Loading your Journeys…");
        await importJourneysAfterBinding();
      } else {
        setRuntimeBindingFeedback("Binding validated. Save it to activate this channel across restarts.");
      }
    } catch (error) {
      setRuntimeChannelError(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBindingState("idle");
    }
  }

  const runtimeSetupNeedsConnection = Boolean(runtimeChannel)
    && (runtimeChannel?.status !== "validated" || runtimeOnboardingEditing);
  const runtimeSetupVisible = !runtimeChannel
    || runtimeSetupNeedsConnection
    || agentProfileConfigured !== true
    || runtimeOnboardingState !== "ready"
    || flattenJourneyRegistry(loadedJourneyRegistry).length === 0;

  if (runtimeSetupVisible) {
    return (
      <main
        className={`runtime-onboarding-shell channel-${runtimeChannel?.channel ?? "checking"}`}
        data-runtime-channel={runtimeChannel?.channel}
        data-application-theme={applicationTheme}
      >
        <section
          className="runtime-onboarding-card"
          aria-label={!runtimeChannel ? "Prepare Mirror Desktop" : runtimeSetupNeedsConnection ? "Connect your Mirror" : agentProfileConfigured !== true ? "Choose your model" : "Prepare Mirror Desktop"}
        >
          <span className="runtime-onboarding-mark" aria-hidden="true"><img src={appIconUrl} alt="" /></span>
          {runtimeSetupNeedsConnection ? (
            <>
              <p className="eyebrow">Mirror Desktop {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : evaluationChannel ? <span className="evaluation-badge">{EVALUATION_BADGE_LABEL}</span> : null}</p>
              <h1>Connect your Mirror</h1>
              <p>Choose the Mirror installation and personal home this app should use. These fields stay on this Mac.</p>
              <div className="runtime-onboarding-form" aria-label="Required Mirror connection">
                <label className="provider-field">Mirror source directory
                  <span className="journey-path-picker"><input value={runtimeMirrorRoot} onChange={(event) => setRuntimeMirrorRoot(event.target.value)} placeholder="/absolute/path/to/mirror" /><button type="button" onClick={async () => { const path = await chooseRuntimeDirectory("mirrorRoot"); if (path) setRuntimeMirrorRoot(path); }}>Choose…</button></span>
                </label>
                <label className="provider-field">Mirror home directory
                  <span className="journey-path-picker"><input value={runtimeMirrorHome} onChange={(event) => setRuntimeMirrorHome(event.target.value)} placeholder="/absolute/path/to/mirror-home" /><button type="button" onClick={async () => { const path = await chooseRuntimeDirectory("mirrorHome"); if (path) setRuntimeMirrorHome(path); }}>Choose…</button></span>
                </label>
                <label className="provider-field">Mirror user<input value={runtimeMirrorUser} onChange={(event) => setRuntimeMirrorUser(event.target.value)} placeholder="user-slug" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
              </div>
              {runtimeChannelError || (runtimeChannel?.status === "invalid" && runtimeChannel.message) ? <p className="provider-error" role="alert">{runtimeChannelError ?? runtimeChannel?.message}</p> : null}
              <button type="button" disabled={!runtimeBindingDraft || runtimeBindingState !== "idle"} onClick={() => void submitRuntimeBinding(true)}>
                {runtimeBindingState === "saving" ? "Connecting…" : "Validate and continue"}
              </button>
            </>
          ) : !runtimeChannel ? (
            <>
              <p className="eyebrow">Mirror Desktop</p>
              <h1>Checking your Mirror connection…</h1>
              <p>{runtimeChannelError ?? "Preparing secure local setup."}</p>
            </>
          ) : runtimeOnboardingState === "error" || runtimeOnboardingState === "empty" ? (
            <>
              <p className="eyebrow">Mirror Desktop</p>
              <h1>{runtimeOnboardingMessage}</h1>
              <p>{runtimeOnboardingState === "error" ? "Your connection was saved. Try loading your Journeys again or edit the connection." : "Create a Journey in Mirror, then refresh this screen."}</p>
              <div className="provider-actions">
                <button type="button" onClick={() => void importJourneysAfterBinding()}>Try again</button>
                <button className="secondary-button" type="button" onClick={() => setRuntimeOnboardingEditing(true)}>Edit connection</button>
              </div>
            </>
          ) : agentProfileConfigured !== true ? (
            <>
              <p className="eyebrow">Mirror connected</p>
              <h1>Choose your model</h1>
              <p>Select a model from the catalog exposed by your validated Pi installation. Mirror Desktop does not manage provider credentials.</p>
              {agentSettingsState === "checking" || piModelCatalogState === "idle" || piModelCatalogState === "loading" ? (
                <p>Loading available models…</p>
              ) : piModelCatalogState === "error" ? (
                <>
                  <p className="provider-error" role="alert">{agentSettingsMessage ?? "The Pi model catalog couldn’t be loaded."}</p>
                  <button type="button" onClick={() => { setAgentSettingsMessage(undefined); setPiModelCatalogState("idle"); }}>Try again</button>
                </>
              ) : onboardingModelOptions.length === 0 ? (
                <>
                  <p className="provider-error" role="alert">Pi did not expose any available models.</p>
                  <button type="button" onClick={() => setPiModelCatalogState("idle")}>Try again</button>
                </>
              ) : (
                <div className="runtime-onboarding-form">
                  <label className="provider-field">Pi model
                    <select value={onboardingModelDraft} onChange={(event) => setOnboardingModelDraft(event.target.value)}>
                      <option value="" disabled>Select a provider and model…</option>
                      {onboardingModelOptions.map((model) => (
                        <option key={modelOptionValue(model)} value={modelOptionValue(model)}>{model.provider} / {model.model}</option>
                      ))}
                    </select>
                  </label>
                  {agentSettingsState === "error" && agentSettingsMessage ? <p className="provider-error" role="alert">{agentSettingsMessage}</p> : null}
                  <div className="provider-actions">
                    <button type="button" disabled={!onboardingModelDraft || agentSettingsState === "saving"} onClick={() => void saveOnboardingAgentProfile()}>
                      {agentSettingsState === "saving" ? "Saving…" : "Save model and continue"}
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setRuntimeOnboardingEditing(true)} disabled={agentSettingsState === "saving"}>Edit connection</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">Mirror Desktop</p>
              <h1>Loading your Journeys…</h1>
              <p>Mirror is reading your Journey registry through the validated local connection.</p>
            </>
          )}
        </section>
      </main>
    );
  }

  async function loadCompleteSegmentHistory() {
    if (journeyThreadState.kind !== "ready" || !journeyThreadState.activeGeneration.piSessionFile) return;
    const authority = {
      journeyId: selectedJourney,
      threadId: journeyThreadState.thread.threadId,
      generation: journeyThreadState.activeGeneration.generation,
      sessionId: journeyThreadState.activeGeneration.piSessionId,
      sessionFile: journeyThreadState.activeGeneration.piSessionFile,
    };
    const selectedConversationId = conversation.id;
    const segmentCountBeingLoaded = historicalSegmentCount;
    setHistoricalSegmentState("loading");
    try {
      const inspection = await inspectDedicatedPiTranscript(
        authority.journeyId,
        authority.threadId,
        authority.generation,
        authority.sessionId,
        authority.sessionFile,
      );
      if (selectedJourneyRef.current !== authority.journeyId || conversationRef.current.id !== selectedConversationId) return;
      const complete = projectPiBackedConversationSurface(conversationRef.current, inspection);
      conversationRef.current = complete;
      setConversation(complete);
      setLoadedHistoricalSegmentCount(segmentCountBeingLoaded);
      setHistoricalSegmentCount(0);
      setHistoricalSegmentState("idle");
    } catch {
      setHistoricalSegmentState("error");
    }
  }

  return (
    <main
      className={`app-shell altitude-${presentedAltitude} channel-${runtimeChannel?.channel ?? "checking"} ${sidebarCompact ? "sidebar-compact" : ""} ${conversationFocus.kind === "focused_journey" && conversationCatalogStatus === "loading" ? "conversation-catalog-loading" : ""} ${isJourneyReloading ? "is-busy" : ""}`}
      data-runtime-channel={runtimeChannel?.channel}
      data-application-theme={applicationTheme}
      style={{
        "--focused-sidebar-width": `${focusedSidebarWidth}px`,
        gridTemplateColumns: `${sidebarCompact ? 72 : focusedSidebarWidth}px minmax(560px, 1fr)`,
      } as CSSProperties}
    >
      <aside className="journey-sidebar" aria-label="Journeys">
        <div className="brand-block">
          <span className="brand-mark-wrap" aria-hidden="true">
            <img className="brand-mark" src={appIconUrl} alt="" />
            {developmentChannel ? <span className="brand-channel-badge">DEV</span> : evaluationChannel ? <span className="brand-channel-badge is-evaluation">EVAL</span> : null}
          </span>
          <div className="brand-copy">
            <strong>Mirror Desktop {developmentChannel ? <span className="sr-only">Development channel</span> : evaluationChannel ? <span className="sr-only">Evaluation channel</span> : null}</strong>
            <SelfUpdateNotification
              runtimeBusy={runtimeBusy}
              installedReleaseReading={whatsNewState?.installed}
              installedReminder={whatsNewState?.reminder}
              onAcknowledge={() => void acknowledgeInstalledRelease()}
              onReview={(update) => { setReviewedUpdate(update); setSettingsTab("updates"); setSettingsOpen(true); }}
            />
          </div>
          <button
            className="sidebar-toggle-button"
            type="button"
            onClick={toggleSidebarPresentation}
            aria-label={sidebarToggleLabel(sidebarCompact)}
            aria-expanded={!sidebarCompact}
            title={sidebarToggleLabel(sidebarCompact)}
          >
            <span aria-hidden="true">{sidebarCompact ? "›" : "‹"}</span>
          </button>
        </div>

        <JourneySearchControl
          query={journeySearch}
          resultCount={visibleSidebarJourneys.length}
          onQueryChange={(query) => dispatchJourneySearch({ type: "query_changed", query })}
          onClear={() => dispatchJourneySearch({ type: "clear_requested" })}
        />

        <div className="journey-order-control" aria-label="Journey list view">
          <button
            className={!pinnedOnly && journeyListOrder === "recent" ? "selected" : ""}
            type="button"
            onClick={() => {
              setPinnedOnly(false);
              setJourneyListOrder("recent");
              setJourneyTreeMenuOpen(false);
            }}
            aria-pressed={!pinnedOnly && journeyListOrder === "recent"}
            aria-label="Show Recent Journeys"
            title="Recent"
          >
            <span className="journey-order-icon" aria-hidden="true">◷</span>
            <span className="journey-order-label">Recent</span>
          </button>
          <button
            className={pinnedOnly ? "selected" : ""}
            type="button"
            onClick={() => {
              setPinnedOnly(true);
              setJourneyListOrder("recent");
              setJourneyTreeMenuOpen(false);
            }}
            aria-pressed={pinnedOnly}
            aria-label="Show Pinned Journeys"
            title="Pinned"
          >
            <span className="journey-order-icon" aria-hidden="true">◆</span>
            <span className="journey-order-label">Pinned</span>
          </button>
          <button
            ref={journeyTreeButtonRef}
            className={!pinnedOnly && journeyListOrder === "tree" ? "selected" : ""}
            type="button"
            onClick={showJourneyTree}
            onContextMenu={(event) => openJourneyTreeMenu(event.currentTarget, event)}
            onKeyDown={(event) => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                openJourneyTreeMenu(event.currentTarget, event);
              }
            }}
            aria-pressed={!pinnedOnly && journeyListOrder === "tree"}
            aria-haspopup="menu"
            aria-expanded={journeyTreeMenuOpen}
            aria-label="Show Journey tree"
            title="Tree"
          >
            <span className="journey-order-icon" aria-hidden="true">⌘</span>
            <span className="journey-order-label">Tree</span>
          </button>
          {journeyTreeMenuOpen ? (
            <div className="journey-tree-context-menu" role="menu" ref={journeyTreeMenuRef} aria-label="Journey tree options">
              <button type="button" role="menuitem" disabled={runtimeBusy} onClick={() => openCreateJourney()}>
                <span aria-hidden="true">＋</span>
                Create Journey…
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={runtimeBusy || journeyRegistryRefreshState === "refreshing"}
                onClick={() => void reloadJourneyTree()}
              >
                <span aria-hidden="true">↻</span>
                {journeyRegistryRefreshState === "refreshing" ? "Reloading…" : "Reload Journey tree"}
              </button>
            </div>
          ) : null}
        </div>
        {journeyRegistryRefreshMessage ? (
          <p className={`journey-tree-refresh-status ${journeyRegistryRefreshState}`} role="status">
            {journeyRegistryRefreshMessage}
          </p>
        ) : null}

        <div ref={journeyListRef} className={`journey-list ${journeyListOrder === "tree" ? "tree-mode" : "card-mode"}`}>
          {visibleSidebarJourneys.length === 0 ? (
            <div className="journey-empty-state">
              {pinnedOnly ? (
                <>
                  <strong>{journeySearch.trim() ? `No pinned Journeys found for “${journeySearch.trim()}”` : "No pinned Journeys"}</strong>
                  <small>{journeySearch.trim() ? "Try another search or clear the Pinned filter." : "Pin a Journey to make it available in this filter."}</small>
                </>
              ) : journeySearch.trim() ? (
                <>
                  <strong>No Journeys found for “{journeySearch.trim()}”</strong>
                  <small>Try another search or switch the Journey list order.</small>
                </>
              ) : (
                <>
                  <strong>No Journeys available</strong>
                  <small>Reload the Journey tree after adding a Journey in Mirror.</small>
                </>
              )}
            </div>
          ) : null}
          {visibleSidebarJourneys.map((journey) => {
            const visual = journeyVisual(journey.id);
            const appearance = journeyAppearanceById[journey.id];
            const hasChildren = (journey.children?.length ?? 0) > 0;
            const collapsed = collapsedJourneyIds.has(journey.id);
            const runtimeOwnerPhase = selectJourneyRuntimeOwnerPhase(journeyRuntimeState, journey.id);
            const conversationsExpanded = conversationFocus.kind === "focused_journey"
              && conversationFocus.journeyId === journey.id;
            return (
              <Fragment key={journey.id}>
              <div
                className={`journey-item ${journeyListOrder === "tree" ? "tree-node" : "card-node"} ${journey.depth > 0 ? "is-nested" : "is-root"} accent-${visual.accent} ${journey.id === selectedJourney ? "selected" : ""} ${conversationsExpanded ? "conversations-expanded" : ""} ${runtimeOwnerPhase ? `has-runtime runtime-${runtimeOwnerPhase}` : ""}`}
                style={{ "--journey-depth": journeyListOrder === "tree" ? journey.depth : 0 } as CSSProperties & Record<"--journey-depth", number>}
                role="button"
                tabIndex={0}
                aria-label={`${journey.name}${runtimeOwnerPhase ? `, ${runtimeOwnerPhase === "running" ? "Working" : "Finishing"}` : ""}`}
                aria-haspopup="menu"
                aria-expanded={journeyItemMenu?.journeyId === journey.id}
                draggable={journeyListOrder === "tree" && !runtimeBusy}
                onDragStart={() => setDraggedJourneyId(journey.id)}
                onDragOver={(event) => { if (draggedJourneyId && draggedJourneyId !== journey.id) event.preventDefault(); }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedJourneyId && draggedJourneyId !== journey.id) {
                    const position = journey.children?.length ?? 0;
                    void executeJourneyMutation("move_journey", { journeyId: draggedJourneyId, parentId: journey.id, position });
                  }
                  setDraggedJourneyId(null);
                }}
                onDragEnd={() => setDraggedJourneyId(null)}
                onContextMenu={!runtimeBusy ? (event) => {
                  event.preventDefault(); event.stopPropagation();
                  openJourneyItemMenu(journey.id, event.currentTarget, event.clientX, event.clientY);
                } : undefined}
                onClick={() => {
                  if (conversationsExpanded) {
                    dispatchConversationFocus({ type: "select_root", journeyId: journey.id });
                  }
                  selectJourney(journey.id, "pointer");
                  dispatchJourneySearch({ type: "journey_selected", intent: "pointer" });
                }}
                onKeyDown={(event) => {
                  if (!runtimeBusy && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
                    event.preventDefault(); event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    openJourneyItemMenu(journey.id, event.currentTarget, rect.left + 24, rect.top + 24);
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    const intent = event.key === "Enter" ? "keyboard-enter" : "keyboard-space";
                    if (conversationsExpanded) {
                      dispatchConversationFocus({ type: "select_root", journeyId: journey.id });
                    }
                    selectJourney(journey.id, intent);
                    dispatchJourneySearch({ type: "journey_selected", intent });
                  }
                }}
              >
                {journeyListOrder === "tree" ? (
                  hasChildren ? (
                    <button
                      className="journey-tree-toggle"
                      type="button"
                      aria-label={`${collapsed ? "Expand" : "Collapse"} ${journey.name}`}
                      aria-expanded={!collapsed}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCollapsedJourney(journey.id);
                      }}
                    >
                      {collapsed ? "›" : "▾"}
                    </button>
                  ) : <span className="journey-tree-toggle-placeholder" aria-hidden="true" />
                ) : null}
                {journeyListOrder === "tree" ? (
                  <span className="journey-tree-icon">
                    {appearance ? (
                      <JourneyVisualMark journeyId={journey.id} appearance={appearance} fallbackGlyph={visual.icon} runtimePhase={runtimeOwnerPhase} className="tree-appearance" />
                    ) : (
                      <JourneyTreeIcon runtimePhase={runtimeOwnerPhase} />
                    )}
                  </span>
                ) : (
                  <JourneyVisualMark journeyId={journey.id} appearance={appearance} fallbackGlyph={visual.icon} runtimePhase={runtimeOwnerPhase} className="journey-icon" />
                )}
                <JourneyItemCopy
                  layout={journeyListOrder === "tree" ? "tree" : "card"}
                  journeyName={journey.name}
                  description={sidebarDescription(journey)}
                  lastWorkedLabel={!pinnedOnly && journeyListOrder === "recent" && !sidebarCompact
                    ? relativeLastWorkedLabel(lastWorkedAtByJourneyId[journey.id], relativeTimeNow)
                    : undefined}
                  runtimePhase={runtimeOwnerPhase}
                />
                <button
                  className={`journey-pin ${journey.pinned ? "pinned" : ""}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePinnedJourney(journey.id);
                  }}
                  disabled={runtimeBusy}
                  aria-label={journey.pinned ? `Unpin ${journey.name}` : `Pin ${journey.name}`}
                  aria-pressed={journey.pinned}
                  title={journey.pinned ? "Unpin Journey" : "Pin Journey"}
                >
                  {journey.pinned ? "●" : "○"}
                </button>
                <button
                  className="journey-conversation-toggle"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (conversationsExpanded) {
                      dispatchConversationFocus({ type: "collapse", journeyId: journey.id });
                      setConversationActionMessage(undefined);
                    } else {
                      void expandJourneyConversations(journey.id);
                    }
                  }}
                  aria-label={`${conversationsExpanded ? "Collapse" : "Expand"} conversations for ${journey.name}`}
                  aria-expanded={conversationsExpanded}
                  aria-busy={conversationsExpanded && conversationCatalogStatus === "loading"}
                  title={`${conversationsExpanded ? "Collapse" : "Expand"} conversations`}
                >
                  <span aria-hidden="true">{conversationsExpanded ? "⌃" : "⌄"}</span>
                </button>
              </div>
              {conversationsExpanded ? (
                <FocusedConversationSidebar
                  journeyId={journey.id}
                  journeyName={journey.name}
                  accent={visual.accent}
                  selected={selectedConversationSpace}
                  entries={conversationCatalog}
                  status={conversationCatalogStatus === "idle" ? "loading" : conversationCatalogStatus}
                  error={conversationCatalogError}
                  busy={conversationActionBusy || selectedRuntimeBusy || Boolean(runStartReservation)}
                  actionMessage={conversationActionMessage}
                  onCreateConversation={requestBlankDesktopConversation}
                  onSelectEntry={(entry) => dispatchConversationFocus({
                    type: entry.kind === "desktop_conversation" ? "select_desktop" : "select_mirror",
                    journeyId: journey.id,
                    conversationId: entry.conversationId,
                  })}
                  onContinueMirror={(entry) => void createConversationFromMirrorHistory(entry)}
                  onOpenMirrorTerminal={(entry) => void openSelectedMirrorHistoryInTerminal(entry)}
                  onRenameConversation={requestConversationRename}
                  onDeleteDesktop={requestDesktopConversationDeletion}
                />
              ) : null}
              </Fragment>
            );
          })}
        </div>
        {!sidebarCompact ? (
          <FocusedSidebarResizeHandle
            width={focusedSidebarWidth}
            viewportWidth={window.innerWidth}
            onChange={(width) => setFocusedSidebarWidth(saveFocusedSidebarWidth(
              runtimeChannel?.channel ?? "checking", width, window.innerWidth,
            ))}
          />
        ) : null}
        {journeyItemMenu ? (
          <JourneyItemContextMenu
            journeyId={journeyItemMenu.journeyId}
            x={journeyItemMenu.x}
            y={journeyItemMenu.y}
            runtimeBusy={runtimeBusy}
            deleteDisabled={(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0}
            deleteTitle={(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0 ? "Move or delete child Journeys first." : "Permanently delete this empty Journey."}
            returnFocusTo={journeyItemMenuTriggerRef.current}
            onEdit={openEditJourney}
            onCreate={openCreateJourney}
            onMove={openMoveJourney}
            onDelete={openDeleteJourney}
            onDismiss={() => setJourneyItemMenu(null)}
          />
        ) : null}
        <div className="sidebar-footer">
          <button
            className="sidebar-action-button"
            type="button"
            onClick={() => openCreateJourney(defaultNewJourneyParentId(journeyListOrder, pinnedOnly, selectedJourney))}
            disabled={runtimeBusy}
            aria-label="Create new Journey"
            title="New Journey"
          >
            <span aria-hidden="true">＋</span>
          </button>
          <button
            className="sidebar-action-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </aside>

      <section className="chat-shell" aria-label={`${selectedJourneyItem.name} agent chat`}>
        <header className={`chat-header accent-${selectedJourneyVisual.accent}`}>
          <div className="realization-header-copy">
            <div className="journey-title-row">
              <div className="active-journey-title">
                <JourneyVisualMark journeyId={selectedJourneyItem.id} appearance={selectedJourneyAppearance} fallbackGlyph={selectedJourneyVisual.icon} className="active-journey-icon" />
                <div className="active-journey-heading">
                  <p className="eyebrow">Active journey</p>
                  <h1>{selectedJourneyItem.name}</h1>
                  {operationalChatSelected && messages.length > 0 && selectedConversationEntry?.kind === "desktop_conversation" ? (
                    <div className="active-conversation-context" aria-label={`Active Desktop Conversation: ${selectedConversationEntry.title}`}>
                      <span>Desktop Conversation</span>
                      <strong title={selectedConversationEntry.title}>{selectedConversationEntry.title}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className={`menu-button conversation-search-shortcut ${conversationSearchOpen ? "selected" : ""}`}
                  type="button"
                  onClick={() => {
                    showConversation();
                    setConversationSearchOpen((open) => !open);
                  }}
                  disabled={altitudeSwitchDisabled || messages.length === 0 || selectedConversationSpace.kind === "mirror_history" || journeyThreadState.kind !== "ready"}
                  aria-label="Search active conversation"
                  aria-pressed={conversationSearchOpen}
                  title="Search conversation"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="5.25" />
                    <path d="m14.5 14.5 4.5 4.5" />
                  </svg>
                </button>
                <button
                  className={`menu-button conversation-turn-shortcut ${conversationTurnNavigatorOpen ? "selected" : ""}`}
                  type="button"
                  onClick={() => {
                    showConversation();
                    setConversationTurnNavigatorOpen((open) => !open);
                  }}
                  disabled={altitudeSwitchDisabled || messages.length === 0 || selectedConversationSpace.kind === "mirror_history" || journeyThreadState.kind !== "ready"}
                  aria-label="Navigate active conversation turns"
                  aria-pressed={conversationTurnNavigatorOpen}
                  title="Navigate turns"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 6h10" />
                    <path d="M7 12h10" />
                    <path d="M7 18h10" />
                    <circle cx="4" cy="6" r="1" />
                    <circle cx="4" cy="12" r="1" />
                    <circle cx="4" cy="18" r="1" />
                  </svg>
                </button>
                <div className="journey-menu-wrap" ref={journeyMenuRef}>
                  <button
                    className="menu-button"
                    type="button"
                    onClick={() => setJourneyMenuOpen((open) => !open)}
                    disabled={journeyThreadState.kind !== "ready" || selectedConversationSpace.kind === "mirror_history"}
                    aria-label="Journey conversation menu"
                    aria-expanded={journeyMenuOpen}
                    title="Journey menu"
                  >
                    ⋯
                  </button>
                  {journeyMenuOpen ? (
                    <div className="journey-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={requestConversationRestart}
                        disabled={runtimeBusy || isJourneyReloading || turnRecoveryBusy || Boolean(blockingTurnJournalRecord) || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)}
                        title={blockingTurnJournalRecord ? "Wait until the previous message is ready." : undefined}
                      >
                        Reset agent context…
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="journey-altitude-row">
              <JourneyAltitudeSwitcher
                value={presentedAltitude}
                onChange={setSelectedAltitude}
                disabled={altitudeSwitchDisabled}
              />
              {presentedAltitude === "operational" ? (
                <OperationalWorkspaceSwitcher
                  value={presentedOperationalSurface}
                  onChange={setSelectedOperationalSurface}
                  disabled={altitudeSwitchDisabled}
                />
              ) : null}
            </div>
          </div>
        </header>

        {presentedAltitude === "operational" && presentedOperationalSurface === "artifacts" ? (
          <JourneyDocumentationBrowser
            journeyId={selectedJourneyItem.id}
            journeyName={selectedJourneyItem.name}
            requestedRelativePath={artifactNavigationRequest?.journeyId === selectedJourneyItem.id
              ? artifactNavigationRequest.relativePath
              : undefined}
            requestId={artifactNavigationRequest?.journeyId === selectedJourneyItem.id
              ? artifactNavigationRequest.requestId
              : undefined}
            expandPreviewOnReveal={artifactNavigationRequest?.journeyId === selectedJourneyItem.id
              ? artifactNavigationRequest.expandPreview
              : false}
            onNavigationRequestSettled={(requestId) => setArtifactNavigationRequest((current) =>
              current?.journeyId === selectedJourneyItem.id && current.requestId === requestId
                ? undefined
                : current)}
          />
        ) : null}
        {presentedAltitude === "operational" && presentedOperationalSurface === "ariad" ? (
          <AriadOperationalObservatory
            journeyId={selectedJourneyItem.id}
            journeyName={selectedJourneyItem.name}
            projection={journeyProjections?.operational}
            loading={projectionLoadStatus === "loading"}
            errors={journeyProjections?.errors}
          />
        ) : null}
        {presentedAltitude === "tactical" ? (
          projectionLoadStatus === "loading" ? (
            <JourneyProjectionLoadingState altitude="tactical" />
          ) : journeyProjections?.tactical ? (
            <TacticalJourneyWorkspace projection={journeyProjections.tactical} stale={journeyProjections.tacticalStale} />
          ) : (
            <>
              {projectionLoadStatus === "error" ? <JourneyProjectionNotice altitude="tactical" kind="error" /> : null}
              <JourneyAltitudeEmptyState altitude="tactical" journeyName={selectedJourneyItem.name} />
            </>
          )
        ) : null}
        {presentedAltitude === "strategic" ? (
          projectionLoadStatus === "loading" ? (
            <JourneyProjectionLoadingState altitude="strategic" />
          ) : journeyProjections?.strategic ? (
            <StrategicJourneyWorkspace projection={journeyProjections.strategic} stale={journeyProjections.strategicStale} />
          ) : (
            <>
              {projectionLoadStatus === "error" ? <JourneyProjectionNotice altitude="strategic" kind="error" /> : null}
              <JourneyAltitudeEmptyState altitude="strategic" journeyName={selectedJourneyItem.name} />
            </>
          )
        ) : null}

        {operationalChatSelected && selectedConversationEntry?.kind === "mirror_history" ? (
          <MirrorHistoryActionSurface
            entry={selectedConversationEntry}
            busy={conversationActionBusy}
            message={conversationActionMessage}
            onCreateHandoff={() => void createConversationFromMirrorHistory(selectedConversationEntry)}
            onOpenTerminal={() => void openSelectedMirrorHistoryInTerminal(selectedConversationEntry)}
          />
        ) : null}
        {operationalChatSelected && selectedConversationSpace.kind !== "mirror_history" && journeyThreadState.kind !== "ready" ? (
          <JourneyThreadState
            journeyName={selectedJourneyItem.name}
            state={journeyThreadState}
            starting={startingJourneyId === selectedJourney}
            startingPhase={journeyStartPhase}
            error={journeyStartError}
            onStart={journeyThreadState.kind === "absent" && !runtimeBusy && runtimeBindingReady ? () => void startSelectedJourney() : undefined}
          />
        ) : null}

        <section
          id="operational-chat-panel"
          className="chat-stream"
          role="tabpanel"
          aria-label="Conversation"
          hidden={!operationalChatSelected || selectedConversationSpace.kind === "mirror_history" || journeyThreadState.kind !== "ready"}
          ref={chatStreamRef}
          onScroll={(event) => {
            const container = event.currentTarget;
            chatAutoFollowRef.current = nextConversationAutoFollow(
              chatAutoFollowRef.current,
              {
                type: "scroll",
                metrics: {
                  scrollTop: container.scrollTop,
                  clientHeight: container.clientHeight,
                  scrollHeight: container.scrollHeight,
                },
              },
            );
          }}
        >
          {journeyReloadStatus ? <p className="journey-reload-status">{journeyReloadStatus}</p> : null}
          {messages.length > 0 && selectedConversationEntry?.kind === "desktop_conversation" ? (
            <ConversationDetailHeader
              entry={selectedConversationEntry}
              messageCount={messages.length}
              historicalSegmentCount={historicalSegmentCount}
              loadedHistoricalSegmentCount={loadedHistoricalSegmentCount}
            />
          ) : null}
          {messages.length === 0 && journeyThreadState.kind === "ready" && selectedConversationEntry?.kind === "desktop_conversation" ? (
            <EmptyDesktopConversation
              entry={selectedConversationEntry}
              journeyName={selectedJourneyItem.name}
              historicalSegments={{
                count: historicalSegmentCount,
                state: historicalSegmentState,
                disabled: runtimeBusy,
                onLoad: () => void loadCompleteSegmentHistory(),
              }}
              onChoose={(text) => setJourneyComposerDraft(selectedJourney, text)}
            />
          ) : null}
          {messages.length === 0 && journeyThreadState.kind === "ready" && selectedConversationSpace.kind === "journey_workspace" ? (
            <JourneyArrivalSurface
              journeyName={selectedJourneyItem.name}
              stage={selectedJourneyItem.stage}
              onChoose={(text) => setJourneyComposerDraft(selectedJourney, text)}
            />
          ) : null}
          {messages.length > 0 && (historicalSegmentCount > 0 || historicalSegmentState === "error") ? (
            <div className="historical-segment-control conversation-history-action" role={historicalSegmentState === "error" ? "alert" : "status"}>
              <strong>Earlier history</strong>
              <span>{historicalSegmentState === "error"
                ? "Earlier history could not be verified. The current Segment remains available."
                : `${historicalSegmentCount} earlier ${historicalSegmentCount === 1 ? "Segment" : "Segments"} available.`}</span>
              <button type="button" className="secondary-button" onClick={() => void loadCompleteSegmentHistory()}
                disabled={historicalSegmentState === "loading" || runtimeBusy}>
                {historicalSegmentState === "loading"
                  ? "Loading earlier Segments…"
                  : `Load ${historicalSegmentCount} earlier ${historicalSegmentCount === 1 ? "Segment" : "Segments"}`}
              </button>
            </div>
          ) : null}
          <ConversationTranscript
            messages={messages}
            conversation={presentedConversation}
            importedActivity={importedActivity}
            assistantTurnProximity={assistantTurnProximity}
            runtimeProjection={runtimeProjection}
            runtimeProjectionMessageId={runtimeProjectionMessageId}
            basePath={selectedJourneyBasePath}
            userAvatar={userAvatar}
            onLocalPathClick={handleChatLocalPath}
            searchOpen={conversationSearchOpen}
            turnNavigatorOpen={conversationTurnNavigatorOpen}
            onSearchOpenChange={setConversationSearchOpen}
            onTurnNavigatorOpenChange={setConversationTurnNavigatorOpen}
          />

          <div ref={chatEndRef} className="chat-scroll-anchor" aria-hidden="true" />
        </section>

        <section
          className="composer"
          aria-label="Message composer"
          hidden={!operationalChatSelected || selectedConversationSpace.kind === "mirror_history" || journeyThreadState.kind !== "ready"}
        >
          <ComposerRuntimeStatus status={composerTurnStatus} />
          {!runtimeBindingReady ? <p className="provider-error" role="status">Connect and validate a Mirror installation in Runtime Settings before starting Mirror or Pi actions.</p> : null}
          {localReferenceError ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>File could not be opened</strong>
              <p>{localReferenceError}</p>
            </section>
          ) : null}
          {unsentDraftNotice ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Message was not sent</strong>
              <p>{unsentDraftNotice}</p>
            </section>
          ) : null}
          {showTransientStreamWarning && !unsentDraftNotice ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Message was not sent</strong>
              <p>{lastItem(streamWarnings)}</p>
            </section>
          ) : null}
          {agentSettingsState !== "ready" && agentSettingsState !== "saving" ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Agent settings require attention</strong>
              <p>{agentSettingsMessage ?? "Agent settings are still being inspected."} Open Settings to restore a valid non-secret profile.</p>
            </section>
          ) : null}
          {turnRecoveryNotice && !blockingTurnJournalRecord && !isStreaming ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Conversation ready</strong>
              <p>{turnRecoveryNotice}</p>
            </section>
          ) : null}
          {showBlockingTurnRecoveryNotice && recoveryRoutes.length === 0 ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>{blockingTurnAwaitingNativeLease
                ? "The agent is still finishing the previous message"
                : "Recovery is not available yet"}</strong>
              <p>The preserved attempt remains unchanged until exact native inactivity is established.</p>
            </section>
          ) : turnRecoveryError && !isStreaming && recoveryRoutes.length === 0 ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>We couldn’t prepare this conversation</strong>
              <p>{turnRecoveryError}</p>
            </section>
          ) : null}
          {showNativeOccupancyNotice ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Checking native operation occupancy</strong>
              <p>{piInvocationOccupancy.diagnostic ?? "Operational actions remain blocked until bounded native inspection completes."}</p>
            </section>
          ) : null}
          {piInvocationPresentation.reason === "global_capacity_reached" && !selectedRuntimeBusy ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Global Pi capacity occupied</strong>
              <p>You can keep drafting, but Send remains unavailable until a Journey slot is free. Native admission remains the atomic capacity authority.</p>
            </section>
          ) : null}
          {showInactiveNativeAttemptNotice ? <InterruptedNativeAttemptNotice providerFailure={interruptedProviderFailure} /> : null}
          {durableInterruptedTurn && !isStreaming && !showInactiveNativeAttemptNotice ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Previous turn was interrupted</strong>
              <p>The durable journal retained the interruption without inventing a response. Your next message can start a new turn.</p>
              {interruptedProviderFailure ? <p className="provider-terminal-failure">The provider reported: {interruptedProviderFailure}</p> : null}
            </section>
          ) : null}
          {showRetainedLeaseNotice ? (
            <section className="dedicated-turn-notice" role={mirrorCommitError ? "alert" : "status"}>
              <strong>{isRetryingMirrorCommit
                ? "Repairing conversation synchronization…"
                : mirrorCommitError
                  ? "Conversation synchronization needs attention"
                  : "Finalizing turn…"}</strong>
              <p>The native Pi execution is inactive. Mirror Desktop is completing this exact run from preserved Pi evidence; new messages remain available.</p>
              {mirrorCommitError ? (
                <>
                  <div className="recovery-actions">
                    <button type="button" onClick={() => void recoverPostTerminalPersistence(selectedJourney)} disabled={isRetryingMirrorCommit || piInvocationOccupancy.status !== "known"}>
                      Repair synchronization
                    </button>
                  </div>
                  <details open>
                    <summary>Details</summary>
                    <code>{mirrorCommitError}</code>
                  </details>
                  <small>No recovery action will run the agent again.</small>
                </>
              ) : null}
            </section>
          ) : null}
          {mirrorCommitError && !showRetainedLeaseNotice && !showConversationRecoveryNotice && !showConversationSyncNotice ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Conversation synchronization needs attention</strong>
              <p>The agent is inactive, but Mirror Desktop could not complete the preserved persistence path.</p>
              <div className="recovery-actions">
                <button type="button" onClick={() => void recoverPostTerminalPersistence(selectedJourney)} disabled={isRetryingMirrorCommit || piInvocationOccupancy.status !== "known"}>
                  {isRetryingMirrorCommit ? "Repairing conversation synchronization…" : "Repair synchronization"}
                </button>
              </div>
              <details open>
                <summary>Details</summary>
                <code>{mirrorCommitError}</code>
              </details>
              <small>No recovery action will run the agent again.</small>
            </section>
          ) : null}
          {showConversationRecoveryNotice ? (
            <ConversationRecoveryNotice
              title={blockingTurnJournalRecord
                ? "Resolve the preserved attempt"
                : legacyMirrorGap ? "Choose how to continue" : "Repair Mirror synchronization"}
              message={blockingTurnJournalRecord
                ? "Choose one explicit operation. No recovery action will run the agent again."
                : legacyMirrorGap
                  ? "The exact legacy Mirror payload is unavailable, so synchronization cannot be reconstructed."
                  : "The local response is complete. This operation repairs only its secondary Mirror copy."}
              routes={recoveryRoutes}
              activeRoute={activeRecoveryRoute}
              error={turnRecoveryError ?? mirrorCommitError}
              onSelect={(route) => { void performRecoveryRoute(route); }}
            />
          ) : null}
          {fileAttachmentError ? <p className="context-attachment-error" role="alert">{fileAttachmentError}</p> : null}
          {voiceError ? <p className="context-attachment-error voice-error" role="alert">{voiceError}</p> : null}
          {voiceNotice ? <p className="voice-notice" role="status">{voiceNotice}</p> : null}
          <VoiceSessionStatus session={voiceSession} elapsedSeconds={voiceElapsedSeconds} onCancel={cancelVoiceRecording} />
          <PendingFileAttachments
            attachments={pendingFileAttachments}
            disabled={selectedRuntimeBusy || fileAttachmentBusy}
            onRemove={(attachmentId) => {
              setPendingFileAttachments((current) => removeFileAttachment(current, attachmentId));
              setFileAttachmentError(undefined);
            }}
            onClear={() => {
              setPendingFileAttachments([]);
              setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
              setFileAttachmentError(undefined);
            }}
          />
          <div className={`composer-input-wrap${fileDropActive ? " is-file-drop-active" : ""}`}>
            {fileDropActive ? <div className="file-drop-overlay" role="status">Drop files to attach</div> : null}
            <textarea
              aria-label="Natural-language intention"
              value={draft}
              maxLength={COMPOSER_DRAFT_MAX_CHARS}
              onChange={(event) => setJourneyComposerDraft(selectedJourney, event.target.value)}
              onBlur={flushComposerDrafts}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (selectedCanSteer && draft.trim()) {
                    void submitActiveSteering();
                  } else if (shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)) {
                    void generatePacket("live");
                  }
                }
              }}
              placeholder={selectedCanSteer
                ? "Send a correction to the active turn"
                : composerPlaceholder({
                    isAgentResponding: isStreaming || agentRun.status === "running",
                  })}
              disabled={isJourneyReloading}
            />
            <div className="composer-input-footer">
              <ComposerRuntimeFooter
                contextUsage={authoritativeContextUsage}
                activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}
                contextState={piContextState}
                providerModel={providerModelLabel(effectiveProviderConfig)}
                onSelectProviderModel={() => openJourneyAgentProfileSelector()}
                providerSelectionDisabled={runtimeBusy || agentSettingsState === "saving"}
              />
              <div className="composer-inline-actions">
                <button
                  className="icon-button context-attachment-button"
                  type="button"
                  onClick={() => void chooseFiles()}
                  disabled={selectedRuntimeBusy || isJourneyReloading || fileAttachmentBusy}
                  aria-label="Anexar arquivos"
                  title="Anexar arquivos"
                >
                  📎
                </button>
                <VoiceComposerControl
                  status={voiceStatus}
                  session={voiceSession}
                  installing={voiceInstalling}
                  composerBusy={isJourneyReloading || fileAttachmentBusy}
                  onIntent={handleVoiceIntent}
                />
                {navigationPresentation.cancelVisible ? (
                  <>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => void cancelActiveRun()}
                      aria-label="Cancel run"
                      title="Cancel run"
                    >
                      ✕
                    </button>
                    {selectedCanSteer ? (
                      <button
                        className="icon-button send-button"
                        type="button"
                        onClick={() => void submitActiveSteering()}
                        disabled={!draft.trim() || providerErrors.length > 0 || agentSettingsState !== "ready"}
                        aria-label="Steer active turn"
                        title="Steer active turn"
                      >
                        ↗
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    className="icon-button send-button"
                    type="button"
                    onClick={() => void generatePacket("live")}
                    disabled={!draft.trim() || selectedInvocationAdmissionBlocked || providerErrors.length > 0 || agentSettingsState !== "ready" || Boolean(fileAttachmentError) || fileAttachmentBusy}
                    aria-label="Send message"
                    title="Send message"
                  >
                    ↑
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </section>


      {voiceInstallDialogOpen && voiceStatus ? (
        <VoiceInstallDialog
          status={voiceStatus}
          installing={voiceInstalling}
          progress={voiceInstallProgress}
          error={voiceError}
          catalog={voiceCatalog}
          catalogLoading={voiceCatalogLoading}
          modelId={voiceModelId}
          onModelChange={setVoiceModelId}
          onConfirm={() => void installVoice()}
          onClose={() => setVoiceInstallDialogOpen(false)}
        />
      ) : null}

      {closeConfirmationOpen ? (
        <div className="settings-backdrop" role="presentation" onClick={() => !closeConfirmationBusy && setCloseConfirmationOpen(false)}>
          <section
            className="settings-window close-confirmation-dialog danger-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm closing Mirror Desktop"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">Active agent work</p>
                <h2>Close while agents are working?</h2>
                <p className="settings-intro">
                  Mirror Desktop still has {activeCloseWorkCount} active {activeCloseWorkCount === 1 ? "agent operation" : "agent operations"}. Closing now can interrupt visible work before it settles.
                </p>
              </div>
              <button type="button" onClick={() => setCloseConfirmationOpen(false)} disabled={closeConfirmationBusy}>×</button>
            </header>
            <div className="restart-assurances">
              <p>Cancel keeps the app open and leaves active work untouched.</p>
              <p>Close anyway flushes Composer drafts first, then closes the app.</p>
            </div>
            {closeConfirmationError ? <p className="settings-error" role="alert">{closeConfirmationError}</p> : null}
            <div className="provider-actions">
              <button type="button" className="danger-button" onClick={() => void closeAfterDraftFlush()} disabled={closeConfirmationBusy}>
                {closeConfirmationBusy ? "Closing…" : "Close anyway"}
              </button>
              <button className="secondary-button" type="button" onClick={() => setCloseConfirmationOpen(false)} disabled={closeConfirmationBusy}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {restartConfirmationOpen && journeyThreadState.kind === "ready" ? (
        <div className="settings-backdrop" role="presentation" onClick={() => !isJourneyReloading && setRestartConfirmationOpen(false)}>
          <section
            className="settings-window restart-conversation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm agent context reset"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">Fresh context boundary</p>
                <h2>Reset agent context?</h2>
                <p className="settings-intro">
                  Mirror Desktop will keep this conversation and create Generation {journeyThreadState.activeGeneration.generation + 1} with a fresh Pi working context and Mirror conversation.
                  Generation {journeyThreadState.activeGeneration.generation} and its transcript will remain preserved and read-only, but its messages will not be copied verbatim into the new Pi context.
                </p>
              </div>
            </header>
            <div className="restart-assurances">
              <p>No model will be called and no synthetic greeting will be created.</p>
              <p>The current generation remains active unless the replacement is fully verified.</p>
            </div>
            <div className="generation-history" aria-label="Generation history">
              {projectGenerationHistory(journeyThreadState.thread).map((item) => (
                <div className="generation-history-row" key={item.generation}>
                  <span><strong>Generation {item.generation}</strong><small>{item.piSessionName ?? "Dedicated Mirror Desktop conversation"}</small></span>
                  <span className={`generation-status ${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>
            {journeyReloadStatus ? <p className="journey-reload-status" aria-live="polite">{journeyReloadStatus}</p> : null}
            <div className="provider-actions">
              <button type="button" onClick={() => void confirmConversationRestart()} disabled={isJourneyReloading}>
                {isJourneyReloading ? "Resetting context…" : "Reset agent context"}
              </button>
              <button className="secondary-button" type="button" onClick={() => setRestartConfirmationOpen(false)} disabled={isJourneyReloading}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {conversationCreateOpen ? (
        <div className="settings-backdrop" role="presentation">
          <form
            className="settings-window journey-admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Create Desktop Conversation"
            onSubmit={(event) => { event.preventDefault(); void createBlankDesktopConversation(); }}
          >
            <div className="settings-header">
              <div><p className="eyebrow">Desktop Conversation</p><h2>New Conversation</h2></div>
              <button type="button" onClick={() => setConversationCreateOpen(false)} disabled={conversationActionBusy}>×</button>
            </div>
            <label>
              Conversation title
              <input
                autoFocus
                value={conversationCreateDraft}
                onChange={(event) => { setConversationCreateDraft(event.target.value); setConversationCreateError(undefined); }}
                required
                maxLength={160}
              />
            </label>
            <p className="journey-admin-summary">Edit the suggested unique title or accept it as shown. Creation invokes no model and sends no message.</p>
            {conversationCreateError ? <p className="settings-error" role="alert">{conversationCreateError}</p> : null}
            <div className="settings-actions">
              <button type="button" onClick={() => setConversationCreateOpen(false)} disabled={conversationActionBusy}>Cancel</button>
              <button type="submit" disabled={conversationActionBusy || !conversationCreateDraft.trim()}>
                {conversationActionBusy ? "Creating…" : "Create Conversation"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mirrorRenameTarget ? (
        <div className="settings-backdrop" role="presentation">
          <form
            className="settings-window journey-admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={mirrorRenameTarget.entry.kind === "mirror_history" ? "Rename Mirror Conversation" : "Rename Desktop Conversation"}
            onSubmit={(event) => { event.preventDefault(); void confirmMirrorConversationRename(); }}
          >
            <div className="settings-header">
              <div>
                <p className="eyebrow">{mirrorRenameTarget.entry.kind === "mirror_history" ? "Mirror Core Conversation" : "Desktop Conversation"}</p>
                <h2>{mirrorRenameTarget.entry.kind === "mirror_history" ? "Rename in Mirror" : "Rename Conversation"}</h2>
              </div>
              <button type="button" onClick={() => setMirrorRenameTarget(undefined)} disabled={conversationActionBusy}>×</button>
            </div>
            <label>
              Conversation title
              <input
                autoFocus
                value={mirrorRenameDraft}
                onChange={(event) => setMirrorRenameDraft(event.target.value)}
                required
                maxLength={160}
              />
            </label>
            <p className="journey-admin-summary">{mirrorRenameTarget.entry.kind === "mirror_history"
              ? "This updates the canonical title in Mirror Core. The conversation identity and content remain unchanged."
              : "This updates the Desktop catalog title. Generation and Mirror Core technical names remain unchanged."}</p>
            {mirrorRenameTarget.entry.kind === "desktop_conversation" ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => void suggestSelectedConversationTitle()}
                disabled={conversationActionBusy || conversation.id !== mirrorRenameTarget.entry.threadId || messages.length === 0}
              >
                {conversationActionBusy ? "Suggesting…" : "Suggest from recent turns"}
              </button>
            ) : null}
            {mirrorRenameError ? <p className="settings-error" role="alert">{mirrorRenameError}</p> : null}
            <div className="settings-actions">
              <button type="button" onClick={() => setMirrorRenameTarget(undefined)} disabled={conversationActionBusy}>Cancel</button>
              <button type="submit" disabled={conversationActionBusy || !mirrorRenameDraft.trim() || normalizeConversationTitle(mirrorRenameDraft) === normalizeConversationTitle(mirrorRenameTarget.entry.title)}>
                {conversationActionBusy ? "Renaming…" : mirrorRenameTarget.entry.kind === "mirror_history" ? "Rename in Mirror" : "Rename Conversation"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {conversationDeleteTarget ? (
        <div className="settings-backdrop" role="presentation">
          <form
            className="settings-window journey-admin-dialog danger-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete Desktop Conversation"
            onSubmit={(event) => { event.preventDefault(); void confirmDesktopConversationDeletion(); }}
          >
            <div className="settings-header">
              <div><p className="eyebrow">Conversation safety</p><h2>Delete Conversation</h2></div>
              <button type="button" onClick={() => setConversationDeleteTarget(undefined)} disabled={conversationActionBusy}>×</button>
            </div>
            <div className="journey-admin-summary">
              Permanently delete “{conversationDeleteTarget.title}”? Its local history, drafts, sessions, Segments and generated Mirror Core records will be removed. This cannot be undone.
            </div>
            {conversationDeleteError ? <p className="settings-error" role="alert">{conversationDeleteError}</p> : null}
            <div className="settings-actions">
              <button type="button" onClick={() => setConversationDeleteTarget(undefined)} disabled={conversationActionBusy}>Cancel</button>
              <button className="danger-button" type="submit" disabled={conversationActionBusy || selectedRuntimeBusy || Boolean(runStartReservation)}>
                {conversationActionBusy ? "Deleting…" : "Delete Conversation"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {journeyAdminDialog ? (
        <div className="settings-backdrop" role="presentation">
          <form className={`settings-window journey-admin-dialog ${journeyAdminDialog.mode === "delete" ? "danger-dialog" : ""}`} role={journeyAdminDialog.mode === "delete" ? "alertdialog" : "dialog"} aria-modal="true" aria-label="Journey administration" onSubmit={submitJourneyAdministration}>
            <div className="settings-header">
              <div>
                <p className="eyebrow">{journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "edit" ? "Journey details" : journeyAdminDialog.mode === "move" ? "Journey organization" : "Journey safety"}</p>
                <h2>{journeyAdminDialog.mode === "create" ? "Create Journey" : journeyAdminDialog.mode === "edit" ? "Edit Journey" : journeyAdminDialog.mode === "move" ? "Move Journey" : "Delete Journey"}</h2>
              </div>
              <button type="button" onClick={() => setJourneyAdminDialog(null)} disabled={journeyAdminState === "saving" || journeyAppearanceBusy}>×</button>
            </div>
            {journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "edit" ? (
              <>
                <label>Name<input value={journeyAdminName} onChange={(event) => {
                  const next = event.target.value;
                  if (journeyAdminDialog.mode === "create" && (!journeyAdminSlug || journeyAdminSlug === suggestJourneySlug(journeyAdminName))) setJourneyAdminSlug(suggestJourneySlug(next));
                  setJourneyAdminName(next);
                }} required maxLength={160} /></label>
                {journeyAdminDialog.mode === "create" ? (
                  <label>Slug<input value={journeyAdminSlug} onChange={(event) => setJourneyAdminSlug(event.target.value)} required pattern="[a-z0-9][a-z0-9-]{1,78}[a-z0-9]" /></label>
                ) : (
                  <label>Slug<input value={journeyAdminSlug} readOnly aria-describedby="journey-immutable-identity" /></label>
                )}
                <label>Description<textarea value={journeyAdminDescription} onChange={(event) => setJourneyAdminDescription(event.target.value)} required minLength={20} maxLength={4000} /></label>
                {journeyAdminDialog.mode === "edit" ? <small id="journey-immutable-identity" className="journey-admin-immutable-note">Journey ID and slug remain unchanged.</small> : null}
              </>
            ) : null}
            {journeyAdminDialog.mode === "edit" && journeyAdminDialog.journeyId ? (
              <fieldset className="journey-appearance-fieldset">
                <legend>Journey appearance</legend>
                <p>Applied immediately on this device. Canonical Mirror metadata remains unchanged.</p>
                <div className="journey-system-icon-grid" role="radiogroup" aria-label="Journey system icon">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!journeyAppearanceById[journeyAdminDialog.journeyId]}
                    className={!journeyAppearanceById[journeyAdminDialog.journeyId] ? "selected" : ""}
                    disabled={journeyAppearanceBusy || runtimeBusy}
                    onClick={() => void applyJourneySystemAppearance(journeyAdminDialog.journeyId!)}
                  >
                    <span aria-hidden="true">•</span><small>Default</small>
                  </button>
                  {journeySystemIcons.map((icon) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isJourneySystemIconSelected(journeyAppearanceById, journeyAdminDialog.journeyId!, icon.id)}
                      className={isJourneySystemIconSelected(journeyAppearanceById, journeyAdminDialog.journeyId!, icon.id) ? "selected" : ""}
                      disabled={journeyAppearanceBusy || runtimeBusy}
                      onClick={() => void applyJourneySystemAppearance(journeyAdminDialog.journeyId!, icon.id)}
                      key={icon.id}
                      aria-label={icon.label}
                      title={icon.label}
                    >
                      <span aria-hidden="true">{icon.glyph}</span><small>{icon.label}</small>
                    </button>
                  ))}
                </div>
                <div className="journey-custom-image-control">
                  <JourneyVisualMark
                    journeyId={journeyAdminDialog.journeyId}
                    appearance={journeyAppearanceById[journeyAdminDialog.journeyId]}
                    fallbackGlyph={journeyVisual(journeyAdminDialog.journeyId).icon}
                    className="journey-appearance-preview"
                  />
                  <button type="button" disabled={journeyAppearanceBusy || runtimeBusy} onClick={() => void chooseJourneyCustomAppearance(journeyAdminDialog.journeyId!)}>
                    {journeyAppearanceBusy ? "Importing…" : "Choose custom image…"}
                  </button>
                  <small>PNG, JPEG or WebP · up to 5 MiB · saved as a private 512px PNG.</small>
                </div>
                {journeyAppearanceMessage ? <p className="journey-appearance-message" role="status">{journeyAppearanceMessage}</p> : null}
              </fieldset>
            ) : null}
            {journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "move" ? (
              <div className="settings-grid two-column">
                <label>Parent<select value={journeyAdminParent} onChange={(event) => {
                  const parentId = event.target.value;
                  setJourneyAdminParent(parentId);
                  setJourneyAdminPosition(appendJourneyPosition(journeyRegistry, parentId));
                }}>
                  <option value="">Root</option>
                  {flattenJourneyRegistry(journeyRegistry).filter((journey) => journey.id !== journeyAdminDialog.journeyId).map((journey) => (
                    <option key={journey.id} value={journey.id}>{"—".repeat(journey.depth)} {journey.name}</option>
                  ))}
                </select></label>
                {journeyAdminDialog.mode === "move" ? (
                  <label>Sibling position<input type="number" min={0} value={journeyAdminPosition} onChange={(event) => setJourneyAdminPosition(Number(event.target.value))} required /></label>
                ) : null}
              </div>
            ) : null}
            {journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "edit" ? (
              <label>Project path {journeyAdminDialog.mode === "create" ? "(optional)" : "(clear to remove)"}
                <span className="journey-path-picker"><input value={journeyAdminPath} onChange={(event) => setJourneyAdminPath(event.target.value)} placeholder="/absolute/path/to/project" /><button type="button" onClick={async () => { const path = await chooseProjectDirectory(); if (path) setJourneyAdminPath(path); }}>Choose…</button></span>
              </label>
            ) : null}
            <div className="journey-admin-summary">
              {journeyAdminDialog.mode === "create" ? `Create ${journeyAdminSlug || "this Journey"} under ${journeyAdminParent || "Root"}. It will be appended after the existing Journeys. No repository or conversation will be created.` :
                journeyAdminDialog.mode === "edit" ? `Update canonical name, description and project path for ${journeyAdminDialog.journeyId}. Journey identity, hierarchy and conversations remain unchanged.` :
                  journeyAdminDialog.mode === "move" ? `Move ${journeyAdminDialog.journeyId} under ${journeyAdminParent || "Root"} at position ${journeyAdminPosition}.` :
                    `Permanently delete ${findJourneyById(journeyRegistry, journeyAdminDialog.journeyId ?? "")?.name ?? journeyAdminDialog.journeyId}. Project files, repositories and protected history will not be deleted.${journeyAdminDialog.journeyId === selectedJourney ? ` The active Journey will change to ${findJourneyById(journeyRegistry, replacementJourneyAfterDeletion(journeyRegistry, journeyAdminDialog.journeyId ?? "") ?? "")?.name ?? "another Journey"}.` : ""}`}
            </div>
            {journeyAdminMessage ? <p className="settings-error" role="alert">{journeyAdminMessage}</p> : null}
            <div className="settings-actions">
              <button type="button" onClick={() => setJourneyAdminDialog(null)} disabled={journeyAdminState === "saving" || journeyAppearanceBusy}>Cancel</button>
              <button className={journeyAdminDialog.mode === "delete" ? "danger-button" : ""} type="submit" disabled={journeyAdminState === "saving" || journeyAppearanceBusy}>{journeyAdminState === "saving" ? "Verifying…" : journeyAdminDialog.mode === "delete" ? "Delete Journey" : journeyAdminDialog.mode === "edit" ? "Save changes" : "Confirm"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="settings-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}>
          <section
            className="settings-window"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">Settings</p>
                <h2>Application settings</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </header>

            <SettingsTabList selected={settingsTab} onSelect={setSettingsTab} />

            {settingsTab === "appearance" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-appearance"
                role="tabpanel"
                aria-labelledby="settings-tab-appearance"
              >
                <section className="settings-section appearance-card" aria-label="Application appearance">
              <h3>Appearance</h3>
              <div className="theme-family-list" role="radiogroup" aria-label="Application color theme">
                {applicationThemeGroups.map((group) => (
                  <section className="theme-family" role="group" aria-label={`${group.label} themes`} key={group.family}>
                    <h4>{group.label}</h4>
                    <div className="theme-choice-grid">
                      {group.themes.map((theme) => (
                        <button
                          className={`theme-choice ${applicationTheme === theme.id ? "selected" : ""}`}
                          type="button"
                          role="radio"
                          aria-checked={applicationTheme === theme.id}
                          onClick={() => setApplicationTheme(theme.id)}
                          key={theme.id}
                        >
                          <span className="theme-swatches" aria-hidden="true">
                            {theme.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
                          </span>
                          <span>{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <button
                className="secondary-button appearance-reset"
                type="button"
                onClick={() => setApplicationTheme("channel")}
                disabled={applicationTheme === "channel"}
                aria-label="Restore default theme"
              >
                Restore default
              </button>
                </section>
              </div>
            ) : null}

            {settingsTab === "user-profile" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-user-profile"
                role="tabpanel"
                aria-labelledby="settings-tab-user-profile"
              >
                <UserAvatarSettings
                  avatar={userAvatar}
                  busy={userAvatarBusy}
                  message={userAvatarMessage}
                  onChoose={() => void chooseUserAvatar()}
                  onRemove={() => void clearUserAvatar()}
                />
              </div>
            ) : null}

            {settingsTab === "agent" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-agent"
                role="tabpanel"
                aria-labelledby="settings-tab-agent"
              >
                <section className="settings-section provider-card" aria-label="Global agent defaults">
              <h3>Global defaults</h3>
              <label className="provider-field">
                Pi model
                <select value={globalModelDraft} onChange={(event) => {
                  const next = event.target.value;
                  setGlobalModelDraft(next);
                  if (!modelSupportsThinking(piModelCatalog, next) && !["pi-default", "off"].includes(globalThinkingDraft)) setGlobalThinkingDraft("off");
                }}>
                  {modelOptions.map((model) => {
                    const unavailable = Boolean(unavailableModelReason(piModelCatalog, model));
                    return (
                      <option key={modelOptionValue(model)} value={modelOptionValue(model)} disabled={unavailable}>
                        {model.provider} / {model.model}{unavailable ? " — unavailable" : ""}
                      </option>
                    );
                  })}
                </select>
                {modelKeyUnavailableReason(piModelCatalog, globalModelDraft) ? (
                  <p className="provider-note">{modelKeyUnavailableReason(piModelCatalog, globalModelDraft)}</p>
                ) : null}
              </label>
              <label className="provider-field">
                Thinking level
                <select value={globalThinkingDraft} onChange={(event) => setGlobalThinkingDraft(event.target.value as AgentThinkingLevel)}>
                  {thinkingOptions(piModelCatalog, globalModelDraft, globalThinkingDraft).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
              <label className="provider-field">
                Invocation mode
                <select value={providerInvocationMode} onChange={(event) => setProviderInvocationMode(event.target.value as AgentInvocationMode)} disabled={providerSafeTestMode}>
                  <option value="mirror">Mirror runtime Pi</option>
                  <option value="raw">Raw local Pi</option>
                </select>
              </label>
              <div className="provider-actions">
                <button type="button" onClick={() => void saveGlobalAgentProfile()} disabled={runtimeBusy || agentSettingsState === "saving"}>Save global defaults</button>
                <button className="secondary-button" type="button" onClick={() => void restoreDefaultAgentSettings()} disabled={runtimeBusy || agentSettingsState === "saving"}>Restore Mirror Desktop defaults</button>
              </div>
              <p className="provider-note">{piModelCatalogState === "loading" ? "Inspecting the local Pi model catalog…" : piModelCatalogState === "error" ? "Local Pi catalog unavailable; retained configured models remain selectable." : `${piModelCatalog.length} locally available Pi models.`}</p>
                </section>
                {agentSettingsMessage ? <p className={agentSettingsState === "error" ? "settings-error" : "provider-note"} role={agentSettingsState === "error" ? "alert" : "status"}>{agentSettingsMessage}</p> : null}
              </div>
            ) : null}

            {settingsTab === "runtime" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-runtime"
                role="tabpanel"
                aria-labelledby="settings-tab-runtime"
              >
                <section className="settings-section runtime-channel-card" aria-label="Runtime channel">
              <h3>Runtime channel {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : evaluationChannel ? <span className="evaluation-badge">{EVALUATION_BADGE_LABEL}</span> : null}</h3>
              {runtimeChannel ? (
                <dl className="runtime-channel-diagnostic">
                  <div><dt>Channel</dt><dd>{runtimeChannel.channel}</dd></div>
                  <div><dt>Bundle</dt><dd>{runtimeChannel.bundleIdentifier}</dd></div>
                  <div><dt>App data</dt><dd>{runtimeChannel.appDataRoot}</dd></div>
                  {runtimeChannel.status === "validated" ? <>
                    <div><dt>Mirror code</dt><dd>{runtimeChannel.mirrorRoot}</dd></div>
                    <div><dt>Mirror home</dt><dd>{runtimeChannel.mirrorHome}</dd></div>
                    <div><dt>Mirror user</dt><dd>{runtimeChannel.mirrorUser}</dd></div>
                    <div><dt>Database</dt><dd>{runtimeChannel.dbPath}</dd></div>
                  </> : null}
                  <div><dt>Status</dt><dd>{runtimeChannel.status}</dd></div>
                  {runtimeChannel.message ? <div><dt>Correction</dt><dd>{runtimeChannel.message}</dd></div> : null}
                </dl>
              ) : <p className="provider-note">{runtimeChannelError ?? "Inspecting the native runtime channel…"}</p>}
              <div className="runtime-binding-form" aria-label="Mirror runtime binding">
                <label className="provider-field">Mirror source
                  <span className="journey-path-picker"><input value={runtimeMirrorRoot} onChange={(event) => setRuntimeMirrorRoot(event.target.value)} placeholder="/absolute/path/to/mirror" /><button type="button" onClick={async () => { const path = await chooseRuntimeDirectory("mirrorRoot"); if (path) setRuntimeMirrorRoot(path); }}>Choose…</button></span>
                </label>
                <label className="provider-field">Mirror home
                  <span className="journey-path-picker"><input value={runtimeMirrorHome} onChange={(event) => setRuntimeMirrorHome(event.target.value)} placeholder="/absolute/path/to/mirror-home" /><button type="button" onClick={async () => { const path = await chooseRuntimeDirectory("mirrorHome"); if (path) setRuntimeMirrorHome(path); }}>Choose…</button></span>
                </label>
                <label className="provider-field">Mirror user<input value={runtimeMirrorUser} onChange={(event) => setRuntimeMirrorUser(event.target.value)} placeholder="user-slug" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
                <p className="provider-note">Database: {runtimeMirrorHome ? `${runtimeMirrorHome.replace(/\/$/, "")}/memory.db` : "Select Mirror home"}</p>
                {runtimeChannelError ? <p className="provider-error">{runtimeChannelError}</p> : null}
                {runtimeBindingFeedback ? <p className="provider-note" role="status">{runtimeBindingFeedback}</p> : null}
                {!runtimeBindingDraft && !runtimeChannelError ? <p className="provider-note">Choose both directories and enter a user to prepare this channel.</p> : null}
                <div className="settings-actions">
                  <button type="button" disabled={runtimeBindingState !== "idle"} onClick={() => void submitRuntimeBinding(false)}>Validate</button>
                  <button type="button" disabled={runtimeBindingState !== "idle"} onClick={() => void submitRuntimeBinding(true)}>Save binding</button>
                </div>
              </div>
            </section>

            <section className="settings-section provider-card" aria-label="Current session invocation controls">
              <h3>Current session controls</h3>
              <p className="provider-note"><strong>Effective model:</strong> {describeEffectiveAgentProfile(effectiveAgentProfile)}</p>
              <label className="provider-field">Command<input value={providerCommand} onChange={(event) => setProviderCommand(event.target.value)} disabled={providerSafeTestMode} /></label>
              <label className="provider-field">Arguments<input value={providerArgsText} onChange={(event) => setProviderArgsText(event.target.value)} disabled={providerSafeTestMode} /></label>
              {profileOwnedArgumentFlags(providerArgsText).length > 0 ? (
                <p className="provider-note">{profileOwnedArgumentFlags(providerArgsText).join(", ")} typed here will be replaced at send time by the effective model above.</p>
              ) : null}
              <label className="provider-check"><input type="checkbox" checked={providerUseStdin} onChange={(event) => setProviderUseStdin(event.target.checked)} disabled={providerSafeTestMode} />Send prompt through stdin</label>
              <label className="provider-check"><input type="checkbox" checked={providerSafeTestMode} onChange={(event) => setProviderSafeTestMode(event.target.checked)} />Safe test mode (cat)</label>
              {providerErrors.length > 0 ? <p className="provider-error">{providerErrors.join(" ")}</p> : null}
              <div className="provider-actions">
                <button type="button" onClick={applyProviderConfiguration} disabled={runtimeBusy}>Apply for this session</button>
                <button className="secondary-button" type="button" onClick={resetProviderConfiguration} disabled={runtimeBusy}>Reset session controls</button>
              </div>
              <p className="provider-note">Command, arguments, stdin and test mode are never persisted. Provider, model and thinking are owned by the agent profile above and applied at send time; use this field for other invocation arguments.</p>
                </section>
              </div>
            ) : null}

            {settingsTab === "voice" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-voice"
                role="tabpanel"
                aria-labelledby="settings-tab-voice"
              >
                <VoiceSettingsPanel
                  status={voiceStatus}
                  installing={voiceInstalling}
                  removing={voiceRemoving}
                  progress={voiceInstallProgress}
                  error={voiceError}
                  sessionActive={voiceSession.kind !== "idle"}
                  catalog={voiceCatalog}
                  catalogLoading={voiceCatalogLoading}
                  modelId={voiceModelId}
                  language={voiceLanguage}
                  onModelChange={setVoiceModelId}
                  onLanguageChange={setVoiceLanguage}
                  onInstall={() => void installVoice()}
                  onRemove={() => void removeVoice()}
                />
              </div>
            ) : null}
            {settingsTab === "updates" ? (
              <div
                className="settings-tab-panel"
                id="settings-panel-updates"
                role="tabpanel"
                aria-labelledby="settings-tab-updates"
              >
                <SelfUpdatePanel runtimeBusy={runtimeBusy} reviewedUpdate={reviewedUpdate} installedReleaseReading={whatsNewState?.installed} />
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {journeyAgentProfileOpen ? (
        <div className="settings-backdrop" role="presentation" onClick={() => agentSettingsState !== "saving" && setJourneyAgentProfileOpen(false)}>
          <section
            className="settings-window journey-agent-profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Choose Journey agent profile"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">{selectedJourneyItem.name}</p>
                <h2>Choose model and thinking</h2>
                <p className="settings-intro">This profile is saved only for the active Journey.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setJourneyAgentProfileOpen(false)} disabled={agentSettingsState === "saving"}>Close</button>
            </header>
            <section className="settings-section provider-card">
              <label className="provider-field">
                Provider and model
                <select value={journeyModelDraft} onChange={(event) => {
                  const next = event.target.value;
                  setJourneyModelDraft(next);
                  const resolvedModel = next === "inherit" ? modelOptionValue(agentSettings.globalProfile.model) : next;
                  if (!modelSupportsThinking(piModelCatalog, resolvedModel) && journeyThinkingDraft !== "inherit" && !["pi-default", "off"].includes(journeyThinkingDraft)) setJourneyThinkingDraft("off");
                }}>
                  <option value="inherit">Use global model · {agentSettings.globalProfile.model.provider}/{agentSettings.globalProfile.model.model}</option>
                  {modelOptions.map((model) => {
                    const unavailable = Boolean(unavailableModelReason(piModelCatalog, model));
                    return (
                      <option key={modelOptionValue(model)} value={modelOptionValue(model)} disabled={unavailable}>
                        {model.provider} / {model.model}{unavailable ? " — unavailable" : ""}
                      </option>
                    );
                  })}
                </select>
                {modelKeyUnavailableReason(
                  piModelCatalog,
                  journeyModelDraft === "inherit" ? modelOptionValue(agentSettings.globalProfile.model) : journeyModelDraft,
                ) ? (
                  <p className="provider-note">{modelKeyUnavailableReason(
                    piModelCatalog,
                    journeyModelDraft === "inherit" ? modelOptionValue(agentSettings.globalProfile.model) : journeyModelDraft,
                  )}</p>
                ) : null}
              </label>
              <label className="provider-field">
                Thinking level
                <select value={journeyThinkingDraft} onChange={(event) => setJourneyThinkingDraft(event.target.value as AgentThinkingLevel | "inherit")}>
                  <option value="inherit">Use global thinking · {agentSettings.globalProfile.thinkingLevel}</option>
                  {thinkingOptions(
                    piModelCatalog,
                    journeyModelDraft === "inherit" ? modelOptionValue(agentSettings.globalProfile.model) : journeyModelDraft,
                    journeyThinkingDraft === "inherit" ? undefined : journeyThinkingDraft,
                  ).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
              <p className="provider-note">Changes affect only the next explicit invocation. The current conversation and generation remain unchanged.</p>
              {agentSettingsMessage ? <p className={agentSettingsState === "error" ? "settings-error" : "provider-note"} role={agentSettingsState === "error" ? "alert" : "status"}>{agentSettingsMessage}</p> : null}
              <div className="provider-actions journey-agent-profile-actions">
                <button type="button" onClick={() => void saveSelectedJourneyAgentOverride()} disabled={runtimeBusy || agentSettingsState === "saving"}>Use model for this Journey</button>
                <button className="secondary-button" type="button" onClick={() => void resetSelectedJourneyAgentOverride()} disabled={runtimeBusy || agentSettingsState === "saving"}>Use global defaults</button>
                <button className="secondary-button" type="button" onClick={() => setJourneyAgentProfileOpen(false)} disabled={agentSettingsState === "saving"}>Cancel</button>
              </div>
              <p className="provider-note">{piModelCatalogState === "loading" ? "Inspecting the local Pi model catalog…" : piModelCatalogState === "error" ? "Local Pi catalog unavailable; retained configured models remain selectable." : `${piModelCatalog.length} locally available Pi models.`}</p>
            </section>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function lastItem<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}

function modelOptionValue(model: AgentModelSelection): string {
  return `${model.provider}\t${model.model}`;
}

function modelFromOptionValue(value: string): AgentModelSelection {
  const separator = value.indexOf("\t");
  if (separator <= 0 || separator === value.length - 1) throw new Error("Select a valid Pi model.");
  return { provider: value.slice(0, separator), model: value.slice(separator + 1) };
}

function uniqueModelOptions(models: AgentModelSelection[]): AgentModelSelection[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    const key = modelOptionValue(model);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => modelOptionValue(left).localeCompare(modelOptionValue(right)));
}

function modelKeyUnavailableReason(catalog: PiModelCatalogEntry[], modelKey: string): string | undefined {
  try {
    return unavailableModelReason(catalog, modelFromOptionValue(modelKey));
  } catch {
    return undefined;
  }
}

function modelSupportsThinking(catalog: PiModelCatalogEntry[], modelKey: string): boolean {
  const model = modelFromOptionValue(modelKey);
  return catalog.find((entry) => entry.provider === model.provider && entry.model === model.model)?.thinking ?? true;
}

function thinkingOptions(
  catalog: PiModelCatalogEntry[],
  modelKey: string,
  current?: AgentThinkingLevel,
): AgentThinkingLevel[] {
  if (modelSupportsThinking(catalog, modelKey)) return [...agentThinkingLevels];
  const supported: AgentThinkingLevel[] = ["pi-default", "off"];
  if (current && !supported.includes(current)) supported.push(current);
  return supported;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
