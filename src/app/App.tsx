import {
  useEffect, useMemo, useReducer, useRef, useState,
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
} from "../agent/piProcessStream";
import { normalizePiResponse } from "../agent/piResponseNormalizer";
import { startAgentRun } from "../agent/agentRun";
import { piProcessEventDispatcher } from "../agent/piProcessEventDispatcher";
import {
  configuredModelContextWindow,
  createProviderConfig,
  defaultPiProviderConfig,
  providerConfigToArgsText,
  providerModelLabel,
  projectAgentProfile,
  validateProviderConfig,
  type AgentInvocationMode,
} from "../agent/providerConfig";
import {
  extractMirrorModeEventsFromContent,
  extractMirrorSurfaceEventsFromContent,
  groupImportedActivityByMessage,
  ImportedActivity,
  mergeImportedActivityEvents,
  stripMirrorModeBlocks,
  stripMirrorSurfaceBlocks,
} from "./ImportedActivity";
import { MessageContent } from "./MessageContent";
import {
  classifyChatLocalReference,
  openExternalChatLocalReference,
} from "./chatLocalReferenceNavigation";
import { MessageCopyAction } from "./MessageCopyAction";
import { LiveRuntimeActivity } from "./LiveRuntimeActivity";
import { ComposerRuntimeFooter, ComposerRuntimeStatus } from "./ComposerRuntimeFooter";
import { composerPlaceholder } from "./composerPlaceholder";
import { deriveComposerTurnStatus } from "./composerTurnStatus";
import { cancelExactJourneyRun } from "./journeyCancellation";
import { captureJourneyRunTerminal, type JourneyRunTerminal } from "./journeyRunTerminal";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  failPiInvocationReconciliation,
  hasBlockingPiInvocationOccupancy,
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
  rollbackRejectedReservation,
  validatePreFrontierSettlement,
  type JourneySettlementAuthority,
} from "./journeySettlement";
import { journeyPersistenceCoordinator } from "./journeyPersistenceCoordinator";
import {
  resolvePersistedSettlementRecovery,
  resolveRetainedLeaseForOutboxRecovery,
} from "./journeySettlementRecovery";
import { ConversationSyncNotice, LegacyMirrorGapNotice } from "./ConversationSyncNotice";
import { PendingFileAttachments } from "./PendingFileAttachments";
import { MessageFileAttachments } from "./MessageFileAttachments";
import { MessageAttachmentProvenance } from "./MessageAttachmentProvenance";
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
import { loadDedicatedPiTranscript, loadNautilusJourneyThread, provisionNautilusJourneyThread, restartNautilusJourneyThread, retireLegacyParityState } from "./journeyThreadStorage";
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
  hasRuntimeProjectionContent,
  mergeRuntimeContextUsage,
} from "./runtimeActivityModel";
import {
  createInitialJourneyRuntimeState,
  identityJourneyId,
  isJourneyRuntimeActiveOrFinalizing,
  journeyRuntimeReducer,
  selectJourneyRuntime,
  selectJourneyRuntimeConversation,
  selectJourneyRuntimeOwnerPhase,
  type JourneyRunIdentity,
} from "./journeyRuntimeState";
import { inferMessageSpeaker, stripMessageSpeakerSignature, withCertifiedPersona } from "./conversationPresentation";
import {
  createJourneyConversationLoadCoordinator,
  deriveJourneyNavigationPresentation,
  journeySearchReducer,
  resolveJourneyConversationRestore,
  resolveJourneySelection,
  shouldRecoverDurableTurnJournal,
  shouldSubmitJourneyDraft,
  type JourneyNavigationIntent,
} from "./journeyNavigationCoordinator";
import {
  loadDedicatedJourneyConversation,
  saveActiveSettlementProjection,
  saveDedicatedJourneyConversation,
  savePostFrontierReceiptProjection,
  saveRejectedReservationRollback,
} from "./journeyConversationStorage";
import { loadJourneyPreferences, saveJourneyPreferences } from "./journeyPreferenceStorage";
import { loadComposerDrafts, saveComposerDrafts } from "./composerDraftStorage";
import {
  advanceTurnJournal,
  decideTurnJournalOpeningRecovery,
  decideTurnJournalRecovery,
  decideTurnJournalTerminal,
  findBlockingTurnJournalRecord,
  findExactTurnJournalRecord,
  interruptInactiveTurnJournal,
  loadTurnJournal,
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
  createJourneyConversation,
  createDedicatedJourneyConversation,
  restoreDedicatedJourneyConversation,
  replaceJourneyConversationMessages,
} from "../domain/journeyConversation";
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
  enqueueMirrorAppendItem,
  listMirrorAppendOutbox,
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
import type { JourneyConversation } from "../domain/journeyConversation";
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
import { MessageSpeakerAvatar, UserAvatarSettings } from "./UserAvatar";
import { importUserAvatar, loadUserAvatar, removeUserAvatar } from "./userAvatarStorage";

type AppProps = {
  model: NautilusViewModel;
};

const DEVELOPMENT_BADGE_LABEL = "DEV LAB";
const PRODUCT_DESCRIPTOR = "Journey Navigation";

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

export function App({ model }: AppProps) {
  const [selectedJourney, setSelectedJourney] = useState(defaultJourneyPreferenceState.activeJourneyId ?? "nautilus-harness");
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
  const [composerDraftsLoaded, setComposerDraftsLoaded] = useState(false);
  const [pendingFileAttachments, setPendingFileAttachments] = useState<FileAttachment[]>([]);
  const [fileAttachmentMaxFiles, setFileAttachmentMaxFiles] = useState(MAX_FILE_ATTACHMENTS);
  const [fileAttachmentBusy, setFileAttachmentBusy] = useState(false);
  const [fileDropActive, setFileDropActive] = useState(false);
  const [fileAttachmentError, setFileAttachmentError] = useState<string>();
  const [conversation, setConversation] = useState(() =>
    createJourneyConversation({ journeyId: selectedJourney, initialMessages }),
  );
  const [journeyRuntimeState, dispatchJourneyRuntime] = useReducer(
    journeyRuntimeReducer,
    undefined,
    createInitialJourneyRuntimeState,
  );
  const [runStartReservation, setRunStartReservation] = useState<JourneyRunIdentity | undefined>(undefined);
  const [piInvocationOccupancy, setPiInvocationOccupancy] = useState(createUnknownPiInvocationOccupancy);
  const [piInvocationBootstrapComplete, setPiInvocationBootstrapComplete] = useState(false);
  const [piContextState, setPiContextState] = useState<"checking" | "waiting" | "available" | "not_initialized">("checking");
  const [isRetryingMirrorCommit, setIsRetryingMirrorCommit] = useState(false);
  const [mirrorCommitErrors, setMirrorCommitErrors] = useState<Record<string, string | undefined>>({});
  const [mirrorOutboxItems, setMirrorOutboxItems] = useState<MirrorAppendOutboxSummary[]>([]);
  const [providerConfig, setProviderConfig] = useState(defaultPiProviderConfig);
  const [providerCommand, setProviderCommand] = useState(defaultPiProviderConfig.command);
  const [providerArgsText, setProviderArgsText] = useState(providerConfigToArgsText(defaultPiProviderConfig));
  const [providerUseStdin, setProviderUseStdin] = useState(defaultPiProviderConfig.useStdin);
  const [providerSafeTestMode, setProviderSafeTestMode] = useState(defaultPiProviderConfig.safeTestMode);
  const [providerInvocationMode, setProviderInvocationMode] = useState<AgentInvocationMode>(defaultPiProviderConfig.invocationMode);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(() => createDefaultAgentSettings());
  const [agentSettingsState, setAgentSettingsState] = useState<"checking" | "ready" | "saving" | "error">("checking");
  const [agentSettingsMessage, setAgentSettingsMessage] = useState<string | undefined>();
  const [piModelCatalog, setPiModelCatalog] = useState<PiModelCatalogEntry[]>([]);
  const [piModelCatalogState, setPiModelCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [globalModelDraft, setGlobalModelDraft] = useState(() => modelOptionValue(createDefaultAgentSettings().globalProfile.model));
  const [globalThinkingDraft, setGlobalThinkingDraft] = useState<AgentThinkingLevel>(createDefaultAgentSettings().globalProfile.thinkingLevel);
  const [journeyModelDraft, setJourneyModelDraft] = useState("inherit");
  const [journeyThinkingDraft, setJourneyThinkingDraft] = useState<AgentThinkingLevel | "inherit">("inherit");
  const [journeyAgentProfileOpen, setJourneyAgentProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [runtimeChannel, setRuntimeChannel] = useState<RuntimeChannelDiagnostic>();
  const [runtimeChannelError, setRuntimeChannelError] = useState<string>();
  const [runtimeMirrorRoot, setRuntimeMirrorRoot] = useState("");
  const [runtimeMirrorHome, setRuntimeMirrorHome] = useState("");
  const [runtimeMirrorUser, setRuntimeMirrorUser] = useState("");
  const [runtimeBindingState, setRuntimeBindingState] = useState<"idle" | "validating" | "saving">("idle");
  const [runtimeBindingFeedback, setRuntimeBindingFeedback] = useState<string>();
  const [journeyMenuOpen, setJourneyMenuOpen] = useState(false);
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
  const [turnRecoveryAttempt, setTurnRecoveryAttempt] = useState(0);
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
  const navigationPresentation = deriveJourneyNavigationPresentation({
    runtimeState: journeyRuntimeState,
    selectedJourneyId: selectedJourney,
    loadedConversation: conversation,
    mirrorCommitErrors,
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
  const piInvocationPresentation = derivePiInvocationAdmission(piInvocationOccupancy, selectedJourney);
  const runtimeBindingReady = runtimeChannel?.status === "validated";
  const selectedInvocationAdmissionBlocked = Boolean(runStartReservation)
    || selectedRuntimeBusy
    || !runtimeBindingReady;
  const mirrorCommitError = navigationPresentation.mirrorCommitError;
  const messages = navigationPresentation.messages;
  const presentedImportedActivity = navigationPresentation.conversation?.importedActivity?.events;
  const importedActivity = useMemo(
    () => groupImportedActivityByMessage(presentedImportedActivity ?? []),
    [presentedImportedActivity],
  );
  const effectiveAgentProfile = useMemo(
    () => resolveAgentProfile(agentSettings, selectedJourney),
    [agentSettings, selectedJourney],
  );
  const effectiveProviderConfig = useMemo(
    () => projectAgentProfile(providerConfig, effectiveAgentProfile),
    [effectiveAgentProfile, providerConfig],
  );
  const providerErrors = useMemo(() => validateProviderConfig(effectiveProviderConfig), [effectiveProviderConfig]);
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
  const pendingMirrorRepair = useMemo(() => pendingMirrorTurnRepair(conversation), [conversation]);
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
  const blockingOpeningRecovery = blockingTurnJournalRecord
    ? decideTurnJournalOpeningRecovery(blockingTurnJournalRecord, Boolean(selectedNativeLease))
    : undefined;
  const previousResponseCanBeDiscarded = blockingOpeningRecovery === "recover_response"
    && blockingTurnJournalRecord?.phase === "terminal_durable";
  const retainedLeaseWithoutRecovery = selectedNativeLease
    && !selectedRuntimeBusy
    && !exactRetainedSettlementRecovery;
  const pendingMirrorOutboxItem = mirrorOutboxItems.find((item) => item.itemId === pendingMirrorRepair?.correlation.turnId);
  const pendingMirrorDisposition = pendingMirrorRepair
    ? classifyPendingMirrorAppend(
        classifyMirrorAppendMessagePair(conversation, pendingMirrorRepair.correlation),
        Boolean(pendingMirrorOutboxItem),
      )
    : undefined;
  const legacyMirrorGap = pendingMirrorDisposition === "legacy_gap";
  const dedicatedThreadReady = journeyThreadState.kind === "ready";
  const dedicatedTurnState = classifyDedicatedTurnState(conversation, selectedRuntimeBusy);
  const latestNautilusTurn = [...conversation.reconciliation.turns].reverse().find((turn) => turn.origin === "nautilus");
  const durableInterruptedTurn = latestNautilusTurn?.pi.state === "failed"
    && latestNautilusTurn.pi.failureCode?.startsWith("turn_journal_")
    ? latestNautilusTurn
    : undefined;
  const mirrorAppendNeedsEnqueue = pendingMirrorDisposition === "enqueue_required";
  const reconciliationBlocksInvocation = mirrorAppendNeedsEnqueue || (dedicatedThreadReady
    ? dedicatedTurnBlocksNewInvocation(dedicatedTurnState)
    : conversation.reconciliation.classification !== "in_sync");
  const composerTurnStatus = deriveComposerTurnStatus({
    agentRunStatus: agentRun.status,
    runBelongsToSelectedJourney: selectedRuntime.identity
      ? identityJourneyId(selectedRuntime.identity) === selectedJourney
      : false,
    isStreaming,
    isFinalizingTurn,
    reconciliationBlocksInvocation,
    mirrorRepairPending: Boolean(pendingMirrorRepair),
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
    if (!shouldRehydratePiProcessRoute(selectedNativeLease, selectedRuntimeBusy)
      || !selectedNativeLease
      || !conversationLoaded
      || journeyThreadState.kind !== "ready"
      || selectedNativeLease.authority.generation !== conversation.liveIdentity.generation) return;
    const evidence = conversation.reconciliation.turns.find((turn) => (
      turn.turnId === selectedNativeLease.authority.turnId
      && turn.runId === selectedNativeLease.authority.runId
      && turn.harness.userMessageId === selectedNativeLease.authority.harnessUserMessageId
      && turn.harness.assistantMessageId === selectedNativeLease.authority.harnessAssistantMessageId
    ));
    if (!evidence) return;
    try {
      const correlation = createDedicatedTurnAuthority(
        journeyThreadState.thread,
        selectedNativeLease.authority.runId,
        selectedNativeLease.authority.turnId,
        selectedNativeLease.authority.harnessUserMessageId,
        selectedNativeLease.authority.harnessAssistantMessageId,
      );
      const recoveredAuthority = createRunAuthority(
        correlation,
        conversation.liveIdentity,
        journeyThreadState.activeGeneration,
      );
      if (!samePiProcessEventAuthority(selectedNativeLease.authority, recoveredAuthority)) return;
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
        journeyId: selectedNativeLease.authority.journeyId,
        message: "settlement_authority_mismatch",
      });
    }
  }, [
    conversation,
    conversationLoaded,
    journeyThreadState,
    selectedNativeLease,
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
        setAgentSettingsState("ready");
        setAgentSettingsMessage(stored ? "Agent defaults restored from this device." : "Using Mirror Desktop agent defaults.");
      })
      .catch((error) => {
        if (cancelled) return;
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
    if (piModelCatalogState !== "idle") return;
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
  }, [piModelCatalogState]);

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
    setTurnRecoveryAttempt(0);
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
    if (!registryLoaded || !preferencesLoaded) {
      return;
    }

    let cancelled = false;
    const loadRequest = conversationLoadCoordinatorRef.current.begin(selectedJourney);
    const requestIsCurrent = () => !cancelled
      && conversationLoadCoordinatorRef.current.isCurrent(loadRequest, selectedJourneyRef.current);
    setConversationLoaded(false);
    setJourneyThreadState({ kind: "loading" });
    setPiContextState("checking");

    async function restoreConversation() {
      let threadAuthorityLoaded = false;
      try {
        const dedicatedThread = await loadNautilusJourneyThread(selectedJourney);
        threadAuthorityLoaded = true;
        if (!requestIsCurrent()) return;
        const classified = classifyNautilusJourneyThread(dedicatedThread, selectedJourney);
        const restoreDecision = classified.kind === "ready"
          ? resolveJourneyConversationRestore(
              journeyRuntimeStateRef.current,
              selectedJourney,
              classified.activeGeneration.generation,
            )
          : { runtimeConversation: undefined, allowPersistedRecovery: true };
        const persistedConversation = classified.kind === "ready" && restoreDecision.allowPersistedRecovery
          ? await loadDedicatedJourneyConversation(selectedJourney, classified.activeGeneration.generation)
          : undefined;
        if (!requestIsCurrent()) return;
        let restoredConversation = restoreDecision.runtimeConversation ?? (classified.kind === "ready"
          ? restoreDedicatedJourneyConversation(classified.thread, persistedConversation)
          : createJourneyConversation({ journeyId: selectedJourney, initialMessages }));
        const ownerHasLiveNativeExecution = classified.kind === "ready" && piInvocationOccupancy.entries.some((entry) => (
          entry.authority.journeyId === selectedJourney
          && entry.authority.generation === classified.activeGeneration.generation
          && entry.terminalState === "open"
        ));
        if (classified.kind === "ready" && classified.activeGeneration.piSessionFile
          && piInvocationBootstrapComplete
          && shouldRecoverDurableTurnJournal({
            allowPersistedRecovery: restoreDecision.allowPersistedRecovery,
            nativeInspectionStatus: piInvocationOccupancy.status,
            ownerHasLiveNativeExecution,
          })) {
          const journal = await loadTurnJournal(selectedJourney);
          if (!requestIsCurrent()) return;
          const latestNautilusTurn = [...restoredConversation.reconciliation.turns].reverse().find((turn) =>
            turn.origin === "nautilus" && turn.runId,
          );
          const pendingTurn = latestNautilusTurn?.pi.state === "pending" ? latestNautilusTurn : undefined;
          const stagedUser = [...restoredConversation.messages].reverse().find((message) => message.role === "user");
          const stagedAssistant = [...restoredConversation.messages].reverse().find((message) => message.role === "assistant");
          if (pendingTurn?.runId && stagedUser && stagedAssistant) {
            const recoveryCorrelation = createDedicatedTurnAuthority(
              classified.thread,
              pendingTurn.runId,
              pendingTurn.turnId,
              stagedUser.id,
              stagedAssistant.id,
            );
            const recoveryAuthority = createJourneySettlementAuthority(
              createRunAuthority(recoveryCorrelation, restoredConversation.liveIdentity),
            );
            const hasJournalRecord = journal.records.some((record) => record.authority.runId === pendingTurn.runId);
            if (hasJournalRecord) {
              const journalRecord = requireExactTurnJournalRecord(journal, recoveryAuthority);
              const decision = decideTurnJournalRecovery(journalRecord);
              if (decision === "project_completed") {
                const execution = journalRecord.terminalEvidence?.piExecution;
                if (!execution) throw new Error("turn_journal_completed_evidence_missing");
                restoredConversation = replaceJourneyConversationMessages(
                  restoredConversation,
                  restoredConversation.messages.map((message) => message.id === stagedAssistant.id
                    ? { ...message, content: execution.assistantText }
                    : message),
                );
                restoredConversation = applyPiExecutionEvidence(restoredConversation, recoveryCorrelation, {
                  userEntryId: execution.userEntryId,
                  assistantEntryId: execution.assistantEntryId,
                  leafEntryId: execution.leafEntryId,
                  entryCount: execution.entryCount,
                  sessionFile: classified.activeGeneration.piSessionFile,
                  committedAt: execution.committedAt,
                });
                restoredConversation = commitHarnessTurn(restoredConversation, recoveryCorrelation, new Date().toISOString());
                await saveProjectedTurnLifecycle(restoredConversation, recoveryAuthority);
                await enqueueExactProjectionOutbox(restoredConversation, recoveryAuthority);
              } else if (decision === "interrupt" || decision === "project_cancelled" || decision === "project_failed") {
                restoredConversation = interruptDedicatedTurn(
                  restoredConversation,
                  pendingTurn.turnId,
                  decision === "project_cancelled"
                    ? "turn_journal_cancelled"
                    : decision === "project_failed" ? "turn_journal_failed" : "turn_journal_interrupted",
                  new Date().toISOString(),
                );
                restoredConversation = replaceJourneyConversationMessages(
                  restoredConversation,
                  restoredConversation.messages.filter((message) => message.id !== stagedAssistant.id || message.content.trim().length > 0),
                );
                await saveInterruptedTurnLifecycle(restoredConversation, recoveryAuthority);
              } else {
                throw new Error(`turn_journal_projection_divergence:${decision}`);
              }
            } else {
              dispatchJourneyRuntime({
                type: "append_warning",
                journeyId: selectedJourney,
                message: "Pending turn retained because no durable lifecycle journal authority exists for recovery.",
              });
            }
          } else if (!latestNautilusTurn) {
            const turns = await loadDedicatedPiTranscript(
              selectedJourney,
              classified.activeGeneration.piSessionId,
              classified.activeGeneration.piSessionFile,
            ).catch(() => []);
            restoredConversation = replaceJourneyConversationMessages(restoredConversation, turns.flatMap((turn) => [{
              id: `pi-${turn.userEntryId}`,
              role: "user" as const,
              content: turn.userText,
              createdAt: turn.startedAt,
            }, {
              id: `pi-${turn.assistantEntryId}`,
              role: "assistant" as const,
              content: turn.assistantText,
              createdAt: turn.committedAt,
            }]));
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
    registryLoaded,
    preferencesLoaded,
    piInvocationBootstrapComplete,
    selectedNativeLease?.leasePhase,
    selectedNativeLease?.terminalState,
    turnRecoveryAttempt,
  ]);

  useEffect(() => {
    if (!conversationLoaded || !piInvocationBootstrapComplete || journeyThreadState.kind !== "ready") return;
    let cancelled = false;
    const ownerJourneyId = selectedJourney;
    const activeGeneration = journeyThreadState.activeGeneration.generation;
    void loadTurnJournal(ownerJourneyId)
      .then(async (journal) => {
        if (cancelled || selectedJourneyRef.current !== ownerJourneyId) return;
        const blockingRecord = findBlockingTurnJournalRecord(journal, ownerJourneyId, activeGeneration);
        if (!blockingRecord) {
          setBlockingTurnJournalRecord(undefined);
          setTurnRecoveryError(undefined);
          setTurnRecoveryBusy(false);
          setTurnRecoveryAttempt(0);
          return;
        }
        const decision = decideTurnJournalOpeningRecovery(blockingRecord, Boolean(selectedNativeLease));
        if (decision !== "auto_interrupt") {
          setBlockingTurnJournalRecord(blockingRecord);
          setTurnRecoveryError(turnRecoveryAttempt > 0 && decision === "recover_response"
            ? "Mirror still couldn’t restore the previous response. Your data remains preserved."
            : undefined);
          setTurnRecoveryBusy(false);
          return;
        }
        setBlockingTurnJournalRecord(blockingRecord);
        setTurnRecoveryBusy(true);
        const recoveredJournal = await interruptInactiveTurnRecord(
          blockingRecord,
          ownerJourneyId,
          activeGeneration,
        );
        if (cancelled || selectedJourneyRef.current !== ownerJourneyId) return;
        setBlockingTurnJournalRecord(
          findBlockingTurnJournalRecord(recoveredJournal, ownerJourneyId, activeGeneration),
        );
        setTurnRecoveryNotice("A previous attempt didn’t finish. You can send your message again.");
        setTurnRecoveryError(undefined);
        setTurnRecoveryAttempt(0);
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
    selectedNativeLease?.leasePhase,
    selectedNativeLease?.terminalState,
    turnRecoveryAttempt,
  ]);

  useEffect(() => {
    if (!turnRecoveryNotice) return;
    const timeout = window.setTimeout(() => setTurnRecoveryNotice(undefined), 6000);
    return () => window.clearTimeout(timeout);
  }, [turnRecoveryNotice]);

  useEffect(() => {
    if (!registryLoaded) return;
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
  }, [selectedJourney, registryLoaded]);

  useEffect(() => {
    if (!conversationLoaded || runtimeBusy || effectiveProviderConfig.safeTestMode) {
      return;
    }
    const providerModel = providerModelLabel(effectiveProviderConfig);
    const cachedStats = conversation.authoritativeContextStats;
    if (
      cachedStats
      && cachedStats.piSessionId === conversation.liveIdentity.piSessionId
      && cachedStats.generation === conversation.liveIdentity.generation
      && cachedStats.usage.tokens !== null
    ) {
      setPiContextState("available");
      return;
    }

    let cancelled = false;
    setPiContextState("checking");
    void readJourneyPiContextStats(
      conversation.journeyId,
      conversation.liveIdentity.piSessionId,
    ).then((inspection) => {
      if (cancelled) {
        return;
      }
      const snapshot = inspection.snapshot;
      if (inspection.status !== "available" || !snapshot || snapshot.providerModel !== providerModel) {
        setPiContextState("waiting");
        return;
      }
      setPiContextState("available");
      setConversation((currentConversation) => {
        if (
          currentConversation.liveIdentity.piSessionId !== conversation.liveIdentity.piSessionId
          || currentConversation.liveIdentity.generation !== conversation.liveIdentity.generation
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
      if (!cancelled) {
        setPiContextState("waiting");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    conversation.id,
    conversation.journeyId,
    conversation.liveIdentity.generation,
    conversation.liveIdentity.piSessionId,
    conversationLoaded,
    runtimeBusy,
    effectiveProviderConfig,
  ]);

  useEffect(() => {
    if (!composerDraftsLoaded) return;
    void saveComposerDrafts(composerDrafts).catch((error) => {
      console.warn("Could not persist Composer drafts.", error);
    });
  }, [composerDrafts, composerDraftsLoaded]);

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
    });
  }, [journeyPreferences, journeyListOrder, sidebarCompact, lastWorkedAtByJourneyId, applicationTheme, journeyAppearanceById, registryLoaded, preferencesLoaded]);

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
        for (const item of items) {
          if (cancelled || checkedMirrorTurnRef.current.has(item.itemId)) continue;
          checkedMirrorTurnRef.current.add(item.itemId);
          try {
            await retryMirrorAppendSummary(item);
          } catch {
            // Retain the durable item and continue retrying other generations.
          }
        }
      })();
    }).catch((error) => {
      if (!cancelled) setJourneyMirrorCommitError(conversation.journeyId, error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [conversation.journeyId, conversationLoaded, journeyThreadState.kind]);

  useEffect(() => {
    checkedMirrorTurnRef.current.clear();
    setMirrorOutboxItems([]);
  }, [selectedJourney]);

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
    if (fileAttachmentBusy || runtimeBusy || isJourneyReloading) return;
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

  function setJourneyComposerDraft(journeyId: string, text: string) {
    const boundedText = text.slice(0, COMPOSER_DRAFT_MAX_CHARS);
    if (selectedJourneyRef.current === journeyId) {
      setDraft(boundedText);
    }
    setComposerDrafts((current) => updateComposerDraft(current, journeyId, boundedText));
  }

  async function attachDroppedFiles(paths: string[]) {
    if (journeyThreadState.kind !== "ready" || runtimeBusy || isJourneyReloading) return;
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
      ? selectedInvocationAdmissionBlocked || turnRecoveryBusy || Boolean(blockingTurnJournalRecord)
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
        dispatchJourneyRuntime({
          type: "append_warning",
          journeyId: selectedJourney,
          message: "Live invocation stopped because Journey conversation authority changed or is still being inspected. Reconcile the selected Journey and try again.",
        });
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
      dispatchJourneyRuntime({
        type: "append_warning",
        journeyId: selectedJourney,
        message: `Live invocation stopped because run authority could not be built: ${error instanceof Error ? error.message : String(error)}`,
      });
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
    runStartReservationRef.current = runtimeIdentity;
    setRunStartReservation(runtimeIdentity);

    if (correlation) {
      try {
        if (!settlementAuthority) throw new Error("settlement_authority_missing");
        await journeyPersistenceCoordinator.run(
          settlementAuthority,
          "pre_frontier",
          () => saveDedicatedJourneyConversation(stagedConversation),
        );
      } catch (error) {
        dispatchJourneyRuntime({
          type: "append_warning",
          journeyId: ownerJourneyId,
          message: error instanceof Error ? error.message : String(error),
        });
        if (runStartReservationRef.current === runtimeIdentity) runStartReservationRef.current = undefined;
        setRunStartReservation((current) => current === runtimeIdentity ? undefined : current);
        return;
      }
    }
    if (invocationAuthority) {
      setPiInvocationOccupancy((current) => retainExpectedPiInvocationLease(current, invocationAuthority));
    }
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
    setJourneyComposerDraft(baseConversation.journeyId, "");
    setPendingFileAttachments([]);
    setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
    setFileAttachmentError(undefined);

    const conversationBeforeRun = baseConversation;
    let rawLiveOutput = "";
    let runReachedAgent = false;
    let workActivityRecorded = false;
    let runTerminal: JourneyRunTerminal | undefined;
    let preAgentFailureMessage = "The local Pi invocation was rejected before the agent started.";
    const diagnostics: string[] = [];
    let streamedAssistantContent = "";
    let runConversation = stagedConversation;

    function updateRunConversation(update: (current: JourneyConversation) => JourneyConversation) {
      runConversation = update(runConversation);
      dispatchJourneyRuntime({ type: "conversation_snapshot", identity: runtimeIdentity, conversation: runConversation });
      if (
        selectedJourneyRef.current === ownerJourneyId
        && conversationRef.current.liveIdentity.generation === ownerGeneration
      ) {
        conversationRef.current = runConversation;
        setConversation(runConversation);
      }
    }

    try {
      for await (const event of provider(packet)) {
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
        }
        if (event.type === "context_usage") {
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
        if (selectedJourneyRef.current === ownerJourneyId && conversationRef.current.liveIdentity.generation === ownerGeneration) {
          conversationRef.current = conversationBeforeRun;
          setConversation(conversationBeforeRun);
        }
        if (correlation) {
          try {
            if (invocationAuthority) {
              await rollbackRejectedReservation({
                projection: conversationBeforeRun,
                authority: invocationAuthority,
              }, {
                saveRollbackProjection: (projection) => {
                  if (!settlementAuthority) throw new Error("settlement_authority_missing");
                  return saveRejectedReservationRollback(projection, settlementAuthority);
                },
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
                  setJourneyComposerDraft(ownerJourneyId, content);
                  if (selectedJourneyRef.current === ownerJourneyId) {
                    setPendingFileAttachments(fileAttachments);
                  }
                  dispatchJourneyRuntime({ type: "cleanup", identity: runtimeIdentity });
                  dispatchJourneyRuntime({
                    type: "append_warning",
                    journeyId: ownerJourneyId,
                    message: `Message returned to the composer: ${preAgentFailureMessage}`,
                  });
                },
              });
            } else {
              await saveDedicatedJourneyConversation(conversationBeforeRun);
            }
          } catch (error) {
            setJourneyComposerDraft(ownerJourneyId, content);
            if (selectedJourneyRef.current === ownerJourneyId) {
              setPendingFileAttachments(fileAttachments);
            }
            dispatchJourneyRuntime({
              type: "append_warning", journeyId: ownerJourneyId, identity: runtimeIdentity,
              message: `Message returned to the composer after rollback failed: ${error instanceof Error ? error.message : String(error)}`,
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
        runConversation = interrupted;
        dispatchJourneyRuntime({ type: "conversation_snapshot", identity: runtimeIdentity, conversation: runConversation });
        if (selectedJourneyRef.current === ownerJourneyId && conversationRef.current.liveIdentity.generation === ownerGeneration) {
          conversationRef.current = interrupted;
          setConversation(interrupted);
        }
        if (correlation) {
          try {
            if (settlementAuthority) {
              await journeyPersistenceCoordinator.run(settlementAuthority, "interrupted", () => executeInterruptedSettlement({
                projection: interrupted,
                authority: settlementAuthority,
              }, {
                loadActiveEvidence: loadActiveSettlementEvidence,
                saveInterruptedProjection: saveInterruptedTurnLifecycle,
                cleanupLease: releaseDurablePiInvocationLease,
              }));
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
      } else if (correlation && settlementAuthority) {
        dispatchJourneyRuntime({ type: "finalization_started", identity: runtimeIdentity });
        let finalizationReleased = false;
        let settled = runConversation;
        try {
          validatePreFrontierSettlement(
            settlementAuthority,
            settled,
            await loadActiveSettlementEvidence(settlementAuthority),
          );
          const journal = await loadTurnJournal(settlementAuthority.journeyId);
          const journalRecord = requireExactTurnJournalRecord(journal, settlementAuthority);
          if (decideTurnJournalTerminal(journalRecord) !== "completed") {
            throw new Error("turn_journal_completed_outcome_required");
          }
          const execution = journalRecord.terminalEvidence?.piExecution;
          if (!execution) throw new Error("turn_journal_completed_evidence_missing");
          validatePreFrontierSettlement(
            settlementAuthority,
            settled,
            await loadActiveSettlementEvidence(settlementAuthority),
          );
          settled = replaceJourneyConversationMessages(
            settled,
            settled.messages.map((message) => message.id === settlementAuthority.harnessAssistantMessageId
              ? { ...message, content: execution.assistantText }
              : message),
          );
          settled = applyPiExecutionEvidence(settled, correlation, {
            userEntryId: execution.userEntryId,
            assistantEntryId: execution.assistantEntryId,
            leafEntryId: execution.leafEntryId,
            entryCount: execution.entryCount,
            sessionFile: settlementAuthority.piSessionFile,
            committedAt: execution.committedAt,
          });
          settled = commitHarnessTurn(settled, correlation, new Date().toISOString());
          const projectionAtFrontier = settled;
          const settlement = await executeCompletedSettlement({
            projection: projectionAtFrontier,
            authority: settlementAuthority,
            cleanupLeaseAuthority: settlementAuthority,
          }, {
            loadActiveEvidence: loadActiveSettlementEvidence,
            saveActiveProjection: (projection, authority) => journeyPersistenceCoordinator.run(
              authority, "pre_frontier", () => saveProjectedTurnLifecycle(projection, authority),
            ),
            enqueueOutbox: (projection, authority) => journeyPersistenceCoordinator.run(
              authority, "pre_frontier", () => enqueueExactProjectionOutbox(projection, authority),
            ),
            cleanupLease: releaseDurablePiInvocationLease,
            onLeaseReleased: () => {
                finalizationReleased = true;
                dispatchJourneyRuntime({
                  type: "conversation_snapshot",
                  identity: runtimeIdentity,
                  conversation: projectionAtFrontier,
                });
                if (selectedJourneyRef.current === settlementAuthority.journeyId
                  && projectionCurrentTurnMatchesAuthority(conversationRef.current, settlementAuthority)) {
                  conversationRef.current = projectionAtFrontier;
                  setConversation(projectionAtFrontier);
                }
                dispatchJourneyRuntime({ type: "finalization_finished", identity: runtimeIdentity });
              },
            appendAndAcknowledge: (projection, summary, authority) => (
              appendAndAcknowledgeExactProjection(projection, authority, summary)
            ),
          });
          settled = settlement.projection;
          if (await persistedCurrentTurnMatchesAuthority(settlementAuthority)) {
            setJourneyMirrorCommitError(ownerJourneyId, undefined);
          }
          if (
            selectedJourneyRef.current === settled.journeyId
            && projectionCurrentTurnMatchesAuthority(conversationRef.current, settlementAuthority)
          ) {
            conversationRef.current = settled;
            setConversation(settled);
          }
        } catch (error) {
          if (!finalizationReleased || await persistedCurrentTurnMatchesAuthority(settlementAuthority)) {
            setJourneyMirrorCommitError(ownerJourneyId, error instanceof Error ? error.message : String(error));
          }
          if (selectedJourneyRef.current === ownerJourneyId
            && projectionCurrentTurnMatchesAuthority(conversationRef.current, settlementAuthority)) {
            conversationRef.current = settled;
            setConversation(settled);
          }
        } finally {
          dispatchJourneyRuntime({ type: "conversation_snapshot", identity: runtimeIdentity, conversation: settled });
          if (!finalizationReleased) {
            dispatchJourneyRuntime({ type: "finalization_finished", identity: runtimeIdentity });
          }
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

  async function loadActiveSettlementEvidence(authority: JourneySettlementAuthority) {
    const [thread, persisted] = await Promise.all([
      loadNautilusJourneyThread(authority.journeyId),
      loadDedicatedJourneyConversation(authority.journeyId, authority.generation),
    ]);
    const classified = classifyNautilusJourneyThread(thread, authority.journeyId);
    const currentTurn = persisted?.reconciliation.turns.at(-1);
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

  function projectionCurrentTurnMatchesAuthority(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ): boolean {
    const current = projection.reconciliation.turns.at(-1);
    return projection.journeyId === authority.journeyId
      && projection.liveIdentity.generation === authority.generation
      && current?.turnId === authority.turnId
      && current.runId === authority.runId
      && current.harness.userMessageId === authority.harnessUserMessageId
      && current.harness.assistantMessageId === authority.harnessAssistantMessageId;
  }

  async function persistedCurrentTurnMatchesAuthority(
    authority: JourneySettlementAuthority,
  ): Promise<boolean> {
    const persisted = await loadDedicatedJourneyConversation(authority.journeyId, authority.generation);
    return Boolean(persisted && projectionCurrentTurnMatchesAuthority(persisted, authority));
  }

  function validateExactOutboxSummary(
    summary: MirrorAppendOutboxSummary,
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ) {
    if (summary.itemId !== authority.turnId
      || summary.journeyId !== authority.journeyId
      || summary.threadId !== authority.threadId
      || summary.generation !== authority.generation
      || summary.conversationId !== authority.mirrorConversationId
      || projection.journeyId !== authority.journeyId
      || projection.id !== authority.threadId
      || projection.liveIdentity.generation !== authority.generation
      || projection.liveIdentity.mirrorConversationId !== authority.mirrorConversationId) {
      throw new Error("mirror_append_outbox_authority_mismatch");
    }
  }

  async function saveProjectedTurnLifecycle(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ): Promise<void> {
    await saveActiveSettlementProjection(projection, authority);
    const journal = await loadTurnJournal(authority.journeyId);
    if (journal.records.some((record) => record.authority.runId === authority.runId)) {
      await advanceTurnJournal(authority, "terminal_durable", "projected");
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

  async function enqueueExactProjectionOutbox(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
  ): Promise<MirrorAppendOutboxSummary> {
    const outboxItem = createMirrorAppendOutboxItem(projection, authority);
    await enqueueMirrorAppendItem(outboxItem, authority);
    const journal = await loadTurnJournal(authority.journeyId);
    if (journal.records.some((record) => record.authority.runId === authority.runId)) {
      await advanceTurnJournal(authority, "projected", "outbox_enqueued");
    }
    const summary: MirrorAppendOutboxSummary = {
      schemaVersion: "1.0.0",
      itemId: outboxItem.itemId,
      journeyId: outboxItem.journeyId,
      threadId: outboxItem.threadId,
      generation: outboxItem.generation,
      conversationId: outboxItem.conversationId,
      createdAt: outboxItem.createdAt,
    };
    setMirrorOutboxItems((items) => items.some((item) => item.itemId === summary.itemId)
      ? items : [...items, summary]);
    return summary;
  }

  async function appendAndAcknowledgeExactProjection(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
    summary: MirrorAppendOutboxSummary,
  ): Promise<JourneyConversation> {
    validateExactOutboxSummary(summary, projection, authority);
    const receipt = await appendMirrorOutboxItem(summary.itemId, authority);
    return journeyPersistenceCoordinator.run(authority, "post_frontier", async () => {
      const latestProjection = await loadDedicatedJourneyConversation(authority.journeyId, authority.generation);
      if (!latestProjection) throw new Error("mirror_append_projection_missing");
      validateExactOutboxSummary(summary, latestProjection, authority);
      const settled = applyMirrorAppendReceipt(latestProjection, authority, receipt, new Date().toISOString());
      await savePostFrontierReceiptProjection(settled, authority, summary);
      await acknowledgeMirrorAppendItem(summary.itemId, summary.conversationId, authority);
      const journal = await loadTurnJournal(authority.journeyId);
      if (journal.records.some((record) => record.authority.runId === authority.runId)) {
        await advanceTurnJournal(authority, "outbox_enqueued", "settled");
      }
      setMirrorOutboxItems((items) => items.filter((item) => item.itemId !== summary.itemId));
      return settled;
    });
  }

  async function retryMirrorAppendSummary(item: MirrorAppendOutboxSummary) {
    try {
      const projected = await loadDedicatedJourneyConversation(item.journeyId, item.generation);
      const recovery = resolvePersistedSettlementRecovery(projected, item);
      if (recovery.status === "blocked") throw new Error(recovery.diagnostic);
      const { authority } = recovery;
      const journal = await loadTurnJournal(authority.journeyId);
      if (journal.records.some((record) => record.authority.runId === authority.runId)) {
        await advanceTurnJournal(authority, ["projected", "outbox_enqueued"], "outbox_enqueued");
      }
      const inspection = await inspectPiInvocations();
      if (!validatePiInvocationRegistryInspection(inspection)) {
        throw new Error("mirror_outbox_native_lease_inspection_invalid");
      }
      if (resolveRetainedLeaseForOutboxRecovery(inspection, authority)) {
        await releaseDurablePiInvocationLease(authority);
      }
      const settled = await appendAndAcknowledgeExactProjection(recovery.projection, authority, item);
      if (selectedJourneyRef.current === item.journeyId
        && projectionCurrentTurnMatchesAuthority(conversationRef.current, authority)) {
        conversationRef.current = settled;
        setConversation(settled);
      }
      setJourneyMirrorCommitError(item.journeyId, undefined);
    } catch (error) {
      setJourneyMirrorCommitError(item.journeyId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function retryPendingMirrorCommit() {
    if (!pendingMirrorRepair || (runtimeBusy && !exactRetainedSettlementRecovery) || isRetryingMirrorCommit) return;
    const ownerJourneyId = conversationRef.current.journeyId;
    if (ownerJourneyId !== selectedJourneyRef.current) return;
    setIsRetryingMirrorCommit(true);
    setJourneyMirrorCommitError(ownerJourneyId, undefined);
    try {
      const projection = conversationRef.current;
      const authority = createJourneySettlementAuthority(
        createRunAuthority(pendingMirrorRepair.correlation, projection.liveIdentity),
      );
      if (pendingMirrorOutboxItem) {
        validateExactOutboxSummary(pendingMirrorOutboxItem, projection, authority);
      }
      const settlement = await executeCompletedSettlement({
        projection,
        authority,
        cleanupLeaseAuthority: exactRetainedSettlementRecovery ? authority : undefined,
        existingOutbox: pendingMirrorOutboxItem,
      }, {
        loadActiveEvidence: loadActiveSettlementEvidence,
        saveActiveProjection: (candidate, exactAuthority) => journeyPersistenceCoordinator.run(
          exactAuthority, "pre_frontier", () => saveProjectedTurnLifecycle(candidate, exactAuthority),
        ),
        enqueueOutbox: (candidate, exactAuthority) => journeyPersistenceCoordinator.run(
          exactAuthority, "pre_frontier", () => enqueueExactProjectionOutbox(candidate, exactAuthority),
        ),
        cleanupLease: releaseDurablePiInvocationLease,
        appendAndAcknowledge: (candidate, summary, exactAuthority) => (
          appendAndAcknowledgeExactProjection(candidate, exactAuthority, summary)
        ),
      });
      conversationRef.current = settlement.projection;
      setConversation(settlement.projection);
      setJourneyMirrorCommitError(ownerJourneyId, undefined);
      checkedMirrorTurnRef.current.add(settlement.outbox.itemId);
    } catch (error) {
      setJourneyMirrorCommitError(ownerJourneyId, error instanceof Error ? error.message : String(error));
    } finally {
      setIsRetryingMirrorCommit(false);
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
      const blockingRecord = findBlockingTurnJournalRecord(journal, ownerJourneyId, previousGeneration);
      if (blockingRecord) {
        setBlockingTurnJournalRecord(blockingRecord);
        setRestartConfirmationOpen(false);
        throw new Error("Mirror is still preparing the previous message. Try again when the conversation is ready.");
      }
      setJourneyReloadStatus("Reserving next generation…");
      const thread = await restartNautilusJourneyThread(ownerJourneyId, selectedJourneyItem.name, (phase) => {
        if (selectedJourneyRef.current !== ownerJourneyId) return;
        const labels: Record<string, string> = {
          reserving_generation: "Reserving next generation…",
          creating_pi_session: "Creating native Pi session…",
          creating_mirror_conversation: "Creating Mirror conversation…",
          activating_journey_context: "Activating Journey context…",
          verifying_replacement: "Verifying replacement authority…",
          switching_generation: "Switching active generation…",
        };
        setJourneyReloadStatus(labels[phase] ?? "Restarting conversation…");
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
      setJourneyComposerDraft(ownerJourneyId, "");
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

  function resumeBlockingTurnRecovery() {
    if (!blockingTurnJournalRecord || selectedRuntimeBusy) return;
    setTurnRecoveryBusy(true);
    setTurnRecoveryError(undefined);
    setConversationLoaded(false);
    setJourneyReloadStatus("Trying to restore the previous response…");
    setTurnRecoveryAttempt((attempt) => attempt + 1);
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
        const interruptedConversation = interruptDedicatedTurn(
          currentConversation,
          interruptedRecord.authority.turnId,
          "turn_interrupted_after_native_inactivity",
          new Date().toISOString(),
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
        findBlockingTurnJournalRecord(journal, ownerJourneyId, activeGeneration),
      );
      setTurnRecoveryNotice("The previous unfinished attempt was discarded. You can send your message again.");
      setJourneyReloadStatus(undefined);
    } catch {
      if (selectedJourneyRef.current !== ownerJourneyId) return;
      setTurnRecoveryError("Mirror couldn’t discard the previous attempt safely. Your data is preserved.");
    } finally {
      if (selectedJourneyRef.current === ownerJourneyId) setTurnRecoveryBusy(false);
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

  function selectJourney(journeyId: string, intent: JourneyNavigationIntent = "pointer") {
    journeyId = resolveJourneySelection(selectedJourney, journeyId, intent);
    if (journeyId === selectedJourney) return;

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

  async function handleChatLocalPath(path: string) {
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
  }

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
  const runtimeBindingDraft: RuntimeBinding | undefined = runtimeChannel && runtimeMirrorRoot && runtimeMirrorHome && runtimeMirrorUser
    ? {
        schemaVersion: "1.0.0",
        channel: runtimeChannel.channel,
        mirrorRoot: runtimeMirrorRoot,
        mirrorHome: runtimeMirrorHome,
        mirrorUser: runtimeMirrorUser,
        dbPath: `${runtimeMirrorHome.replace(/\/$/, "")}/memory.db`,
      }
    : undefined;

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
      setRuntimeBindingFeedback(persist
        ? "Binding saved. Mirror and Pi actions are now available for this channel."
        : "Binding validated. Save it to activate this channel across restarts.");
    } catch (error) {
      setRuntimeChannelError(error instanceof Error ? error.message : String(error));
    } finally {
      setRuntimeBindingState("idle");
    }
  }

  const journeyRegistryImportCommand = developmentChannel ? "npm run import:mirror:dev" : "npm run import:mirror";

  return (
    <main
      className={`app-shell altitude-${presentedAltitude} channel-${runtimeChannel?.channel ?? "checking"} ${sidebarCompact ? "sidebar-compact" : ""} ${isJourneyReloading ? "is-busy" : ""}`}
      data-runtime-channel={runtimeChannel?.channel}
      data-application-theme={applicationTheme}
    >
      <aside className="journey-sidebar" aria-label="Journeys">
        <div className="brand-block">
          <span className="brand-mark-wrap" aria-hidden="true">
            <img className="brand-mark" src={appIconUrl} alt="" />
            {developmentChannel ? <span className="brand-channel-badge">DEV</span> : null}
          </span>
          <div className="brand-copy">
            <strong>Mirror Desktop {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : null}</strong>
            <small>{PRODUCT_DESCRIPTOR}</small>
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
                  <strong>No Journey registry loaded</strong>
                  <small>Run <code>{journeyRegistryImportCommand}</code> and restart this channel to read its local Journey registry from user disk.</small>
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
            return (
              <div
                key={journey.id}
                className={`journey-item ${journeyListOrder === "tree" ? "tree-node" : "card-node"} ${journey.depth > 0 ? "is-nested" : "is-root"} accent-${visual.accent} ${journey.id === selectedJourney ? "selected" : ""} ${runtimeOwnerPhase ? `has-runtime runtime-${runtimeOwnerPhase}` : ""}`}
                style={{ "--journey-depth": journeyListOrder === "tree" ? journey.depth : 0 } as CSSProperties & Record<"--journey-depth", number>}
                role="button"
                tabIndex={0}
                aria-label={`${journey.name}${runtimeOwnerPhase ? `, ${runtimeOwnerPhase === "running" ? "Working" : "Recording"}` : ""}`}
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
              </div>
            );
          })}
        </div>
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
                <div>
                  <p className="eyebrow">Active journey</p>
                  <h1>{selectedJourneyItem.name}</h1>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className={`menu-button conversation-shortcut ${operationalChatSelected ? "selected" : ""}`}
                  type="button"
                  onClick={showConversation}
                  disabled={altitudeSwitchDisabled}
                  aria-label="Go to conversation"
                  aria-current={operationalChatSelected ? "location" : undefined}
                  title="Conversation"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 5.75h14v9.5H9.25L5 18.5V5.75Z" />
                  </svg>
                </button>
                <div className="journey-menu-wrap" ref={journeyMenuRef}>
                  <button
                    className="menu-button"
                    type="button"
                    onClick={() => setJourneyMenuOpen((open) => !open)}
                    disabled={journeyThreadState.kind !== "ready"}
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
                        Restart Conversation…
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

        {operationalChatSelected && journeyThreadState.kind !== "ready" ? (
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
          hidden={!operationalChatSelected || journeyThreadState.kind !== "ready"}
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
          {messages.length === 0 && journeyThreadState.kind === "ready" ? (
            <JourneyArrivalSurface
              journeyName={selectedJourneyItem.name}
              stage={selectedJourneyItem.stage}
              onChoose={(text) => setJourneyComposerDraft(selectedJourney, text)}
            />
          ) : null}
          <ImportedActivity events={importedActivity.unlinked} variant="summary" basePath={selectedJourneyBasePath} />
          {messages.map((message) => {
            const contentWithoutSurfaces = stripMirrorSurfaceBlocks(message.content);
            const renderedContent = stripMirrorModeBlocks(contentWithoutSurfaces);
            const renderTimeActivity = [
              ...extractMirrorSurfaceEventsFromContent({
                content: message.content,
                messageId: message.id,
                createdAt: message.createdAt,
              }),
              ...extractMirrorModeEventsFromContent({
                content: contentWithoutSurfaces,
                messageId: message.id,
                createdAt: message.createdAt,
              }),
            ];
            const messageActivity = mergeImportedActivityEvents(importedActivity.byMessageId.get(message.id) ?? [], renderTimeActivity);

            const speaker = inferMessageSpeaker({ ...message, content: renderedContent });
            const bodyContent = stripMessageSpeakerSignature(renderedContent);
            const isRuntimeMessage = runtimeProjectionMessageId === message.id;
            const hasRuntimeActivity = isRuntimeMessage && hasRuntimeProjectionContent(runtimeProjection);

            return (
              <div key={message.id} className="message-cluster">
                {bodyContent || hasRuntimeActivity ? (
                  <article className={`message ${message.role} speaker-${speaker.kind}`}>
                    <div className="message-speaker-row">
                      <MessageSpeakerAvatar speakerKind={speaker.kind} fallback={speaker.avatar} userAvatar={userAvatar} />
                      <span className="message-role">{speaker.label}</span>
                      {bodyContent ? <MessageCopyAction body={bodyContent} /> : null}
                    </div>
                    {hasRuntimeActivity ? (
                      <LiveRuntimeActivity
                        projection={runtimeProjection}
                        basePath={selectedJourneyBasePath}
                        suppressedSurfaceContents={messageActivity
                          .filter((event) => event.kind === "ariad_surface" && event.content)
                          .map((event) => event.content as string)}
                      />
                    ) : null}
                    {bodyContent ? (
                      isRuntimeMessage ? (
                        <div className="runtime-answer">
                          <span className="runtime-region-label">Assistant answer</span>
                          <MessageContent content={bodyContent} basePath={selectedJourneyBasePath} onLocalPathClick={(path) => void handleChatLocalPath(path)} />
                        </div>
                      ) : (
                        <MessageContent content={bodyContent} basePath={selectedJourneyBasePath} onLocalPathClick={(path) => void handleChatLocalPath(path)} />
                      )
                    ) : null}
                    <MessageFileAttachments attachments={message.attachments} />
                    <MessageAttachmentProvenance attachments={message.attachments} />
                  </article>
                ) : null}
                <ImportedActivity events={messageActivity} basePath={selectedJourneyBasePath} />
              </div>
            );
          })}

          <div ref={chatEndRef} className="chat-scroll-anchor" aria-hidden="true" />
        </section>

        <section
          className="composer"
          aria-label="Message composer"
          hidden={!operationalChatSelected || journeyThreadState.kind !== "ready"}
        >
          <ComposerRuntimeStatus status={composerTurnStatus} />
          {!runtimeBindingReady ? <p className="provider-error" role="status">Connect and validate a Mirror installation in Runtime Settings before starting Mirror or Pi actions.</p> : null}
          {localReferenceError ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>File could not be opened</strong>
              <p>{localReferenceError}</p>
            </section>
          ) : null}
          {!selectedRuntimeBusy && streamWarnings.length > 0 ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Message was not sent</strong>
              <p>{streamWarnings.at(-1)}</p>
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
          {blockingTurnJournalRecord && !isStreaming ? (
            <section className="dedicated-turn-notice" role="alert">
              {turnRecoveryBusy ? (
                <><strong>Preparing your conversation…</strong><p>Mirror is safely checking the previous attempt.</p></>
              ) : blockingOpeningRecovery === "wait_for_agent" ? (
                <><strong>The agent is still finishing the previous message</strong><p>Your conversation will become available when it finishes.</p></>
              ) : (
                <>
                  <strong>We couldn’t restore the previous response</strong>
                  <p>Your data is preserved. Try restoring it again before deciding whether to discard that response.</p>
                  <div className="provider-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={resumeBlockingTurnRecovery}
                      disabled={selectedRuntimeBusy || piInvocationOccupancy.status !== "known"}
                    >
                      Try again
                    </button>
                    {previousResponseCanBeDiscarded ? (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void markBlockingTurnInterrupted()}
                        disabled={selectedRuntimeBusy || piInvocationOccupancy.status !== "known"}
                      >
                        Discard previous response
                      </button>
                    ) : null}
                  </div>
                </>
              )}
              {turnRecoveryError ? <p className="provider-error">{turnRecoveryError}</p> : null}
            </section>
          ) : turnRecoveryError && !isStreaming ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>We couldn’t prepare this conversation</strong>
              <p>{turnRecoveryError}</p>
            </section>
          ) : null}
          {reconciliationBlocksInvocation && !pendingMirrorRepair && !isStreaming ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Recording the completed turn</strong>
              <p>The durable turn journal, not this projection, decides whether a successor can start.</p>
            </section>
          ) : null}
          {piInvocationOccupancy.status !== "known" ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Checking native operation occupancy</strong>
              <p>{piInvocationOccupancy.diagnostic ?? "Operational actions remain blocked until bounded native inspection completes."}</p>
            </section>
          ) : null}
          {piInvocationPresentation.reason === "global_capacity_reached" && !selectedRuntimeBusy ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Global Pi capacity occupied</strong>
              <p>You can keep drafting. Native admission remains the atomic capacity authority and retains a rejected message for retry.</p>
            </section>
          ) : null}
          {durableInterruptedTurn && !isStreaming ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Previous turn was interrupted</strong>
              <p>The durable journal retained the interruption without inventing a response. Your next message can start a new turn.</p>
            </section>
          ) : null}
          {retainedLeaseWithoutRecovery ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Native Journey lease retained</strong>
              <p>Operational actions remain blocked because persisted evidence does not authorize cleanup or recovery for this exact run.</p>
            </section>
          ) : null}
          {legacyMirrorGap && !isStreaming ? <LegacyMirrorGapNotice /> : null}
          {pendingMirrorRepair && !legacyMirrorGap && !isStreaming ? (
            <ConversationSyncNotice
              retrying={isRetryingMirrorCommit}
              error={mirrorCommitError ?? pendingMirrorRepair.failureCode}
              onRetry={() => void retryPendingMirrorCommit()}
            />
          ) : null}
          {isFinalizingTurn ? <p className="turn-finalization-status" aria-live="polite">Recording the completed turn… You can draft the next message now.</p> : null}
          {fileAttachmentError ? <p className="context-attachment-error" role="alert">{fileAttachmentError}</p> : null}
          <PendingFileAttachments
            attachments={pendingFileAttachments}
            disabled={runtimeBusy || fileAttachmentBusy}
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
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (shouldSubmitJourneyDraft(event, navigationPresentation, selectedInvocationAdmissionBlocked)) {
                    void generatePacket("live");
                  }
                }
              }}
              placeholder={composerPlaceholder({
                requiresConversationRestore: isJourneyReloading
                  || Boolean(pendingMirrorRepair)
                  || Boolean(retainedLeaseWithoutRecovery)
                  || legacyMirrorGap,
                isRecordingTurn: isFinalizingTurn || reconciliationBlocksInvocation,
                isAgentResponding: isStreaming || agentRun.status === "running",
                hasUserMessage: messages.some((message) => message.role === "user"),
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
                  disabled={runtimeBusy || isJourneyReloading || fileAttachmentBusy}
                  aria-label="Anexar arquivos"
                  title="Anexar arquivos"
                >
                  📎
                </button>
                {navigationPresentation.cancelVisible ? (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => void cancelActiveRun()}
                    aria-label="Cancel run"
                    title="Cancel run"
                  >
                    ✕
                  </button>
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


      {restartConfirmationOpen && journeyThreadState.kind === "ready" ? (
        <div className="settings-backdrop" role="presentation" onClick={() => !isJourneyReloading && setRestartConfirmationOpen(false)}>
          <section
            className="settings-window restart-conversation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm conversation restart"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">Fresh context boundary</p>
                <h2>Restart conversation?</h2>
                <p className="settings-intro">
                  Mirror Desktop will create Generation {journeyThreadState.activeGeneration.generation + 1} with a new Pi session and Mirror conversation.
                  Generation {journeyThreadState.activeGeneration.generation} and its transcript will remain preserved and read-only.
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
                {isJourneyReloading ? "Restarting…" : "Restart conversation"}
              </button>
              <button className="secondary-button" type="button" onClick={() => setRestartConfirmationOpen(false)} disabled={isJourneyReloading}>
                Cancel
              </button>
            </div>
          </section>
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
                  {modelOptions.map((model) => (
                    <option key={modelOptionValue(model)} value={modelOptionValue(model)}>{model.provider} / {model.model}</option>
                  ))}
                </select>
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
              <h3>Runtime channel {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : null}</h3>
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
                <label className="provider-field">Mirror user<input value={runtimeMirrorUser} onChange={(event) => setRuntimeMirrorUser(event.target.value)} placeholder="user-slug" /></label>
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
              <label className="provider-field">Command<input value={providerCommand} onChange={(event) => setProviderCommand(event.target.value)} disabled={providerSafeTestMode} /></label>
              <label className="provider-field">Arguments<input value={providerArgsText} onChange={(event) => setProviderArgsText(event.target.value)} disabled={providerSafeTestMode} /></label>
              <label className="provider-check"><input type="checkbox" checked={providerUseStdin} onChange={(event) => setProviderUseStdin(event.target.checked)} disabled={providerSafeTestMode} />Send prompt through stdin</label>
              <label className="provider-check"><input type="checkbox" checked={providerSafeTestMode} onChange={(event) => setProviderSafeTestMode(event.target.checked)} />Safe test mode (cat)</label>
              {providerErrors.length > 0 ? <p className="provider-error">{providerErrors.join(" ")}</p> : null}
              <div className="provider-actions">
                <button type="button" onClick={applyProviderConfiguration} disabled={runtimeBusy}>Apply for this session</button>
                <button className="secondary-button" type="button" onClick={resetProviderConfiguration} disabled={runtimeBusy}>Reset session controls</button>
              </div>
              <p className="provider-note">Command, arguments, stdin and test mode are never persisted. Effective model and thinking flags replace conflicting raw arguments.</p>
                </section>
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
                  {modelOptions.map((model) => (
                    <option key={modelOptionValue(model)} value={modelOptionValue(model)}>{model.provider} / {model.model}</option>
                  ))}
                </select>
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
