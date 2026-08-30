import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { mockPiAgentStream, reduceStreamedAssistantMessage, type AgentStreamEvent, type AgentStreamProvider, type TurnCorrelation } from "../agent/agentStream";
import {
  cancelLivePiInvocation,
  livePiAgentStream,
  readJourneyPiContextStats,
} from "../agent/piProcessStream";
import { normalizePiResponse, type NormalizedPiResponse } from "../agent/piResponseNormalizer";
import {
  cancelAgentRun,
  completeAgentRun,
  failAgentRun,
  initialAgentRunState,
  reduceAgentRunFromStreamEvent,
  startAgentRun,
} from "../agent/agentRun";
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
import { MessageCopyAction } from "./MessageCopyAction";
import { LiveRuntimeActivity } from "./LiveRuntimeActivity";
import { ComposerRuntimeFooter, ComposerRuntimeStatus } from "./ComposerRuntimeFooter";
import { deriveComposerTurnStatus } from "./composerTurnStatus";
import { nextConversationAutoFollow } from "./conversationAutoFollow";
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
import { loadJourneyProjections } from "./journeyProjectionStorage";
import {
  deriveLatestCertifiedModeTransition,
  extractCertifiedModeTransition,
  type CertifiedModeTransition,
} from "./mirrorModeState";
import {
  hasRuntimeProjectionContent,
  initialRuntimeProjectionState,
  mergeRuntimeContextUsage,
  reduceRuntimeProjection,
  type RuntimeProjectionState,
} from "./runtimeActivityModel";
import { inferMessageSpeaker, stripMessageSpeakerSignature, withCertifiedPersona } from "./conversationPresentation";
import {
  loadDedicatedJourneyConversation,
  saveDedicatedJourneyConversation,
} from "./journeyConversationStorage";
import { loadJourneyPreferences, saveJourneyPreferences } from "./journeyPreferenceStorage";
import { loadComposerDrafts, saveComposerDrafts } from "./composerDraftStorage";
import { listPiModels, loadAgentSettings, saveAgentSettings, type PiModelCatalogEntry } from "./agentSettingsStorage";
import { loadJourneyRegistry, refreshJourneyRegistry } from "./journeyRegistryStorage";
import { chooseProjectDirectory, mutateJourneyRegistry } from "./journeyMutationStorage";
import {
  createMissionExtractionPacket,
  createUserConversationMessage,
  grammarStateFromViewModel,
  type ConversationMessage,
  type MissionDraft,
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
  filterPinnedJourneys,
  findJourneyById,
  flattenJourneyRegistry,
  markJourneyRecent,
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
import { createRunAuthority } from "../domain/runAuthority";
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
import {
  addFileAttachments,
  MAX_FILE_ATTACHMENTS,
  removeFileAttachment,
  toAgentFileReferences,
  type FileAttachment,
  type FileAttachmentResponse,
} from "../domain/fileAttachments";
import appIconUrl from "../../src-tauri/icons/icon.svg";
import devAppIconUrl from "../../src-tauri/icons/dev/icon.svg";
import { inspectRuntimeChannel, type RuntimeChannelDiagnostic } from "./runtimeChannelStorage";
import { JourneyTreeIcon } from "./JourneyTreeIcon";

type AppProps = {
  model: NautilusViewModel;
};

const DEVELOPMENT_BADGE_LABEL = "DEV LAB";

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
  const [journeyPreferences, setJourneyPreferences] = useState<JourneyPreferences>({
    pinnedJourneyIds: defaultJourneyPreferenceState.pinnedJourneyIds,
    activeJourneyId: defaultJourneyPreferenceState.activeJourneyId,
    recentJourneyIds: defaultJourneyPreferenceState.recentJourneyIds,
  });
  const [journeySearch, setJourneySearch] = useState("");
  const [journeyListOrder, setJourneyListOrder] = useState<JourneyListOrder>(defaultJourneyPreferenceState.journeyListOrder);
  const [collapsedJourneyIds, setCollapsedJourneyIds] = useState<Set<string>>(() => new Set());
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [journeyTreeMenuOpen, setJourneyTreeMenuOpen] = useState(false);
  const [journeyRegistryRefreshState, setJourneyRegistryRefreshState] = useState<"idle" | "refreshing" | "succeeded" | "failed">("idle");
  const [journeyRegistryRefreshMessage, setJourneyRegistryRefreshMessage] = useState<string | undefined>();
  const [journeyItemMenu, setJourneyItemMenu] = useState<{ journeyId: string; x: number; y: number } | null>(null);
  const [journeyAdminDialog, setJourneyAdminDialog] = useState<{ mode: "create" | "path" | "move" | "delete"; journeyId?: string; parentId?: string } | null>(null);
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFinalizingTurn, setIsFinalizingTurn] = useState(false);
  const [streamMissionDraft, setStreamMissionDraft] = useState<MissionDraft | undefined>();
  const [streamWarnings, setStreamWarnings] = useState<string[]>([]);
  const [streamDiagnostics, setStreamDiagnostics] = useState<string[]>([]);
  const [streamSafety, setStreamSafety] = useState<NormalizedPiResponse["safety"]>();
  const [streamMode, setStreamMode] = useState<"mock" | "live" | undefined>();
  const [runtimeProjection, setRuntimeProjection] = useState<RuntimeProjectionState>(initialRuntimeProjectionState);
  const [runtimeProjectionMessageId, setRuntimeProjectionMessageId] = useState<string | undefined>();
  const [piContextState, setPiContextState] = useState<"checking" | "waiting" | "available" | "not_initialized">("checking");
  const [isRetryingMirrorCommit, setIsRetryingMirrorCommit] = useState(false);
  const [mirrorCommitError, setMirrorCommitError] = useState<string | undefined>();
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
  const [runtimeChannel, setRuntimeChannel] = useState<RuntimeChannelDiagnostic>();
  const [runtimeChannelError, setRuntimeChannelError] = useState<string>();
  const [journeyMenuOpen, setJourneyMenuOpen] = useState(false);
  const [agentRun, setAgentRun] = useState(initialAgentRunState);
  const [agentRunJourneyId, setAgentRunJourneyId] = useState<string>();
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [journeyThreadState, setJourneyThreadState] = useState<JourneyThreadDisplayState>({ kind: "loading" });
  const [startingJourneyId, setStartingJourneyId] = useState<string | undefined>();
  const [journeyStartPhase, setJourneyStartPhase] = useState<string | undefined>();
  const [journeyStartError, setJourneyStartError] = useState<string | undefined>();
  const [journeyReloadStatus, setJourneyReloadStatus] = useState<string | undefined>();
  const [isJourneyReloading, setIsJourneyReloading] = useState(false);
  const [restartConfirmationOpen, setRestartConfirmationOpen] = useState(false);
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
  const checkedMirrorTurnRef = useRef<Set<string>>(new Set());
  const conversationRef = useRef<JourneyConversation>(conversation);
  const selectedJourneyRef = useRef(selectedJourney);
  conversationRef.current = conversation;
  selectedJourneyRef.current = selectedJourney;

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
    return pinnedOnly ? filterPinnedJourneys(orderedJourneys) : orderedJourneys;
  }, [collapsedJourneyIds, journeyListOrder, journeySearch, pinnedOnly, searchResults, sidebarJourneys]);
  const selectedJourneyItem = findJourneyById(journeyRegistry, selectedJourney) ??
    sidebarJourneys[0] ?? {
      id: selectedJourney,
      name: selectedJourney,
      breadcrumb: [selectedJourney],
      depth: 0,
    };
  const selectedJourneyVisual = journeyVisual(selectedJourneyItem.id);
  const selectedJourneyBasePath = selectedJourneyItem.projectPath;
  const messages = conversation.messages;
  const importedActivity = useMemo(
    () => groupImportedActivityByMessage(conversation.importedActivity?.events ?? []),
    [conversation.importedActivity?.events],
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
  const pendingMirrorOutboxItem = mirrorOutboxItems.find((item) => item.itemId === pendingMirrorRepair?.correlation.turnId);
  const pendingMirrorDisposition = pendingMirrorRepair
    ? classifyPendingMirrorAppend(
        classifyMirrorAppendMessagePair(conversation, pendingMirrorRepair.correlation),
        Boolean(pendingMirrorOutboxItem),
      )
    : undefined;
  const legacyMirrorGap = pendingMirrorDisposition === "legacy_gap";
  const dedicatedThreadReady = journeyThreadState.kind === "ready";
  const dedicatedTurnState = classifyDedicatedTurnState(conversation, isStreaming || agentRun.status === "running");
  const mirrorAppendNeedsEnqueue = pendingMirrorDisposition === "enqueue_required";
  const reconciliationBlocksInvocation = mirrorAppendNeedsEnqueue || (dedicatedThreadReady
    ? dedicatedTurnBlocksNewInvocation(dedicatedTurnState)
    : conversation.reconciliation.classification !== "in_sync");
  const composerTurnStatus = deriveComposerTurnStatus({
    agentRunStatus: agentRun.status,
    runBelongsToSelectedJourney: agentRunJourneyId === selectedJourney,
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
  const altitudeSwitchDisabled = isStreaming || agentRun.status === "running" || isJourneyReloading || projectionLoadStatus === "loading";
  const operationalChatSelected = selectedAltitude === "operational" && selectedOperationalSurface === "chat";

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
        setAgentSettingsMessage(stored ? "Agent defaults restored from this device." : "Using Harness agent defaults.");
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
    void inspectRuntimeChannel()
      .then((diagnostic) => {
        if (!cancelled) setRuntimeChannel(diagnostic);
      })
      .catch((error) => {
        if (!cancelled) setRuntimeChannelError(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
  }, []);

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
    setAgentRunJourneyId(undefined);
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
    setConversationLoaded(false);
    setJourneyThreadState({ kind: "loading" });
    setPiContextState("checking");

    async function restoreConversation() {
      let threadAuthorityLoaded = false;
      try {
        const dedicatedThread = await loadNautilusJourneyThread(selectedJourney);
        threadAuthorityLoaded = true;
        if (cancelled) return;
        const classified = classifyNautilusJourneyThread(dedicatedThread, selectedJourney);
        const persistedConversation = classified.kind === "ready"
          ? await loadDedicatedJourneyConversation(selectedJourney, classified.activeGeneration.generation)
          : undefined;
        if (cancelled) return;
        let restoredConversation = classified.kind === "ready"
          ? restoreDedicatedJourneyConversation(classified.thread, persistedConversation)
          : createJourneyConversation({ journeyId: selectedJourney, initialMessages });
        if (classified.kind === "ready" && classified.activeGeneration.piSessionFile) {
          const turns = await loadDedicatedPiTranscript(
            selectedJourney,
            classified.activeGeneration.piSessionId,
            classified.activeGeneration.piSessionFile,
          );
          if (cancelled) return;
          const latestNautilusTurn = [...restoredConversation.reconciliation.turns].reverse().find((turn) =>
            turn.origin === "nautilus" && turn.runId,
          );
          const pendingTurn = latestNautilusTurn?.pi.state === "pending" ? latestNautilusTurn : undefined;
          const stagedUser = [...restoredConversation.messages].reverse().find((message) => message.role === "user");
          const stagedAssistant = [...restoredConversation.messages].reverse().find((message) => message.role === "assistant");
          const nativeTurn = turns.at(-1);
          const nativeTurnMatchesPending = Boolean(
            pendingTurn
            && stagedUser
            && nativeTurn
            && nativeTurn.userText.trim() === stagedUser.content.trim()
            && Date.parse(nativeTurn.committedAt) >= Date.parse(pendingTurn.startedAt),
          );
          if (pendingTurn?.runId && stagedUser && stagedAssistant && nativeTurn && nativeTurnMatchesPending) {
            restoredConversation = replaceJourneyConversationMessages(restoredConversation,
              restoredConversation.messages.map((message) => message.id === stagedAssistant.id
                ? { ...message, content: nativeTurn.assistantText }
                : message),
            );
            const recoveryCorrelation = createDedicatedTurnAuthority(
              classified.thread,
              pendingTurn.runId,
              pendingTurn.turnId,
              stagedUser.id,
              stagedAssistant.id,
            );
            restoredConversation = applyPiExecutionEvidence(restoredConversation, recoveryCorrelation, {
              userEntryId: nativeTurn.userEntryId,
              assistantEntryId: nativeTurn.assistantEntryId,
              leafEntryId: nativeTurn.assistantEntryId,
              entryCount: nativeTurn.entryCount,
              sessionFile: classified.activeGeneration.piSessionFile,
              committedAt: new Date().toISOString(),
            });
            restoredConversation = commitHarnessTurn(restoredConversation, recoveryCorrelation, new Date().toISOString());
            await saveDedicatedJourneyConversation(restoredConversation);
          } else if (pendingTurn) {
            restoredConversation = interruptDedicatedTurn(
              restoredConversation,
              pendingTurn.turnId,
              "provider_interrupted",
              new Date().toISOString(),
            );
            restoredConversation = replaceJourneyConversationMessages(
              restoredConversation,
              restoredConversation.messages.filter((message) => message.id !== stagedAssistant?.id || message.content.trim().length > 0),
            );
            await saveDedicatedJourneyConversation(restoredConversation);
          } else if (!latestNautilusTurn) {
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
        conversationRef.current = restoredConversation;
        setConversation(restoredConversation);
        setJourneyThreadState(classified);
        setJourneyStartError(undefined);
      } catch {
        if (!cancelled) {
          setJourneyThreadState(threadAuthorityLoaded
            ? { kind: "unavailable", reason: "runtime_read_failed" }
            : { kind: "inconsistent", reasonCodes: ["invalid_record"] });
        }
      } finally {
        if (!cancelled) {
          setConversationLoaded(true);
        }
      }

    }

    void restoreConversation();

    return () => {
      cancelled = true;
    };
  }, [selectedJourney, registryLoaded, preferencesLoaded]);

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
    if (!conversationLoaded || isStreaming || effectiveProviderConfig.safeTestMode) {
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
    isStreaming,
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
    });
  }, [journeyPreferences, journeyListOrder, registryLoaded, preferencesLoaded]);

  useEffect(() => {
    if (!conversationLoaded || journeyThreadState.kind !== "ready" || isStreaming || isFinalizingTurn) return;
    void saveDedicatedJourneyConversation(conversation).catch((error) => {
      console.warn("Could not persist dedicated Journey projection.", error);
    });
  }, [conversation, conversationLoaded, isStreaming, isFinalizingTurn, journeyThreadState.kind]);

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
    if (!conversationLoaded || isStreaming || journeyThreadState.kind !== "ready") return;
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
      if (!cancelled) setMirrorCommitError(error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [conversation.journeyId, conversationLoaded, isStreaming, journeyThreadState.kind]);

  useEffect(() => {
    checkedMirrorTurnRef.current.clear();
    setMirrorOutboxItems([]);
    setMirrorCommitError(undefined);
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
        if (!disposed) setFileDropActive(active && journeyThreadState.kind === "ready" && !isStreaming && agentRun.status !== "running" && !isJourneyReloading);
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
  }, [journeyThreadState.kind, isStreaming, agentRun.status, isJourneyReloading]);

  function recordCertifiedModeTransition(transition: CertifiedModeTransition, sourceId: string) {
    setConversation((currentConversation) => {
      const mode = transition.kind === "activate" ? transition.mode : null;
      if (
        currentConversation.certifiedMirrorMode?.mode === mode
        && currentConversation.certifiedMirrorMode.sourceId === sourceId
      ) {
        return currentConversation;
      }
      return {
        ...currentConversation,
        certifiedMirrorMode: {
          mode,
          certifiedAt: new Date().toISOString(),
          sourceId,
        },
      };
    });
  }

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
    if (fileAttachmentBusy || isStreaming || agentRun.status === "running" || isJourneyReloading) return;
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
    if (journeyThreadState.kind !== "ready" || isStreaming || agentRun.status === "running" || isJourneyReloading) return;
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

  async function generatePacket(mode: "mock" | "live", retryContent?: string) {
    const content = (retryContent ?? draft).trim();
    if (!content || fileAttachmentError || journeyThreadState.kind !== "ready" || isStreaming || agentRun.status === "running" || reconciliationBlocksInvocation || (mode === "live" && (providerErrors.length > 0 || agentSettingsState !== "ready"))) {
      return;
    }

    let baseConversation = conversation;
    if (mode === "live") {
      baseConversation = conversationRef.current;
      const preflightBlocked = baseConversation.journeyId !== selectedJourney
        || journeyThreadState.kind !== "ready"
        || dedicatedTurnBlocksNewInvocation(classifyDedicatedTurnState(baseConversation));
      if (preflightBlocked) {
        setStreamWarnings((warnings) => [
          ...warnings,
          "Live invocation stopped because Journey conversation authority changed or is still being inspected. Reconcile the selected Journey and try again.",
        ]);
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
      setStreamWarnings((warnings) => [...warnings, `Live invocation stopped because run authority could not be built: ${error instanceof Error ? error.message : String(error)}`]);
      return;
    }
    const provider: AgentStreamProvider = mode === "mock"
      ? mockPiAgentStream
      : (packet) => runAuthority
        ? livePiAgentStream(packet, effectiveProviderConfig, runAuthority)
        : missingRunAuthorityStream();

    if (correlation) {
      try {
        await saveDedicatedJourneyConversation(stagedConversation);
      } catch (error) {
        setStreamWarnings((warnings) => [...warnings, error instanceof Error ? error.message : String(error)]);
        return;
      }
    }
    chatAutoFollowRef.current = nextConversationAutoFollow(
      chatAutoFollowRef.current,
      { type: "explicit_bottom" },
    );
    conversationRef.current = stagedConversation;
    setConversation(stagedConversation);
    setJourneyComposerDraft(baseConversation.journeyId, "");
    setPendingFileAttachments([]);
    setFileAttachmentMaxFiles(MAX_FILE_ATTACHMENTS);
    setFileAttachmentError(undefined);
    setIsStreaming(true);
    setAgentRunJourneyId(selectedJourney);
    setAgentRun(run);
    setJourneyPreferences((preferences) => markJourneyRecent(preferences, selectedJourney));
    setStreamMode(mode);
    setRuntimeProjection(initialRuntimeProjectionState);
    setRuntimeProjectionMessageId(assistantMessage.id);
    setStreamWarnings([]);
    setStreamDiagnostics([]);
    setStreamSafety(undefined);

    const conversationBeforeRun = baseConversation;
    let rawLiveOutput = "";
    let runReachedAgent = false;
    let runWasCancelled = false;
    let runFailed = false;
    const diagnostics: string[] = [];
    let streamedAssistantContent = "";

    try {
      for await (const event of provider(packet)) {
        setRuntimeProjection((currentProjection) => reduceRuntimeProjection(currentProjection, event));
        setAgentRun((currentRun) => reduceAgentRunFromStreamEvent(currentRun, event));
        if (event.type === "run_status" && event.status === "working") {
          runReachedAgent = true;
        }
        if (event.type === "context_usage") {
          setConversation((currentConversation) => {
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
          setConversation((currentConversation) =>
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
          if (transition) {
            recordCertifiedModeTransition(transition, assistantMessage.id);
          }
          setConversation((currentConversation) =>
            replaceJourneyConversationMessages(
              currentConversation,
              currentConversation.messages.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: reduceStreamedAssistantMessage(message.content, event) }
                  : message,
              ),
            ),
          );
        }
        if (event.type === "operation_update" && event.operation.output) {
          const transition = extractCertifiedModeTransition(event.operation.output);
          if (transition) {
            recordCertifiedModeTransition(transition, `runtime-${event.operation.id}`);
          }
        }
        if (event.type === "raw_output") {
          rawLiveOutput = `${rawLiveOutput}${event.content}`;
        }
        if (event.type === "diagnostic") {
          diagnostics.push(event.message);
          setStreamDiagnostics((currentDiagnostics) => [...currentDiagnostics, event.message]);
        }
        if (event.type === "grammar_update") {
          setStreamMissionDraft(event.update.missionDraft);
          setStreamWarnings(event.update.openQuestions);
        }
        if (event.type === "warning") {
          setStreamWarnings((warnings) => [...warnings, event.message]);
        }
        if (event.type === "cancelled") {
          runWasCancelled = true;
          setStreamWarnings((warnings) => [...warnings, event.message]);
        }
        if (event.type === "error") {
          runFailed = true;
          setStreamWarnings((warnings) => [...warnings, event.message]);
        }
        if (event.type === "done" && mode === "live" && !runWasCancelled && !runFailed && rawLiveOutput.trim().length > 0) {
          const normalized = normalizePiResponse(rawLiveOutput, diagnostics);
          setConversation((currentConversation) =>
            replaceJourneyConversationMessages(
              currentConversation,
              currentConversation.messages.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: normalized.assistantMessage } : message,
              ),
            ),
          );
          setStreamMissionDraft(normalized.missionDraft);
          setStreamWarnings(normalized.openQuestions);
          setStreamDiagnostics(normalized.diagnostics);
          setStreamSafety(normalized.safety);
        }
      }
      setAgentRun((currentRun) => completeAgentRun(currentRun));
    } catch (error) {
      runFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      setAgentRun((currentRun) => failAgentRun(currentRun, message));
      setRuntimeProjection((currentProjection) =>
        reduceRuntimeProjection(currentProjection, { type: "error", message }),
      );
      setStreamWarnings((warnings) => [...warnings, message]);
    } finally {
      setIsStreaming(false);
      if (runFailed && !runReachedAgent) {
        conversationRef.current = conversationBeforeRun;
        setConversation(conversationBeforeRun);
        if (correlation) {
          try {
            await saveDedicatedJourneyConversation(conversationBeforeRun);
          } catch (error) {
            setStreamWarnings((warnings) => [...warnings, error instanceof Error ? error.message : String(error)]);
          }
        }
      } else if (runWasCancelled || runFailed) {
        let interrupted = replaceJourneyConversationMessages(
          conversationRef.current,
          conversationRef.current.messages.filter(
            (message) => message.id !== assistantMessage.id || message.content.trim().length > 0,
          ),
        );
        if (correlation) {
          interrupted = interruptDedicatedTurn(
            interrupted,
            correlation.turnId,
            runWasCancelled ? "provider_cancelled" : "provider_failed",
            new Date().toISOString(),
          );
        }
        conversationRef.current = interrupted;
        setConversation(interrupted);
        if (correlation) {
          try {
            await saveDedicatedJourneyConversation(interrupted);
          } catch (error) {
            setStreamWarnings((warnings) => [...warnings, error instanceof Error ? error.message : String(error)]);
          }
        }
      } else if (correlation) {
        setIsFinalizingTurn(true);
        let settled = conversationRef.current;
        try {
          const sessionFile = settled.liveIdentity.piSessionFile;
          if (!sessionFile) throw new Error("Dedicated Pi session file is missing.");
          const nativeTurns = await loadDedicatedPiTranscript(
            settled.journeyId, settled.liveIdentity.piSessionId, sessionFile,
          );
          const nativeTurn = [...nativeTurns].reverse().find((turn) =>
            turn.userText.trim() === userMessage.content.trim()
            && Date.parse(turn.committedAt) >= Date.parse(userMessage.createdAt),
          );
          if (!nativeTurn) throw new Error("pi_native_evidence_missing");
          settled = applyPiExecutionEvidence(settled, correlation, {
            userEntryId: nativeTurn.userEntryId,
            assistantEntryId: nativeTurn.assistantEntryId,
            leafEntryId: nativeTurn.assistantEntryId,
            entryCount: nativeTurn.entryCount,
            sessionFile,
            committedAt: new Date().toISOString(),
          });
          settled = commitHarnessTurn(settled, correlation, new Date().toISOString());
          await saveDedicatedJourneyConversation(settled);
          const outboxItem = createMirrorAppendOutboxItem(settled, correlation);
          await enqueueMirrorAppendItem(outboxItem);
          const summary: MirrorAppendOutboxSummary = {
            schemaVersion: "1.0.0", itemId: outboxItem.itemId, journeyId: outboxItem.journeyId,
            threadId: outboxItem.threadId, generation: outboxItem.generation,
            conversationId: outboxItem.conversationId, createdAt: outboxItem.createdAt,
          };
          setMirrorOutboxItems((items) => items.some((item) => item.itemId === summary.itemId) ? items : [...items, summary]);
          const receipt = await appendMirrorOutboxItem(summary.itemId);
          settled = applyMirrorAppendReceipt(settled, correlation, receipt, new Date().toISOString());
          await saveDedicatedJourneyConversation(settled);
          await acknowledgeMirrorAppendItem(summary.itemId, summary.conversationId);
          setMirrorOutboxItems((items) => items.filter((item) => item.itemId !== summary.itemId));
          setMirrorCommitError(undefined);
          if (
            selectedJourneyRef.current === settled.journeyId
            && conversationRef.current.liveIdentity.generation === settled.liveIdentity.generation
          ) {
            conversationRef.current = settled;
            setConversation(settled);
          }
        } catch (error) {
          setMirrorCommitError(error instanceof Error ? error.message : String(error));
          conversationRef.current = settled;
          setConversation(settled);
        } finally {
          setIsFinalizingTurn(false);
        }
      }
    }
  }

  async function startSelectedJourney() {
    if (journeyThreadState.kind !== "absent" || startingJourneyId) return;
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

  async function retryMirrorAppendSummary(item: MirrorAppendOutboxSummary) {
    try {
      const projected = await loadDedicatedJourneyConversation(item.journeyId, item.generation);
      if (!projected) throw new Error("mirror_append_projection_missing");
      const repair = pendingMirrorTurnRepair(projected, item.itemId);
      if (!repair
        || projected.liveIdentity.mirrorConversationId !== item.conversationId) {
        throw new Error("mirror_append_projection_authority_mismatch");
      }
      const receipt = await appendMirrorOutboxItem(item.itemId);
      const settled = applyMirrorAppendReceipt(projected, repair.correlation, receipt, new Date().toISOString());
      await saveDedicatedJourneyConversation(settled);
      await acknowledgeMirrorAppendItem(item.itemId, item.conversationId);
      setMirrorOutboxItems((items) => items.filter((candidate) => candidate.itemId !== item.itemId));
      if (selectedJourneyRef.current === item.journeyId
        && conversationRef.current.liveIdentity.generation === item.generation) {
        conversationRef.current = settled;
        setConversation(settled);
      }
      setMirrorCommitError(undefined);
    } catch (error) {
      setMirrorCommitError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function retryPendingMirrorCommit() {
    if (!pendingMirrorRepair || isStreaming || isRetryingMirrorCommit) return;
    setIsRetryingMirrorCommit(true);
    setMirrorCommitError(undefined);
    try {
      let item = pendingMirrorOutboxItem;
      if (!item) {
        const outboxItem = createMirrorAppendOutboxItem(conversationRef.current, pendingMirrorRepair.correlation);
        await enqueueMirrorAppendItem(outboxItem);
        item = {
          schemaVersion: "1.0.0", itemId: outboxItem.itemId, journeyId: outboxItem.journeyId,
          threadId: outboxItem.threadId, generation: outboxItem.generation,
          conversationId: outboxItem.conversationId, createdAt: outboxItem.createdAt,
        };
        setMirrorOutboxItems((items) => items.some((candidate) => candidate.itemId === item!.itemId)
          ? items : [...items, item!]);
      }
      await retryMirrorAppendSummary(item);
      checkedMirrorTurnRef.current.add(item.itemId);
    } catch (error) {
      setMirrorCommitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRetryingMirrorCommit(false);
    }
  }

  async function cancelActiveRun() {
    if (agentRun.status !== "running" || streamMode !== "live") {
      return;
    }

    try {
      await cancelLivePiInvocation();
      const message = "Pi invocation cancelled.";
      setAgentRun((currentRun) => cancelAgentRun(currentRun));
      setRuntimeProjection((currentProjection) =>
        reduceRuntimeProjection(currentProjection, { type: "cancelled", message }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAgentRun((currentRun) => failAgentRun(currentRun, message));
      setRuntimeProjection((currentProjection) =>
        reduceRuntimeProjection(currentProjection, { type: "error", message }),
      );
      setStreamWarnings((warnings) => [...warnings, message]);
    }
  }

  function requestConversationRestart() {
    if (isStreaming || isJourneyReloading || journeyThreadState.kind !== "ready" || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)) return;
    setJourneyMenuOpen(false);
    setRestartConfirmationOpen(true);
    setJourneyReloadStatus(undefined);
  }

  async function confirmConversationRestart() {
    if (isStreaming || isJourneyReloading || journeyThreadState.kind !== "ready" || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)) return;
    const ownerJourneyId = selectedJourney;
    const previousGeneration = journeyThreadState.activeGeneration.generation;
    setIsJourneyReloading(true);
    setJourneyReloadStatus("Reserving next generation…");
    try {
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
      setStreamMissionDraft(undefined);
      setStreamWarnings([]);
      setStreamDiagnostics([]);
      setStreamSafety(undefined);
      setStreamMode(undefined);
      setRuntimeProjection(initialRuntimeProjectionState);
      setRuntimeProjectionMessageId(undefined);
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
    await persistAgentSettings(defaults, "Harness agent defaults restored.");
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

  function selectJourney(journeyId: string) {
    if (isStreaming || isFinalizingTurn || journeyId === selectedJourney) {
      return;
    }

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
    setStreamMissionDraft(undefined);
    setStreamWarnings([]);
    setStreamDiagnostics([]);
    setStreamSafety(undefined);
    setStreamMode(undefined);
    setRuntimeProjection(initialRuntimeProjectionState);
    setRuntimeProjectionMessageId(undefined);
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
    if (journeyRegistryRefreshState === "refreshing") return;
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

  function togglePinnedJourney(journeyId: string) {
    setJourneyPreferences((preferences) => ({
      ...preferences,
      pinnedJourneyIds: preferences.pinnedJourneyIds.includes(journeyId)
        ? preferences.pinnedJourneyIds.filter((id) => id !== journeyId)
        : [...preferences.pinnedJourneyIds, journeyId],
    }));
  }

  function openCreateJourney(parentId = "") {
    setJourneyAdminDialog({ mode: "create", parentId: parentId || undefined });
    setJourneyAdminName(""); setJourneyAdminSlug(""); setJourneyAdminDescription("");
    setJourneyAdminParent(parentId); setJourneyAdminPosition(appendJourneyPosition(journeyRegistry, parentId));
    setJourneyAdminPath(""); setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null);
    setJourneyTreeMenuOpen(false); setJourneyItemMenu(null);
  }

  function openJourneyPath(journeyId: string) {
    setJourneyAdminDialog({ mode: "path", journeyId });
    setJourneyAdminPath(findJourneyById(journeyRegistry, journeyId)?.projectPath ?? "");
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  function openMoveJourney(journeyId: string) {
    const journey = findJourneyById(journeyRegistry, journeyId);
    setJourneyAdminDialog({ mode: "move", journeyId });
    setJourneyAdminParent(journey?.parentId ?? ""); setJourneyAdminPosition(journey?.siblingPosition ?? 0);
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  function openDeleteJourney(journeyId: string) {
    const journey = findJourneyById(journeyRegistry, journeyId);
    if (!journey || (journey.children?.length ?? 0) > 0) return;
    setJourneyAdminDialog({ mode: "delete", journeyId });
    setJourneyAdminMessage(undefined); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null); setJourneyItemMenu(null);
  }

  async function executeJourneyMutation(operation: "create_journey" | "set_project_path" | "clear_project_path" | "move_journey" | "delete_journey", payload: Record<string, unknown>) {
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
      if (selectedAfterMutation !== selectedJourney) setSelectedJourney(selectedAfterMutation);
      setJourneyPreferences((current) => ({ ...current, activeJourneyId: selectedAfterMutation, pinnedJourneyIds: reconciled.pinnedJourneyIds, recentJourneyIds: reconciled.recentJourneyIds }));
      setCollapsedJourneyIds(reconciled.collapsedJourneyIds);
      setJourneyAdminDialog(null); setJourneyAdminState("idle"); setJourneyAdminPendingRequest(null);
      setJourneyRegistryRefreshState("succeeded"); setJourneyRegistryRefreshMessage("Journey structure updated from Mirror.");
    } catch (error) {
      const message = journeyAdministrationError(error);
      setJourneyAdminState("failed"); setJourneyAdminMessage(message);
      setJourneyRegistryRefreshState("failed"); setJourneyRegistryRefreshMessage(message);
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
    } else if (journeyAdminDialog.mode === "path") {
      await executeJourneyMutation(journeyAdminPath.trim() ? "set_project_path" : "clear_project_path", {
        journeyId: journeyAdminDialog.journeyId,
        ...(journeyAdminPath.trim() ? { projectPath: journeyAdminPath.trim() } : {}),
      });
    } else if (journeyAdminDialog.mode === "move") {
      await executeJourneyMutation("move_journey", { journeyId: journeyAdminDialog.journeyId, parentId: journeyAdminParent || null, position: journeyAdminPosition });
    } else {
      await executeJourneyMutation("delete_journey", { journeyId: journeyAdminDialog.journeyId });
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

  return (
    <main
      className={`app-shell altitude-${selectedAltitude} channel-${runtimeChannel?.channel ?? "checking"} ${isJourneyReloading ? "is-busy" : ""}`}
      data-runtime-channel={runtimeChannel?.channel}
    >
      <aside className="journey-sidebar" aria-label="Journeys">
        <div className="brand-block">
          <img className="brand-mark" src={developmentChannel ? devAppIconUrl : appIconUrl} alt="" aria-hidden="true" />
          <div>
            <strong>Nautilus {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : null}</strong>
            <small>{developmentChannel ? "Development cockpit" : "Journey cockpit"}</small>
          </div>
        </div>

        <input
          className="sidebar-search"
          type="search"
          value={journeySearch}
          onChange={(event) => setJourneySearch(event.target.value)}
          placeholder="Search journeys"
          aria-label="Search journeys"
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
          >
            Recent
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
          >
            Pinned
          </button>
          <button
            ref={journeyTreeButtonRef}
            className={!pinnedOnly && journeyListOrder === "tree" ? "selected" : ""}
            type="button"
            onClick={() => {
              setPinnedOnly(false);
              setJourneyListOrder("tree");
              setJourneyTreeMenuOpen(false);
            }}
            onContextMenu={(event) => openJourneyTreeMenu(event.currentTarget, event)}
            onKeyDown={(event) => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                openJourneyTreeMenu(event.currentTarget, event);
              }
            }}
            aria-pressed={!pinnedOnly && journeyListOrder === "tree"}
            aria-haspopup="menu"
            aria-expanded={journeyTreeMenuOpen}
          >
            Tree
          </button>
          {journeyTreeMenuOpen ? (
            <div className="journey-tree-context-menu" role="menu" ref={journeyTreeMenuRef} aria-label="Journey tree options">
              <button type="button" role="menuitem" onClick={() => openCreateJourney()}>
                <span aria-hidden="true">＋</span>
                Create Journey…
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={journeyRegistryRefreshState === "refreshing"}
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

        <div className={`journey-list ${journeyListOrder === "tree" ? "tree-mode" : "card-mode"}`}>
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
                  <small>Run npm run import:mirror and restart the desktop app to read the local Journey registry from user disk.</small>
                </>
              )}
            </div>
          ) : null}
          {visibleSidebarJourneys.map((journey) => {
            const visual = journeyVisual(journey.id);
            const hasChildren = (journey.children?.length ?? 0) > 0;
            const collapsed = collapsedJourneyIds.has(journey.id);
            return (
              <div
                key={journey.id}
                className={`journey-item ${journeyListOrder === "tree" ? "tree-node" : "card-node"} ${journey.depth > 0 ? "is-nested" : "is-root"} accent-${visual.accent} ${journey.id === selectedJourney ? "selected" : ""} ${isStreaming ? "disabled" : ""}`}
                style={{ "--journey-depth": journeyListOrder === "tree" ? journey.depth : 0 } as CSSProperties & Record<"--journey-depth", number>}
                role="button"
                tabIndex={isStreaming ? -1 : 0}
                aria-disabled={isStreaming}
                draggable={journeyListOrder === "tree" && !isStreaming}
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
                onContextMenu={journeyListOrder === "tree" ? (event) => {
                  event.preventDefault(); event.stopPropagation();
                  setJourneyItemMenu({ journeyId: journey.id, x: event.clientX, y: event.clientY });
                } : undefined}
                onClick={() => {
                  selectJourney(journey.id);
                  setJourneySearch("");
                }}
                onKeyDown={(event) => {
                  if (journeyListOrder === "tree" && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
                    event.preventDefault(); event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setJourneyItemMenu({ journeyId: journey.id, x: rect.left + 24, y: rect.top + 24 });
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectJourney(journey.id);
                    setJourneySearch("");
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
                      disabled={isStreaming}
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
                  <span className="journey-tree-icon"><JourneyTreeIcon /></span>
                ) : (
                  <span className="journey-icon">{visual.icon}</span>
                )}
                <span className="journey-copy">
                  <strong>{journey.name}</strong>
                  <small>{sidebarDescription(journey)}</small>
                </span>
                <button
                  className={`journey-pin ${journey.pinned ? "pinned" : ""}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePinnedJourney(journey.id);
                  }}
                  disabled={isStreaming}
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
          <div className="journey-item-context-menu" role="menu" aria-label="Journey options" style={{ left: journeyItemMenu.x, top: journeyItemMenu.y }}>
            <button type="button" role="menuitem" onClick={() => openCreateJourney(journeyItemMenu.journeyId)}>Create Journey…</button>
            <button type="button" role="menuitem" onClick={() => openJourneyPath(journeyItemMenu.journeyId)}>Assign project path…</button>
            <button type="button" role="menuitem" onClick={() => openMoveJourney(journeyItemMenu.journeyId)}>Move Journey…</button>
            <button
              className="danger-menu-item"
              type="button"
              role="menuitem"
              disabled={(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0}
              title={(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0 ? "Move or delete child Journeys first." : "Permanently delete this empty Journey."}
              onClick={() => openDeleteJourney(journeyItemMenu.journeyId)}
            >
              Delete Journey…
            </button>
            <button type="button" role="menuitem" onClick={() => setJourneyItemMenu(null)}>Cancel</button>
          </div>
        ) : null}
        <div className="sidebar-footer">
          <button
            className="sidebar-settings-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <span aria-hidden="true">⚙</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <section className="chat-shell" aria-label={`${selectedJourneyItem.name} agent chat`}>
        <header className={`chat-header accent-${selectedJourneyVisual.accent}`}>
          <div className="realization-header-copy">
            <div className="journey-title-row">
              <div className="active-journey-title">
                <span className="active-journey-icon" aria-hidden="true">{selectedJourneyVisual.icon}</span>
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
                        disabled={isStreaming || isJourneyReloading || dedicatedTurnBlocksNewInvocation(dedicatedTurnState)}
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
                value={selectedAltitude}
                onChange={setSelectedAltitude}
                disabled={altitudeSwitchDisabled}
              />
              {selectedAltitude === "operational" ? (
                <OperationalWorkspaceSwitcher
                  value={selectedOperationalSurface}
                  onChange={setSelectedOperationalSurface}
                  disabled={altitudeSwitchDisabled}
                />
              ) : null}
            </div>
          </div>
        </header>

        {selectedAltitude === "operational" && selectedOperationalSurface === "artifacts" ? (
          <JourneyDocumentationBrowser
            journeyId={selectedJourneyItem.id}
            journeyName={selectedJourneyItem.name}
          />
        ) : null}
        {selectedAltitude === "operational" && selectedOperationalSurface === "ariad" ? (
          <AriadOperationalObservatory
            journeyId={selectedJourneyItem.id}
            journeyName={selectedJourneyItem.name}
            projection={journeyProjections?.operational}
            loading={projectionLoadStatus === "loading"}
            errors={journeyProjections?.errors}
          />
        ) : null}
        {selectedAltitude === "tactical" ? (
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
        {selectedAltitude === "strategic" ? (
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
            onStart={journeyThreadState.kind === "absent" ? () => void startSelectedJourney() : undefined}
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
                      <span className="message-avatar" aria-hidden="true">{speaker.avatar}</span>
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
                          <MessageContent content={bodyContent} basePath={selectedJourneyBasePath} />
                        </div>
                      ) : (
                        <MessageContent content={bodyContent} basePath={selectedJourneyBasePath} />
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
          {agentSettingsState !== "ready" && agentSettingsState !== "saving" ? (
            <section className="dedicated-turn-notice" role="alert">
              <strong>Agent settings require attention</strong>
              <p>{agentSettingsMessage ?? "Agent settings are still being inspected."} Open Settings to restore a valid non-secret profile.</p>
            </section>
          ) : null}
          {reconciliationBlocksInvocation && !pendingMirrorRepair && !isStreaming ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Recording the completed turn</strong>
              <p>The next send becomes available after the completed response is durably recorded.</p>
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
            disabled={isStreaming || agentRun.status === "running" || fileAttachmentBusy}
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
                  void generatePacket("live");
                }
              }}
              placeholder={reconciliationBlocksInvocation
                ? "Draft your next message while the completed turn is recorded."
                : "Write a message to this journey agent."}
              disabled={isJourneyReloading || agentRun.status === "running"}
            />
            <div className="composer-input-footer">
              <ComposerRuntimeFooter
                contextUsage={authoritativeContextUsage}
                activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}
                contextState={piContextState}
                providerModel={providerModelLabel(effectiveProviderConfig)}
                onSelectProviderModel={() => openJourneyAgentProfileSelector()}
                providerSelectionDisabled={isStreaming || agentRun.status === "running" || agentSettingsState === "saving"}
              />
              <div className="composer-inline-actions">
                <button
                  className="icon-button context-attachment-button"
                  type="button"
                  onClick={() => void chooseFiles()}
                  disabled={isStreaming || agentRun.status === "running" || isJourneyReloading || fileAttachmentBusy}
                  aria-label="Anexar arquivos"
                  title="Anexar arquivos"
                >
                  📎
                </button>
                {agentRun.status === "running" && streamMode === "live" ? (
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
                    disabled={!draft.trim() || isStreaming || agentRun.status === "running" || reconciliationBlocksInvocation || providerErrors.length > 0 || agentSettingsState !== "ready" || Boolean(fileAttachmentError) || fileAttachmentBusy}
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
                  Nautilus will create Generation {journeyThreadState.activeGeneration.generation + 1} with a new Pi session and Mirror conversation.
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
                  <span><strong>Generation {item.generation}</strong><small>{item.piSessionName ?? "Dedicated Nautilus conversation"}</small></span>
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
                <p className="eyebrow">{journeyAdminDialog.mode === "create" ? "Journey details" : journeyAdminDialog.mode === "path" ? "Journey settings" : journeyAdminDialog.mode === "move" ? "Journey organization" : "Journey safety"}</p>
                <h2>{journeyAdminDialog.mode === "create" ? "Create Journey" : journeyAdminDialog.mode === "path" ? "Project path" : journeyAdminDialog.mode === "move" ? "Move Journey" : "Delete Journey"}</h2>
              </div>
              <button type="button" onClick={() => setJourneyAdminDialog(null)} disabled={journeyAdminState === "saving"}>×</button>
            </div>
            {journeyAdminDialog.mode === "create" ? (
              <>
                <label>Name<input value={journeyAdminName} onChange={(event) => {
                  const next = event.target.value;
                  if (!journeyAdminSlug || journeyAdminSlug === suggestJourneySlug(journeyAdminName)) setJourneyAdminSlug(suggestJourneySlug(next));
                  setJourneyAdminName(next);
                }} required maxLength={160} /></label>
                <label>Slug<input value={journeyAdminSlug} onChange={(event) => setJourneyAdminSlug(event.target.value)} required pattern="[a-z0-9][a-z0-9-]{1,78}[a-z0-9]" /></label>
                <label>Description<textarea value={journeyAdminDescription} onChange={(event) => setJourneyAdminDescription(event.target.value)} required minLength={20} maxLength={4000} /></label>
              </>
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
            {journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "path" ? (
              <label>Project path {journeyAdminDialog.mode === "create" ? "(optional)" : "(clear to remove)"}
                <span className="journey-path-picker"><input value={journeyAdminPath} onChange={(event) => setJourneyAdminPath(event.target.value)} placeholder="/absolute/path/to/project" /><button type="button" onClick={async () => { const path = await chooseProjectDirectory(); if (path) setJourneyAdminPath(path); }}>Choose…</button></span>
              </label>
            ) : null}
            <div className="journey-admin-summary">
              {journeyAdminDialog.mode === "create" ? `Create ${journeyAdminSlug || "this Journey"} under ${journeyAdminParent || "Root"}. It will be appended after the existing Journeys. No repository or conversation will be created.` :
                journeyAdminDialog.mode === "path" ? `Update only project_path for ${journeyAdminDialog.journeyId}.` :
                  journeyAdminDialog.mode === "move" ? `Move ${journeyAdminDialog.journeyId} under ${journeyAdminParent || "Root"} at position ${journeyAdminPosition}.` :
                    `Permanently delete ${findJourneyById(journeyRegistry, journeyAdminDialog.journeyId ?? "")?.name ?? journeyAdminDialog.journeyId}. Project files, repositories and protected history will not be deleted.${journeyAdminDialog.journeyId === selectedJourney ? ` The active Journey will change to ${findJourneyById(journeyRegistry, replacementJourneyAfterDeletion(journeyRegistry, journeyAdminDialog.journeyId ?? "") ?? "")?.name ?? "another Journey"}.` : ""}`}
            </div>
            {journeyAdminMessage ? <p className="settings-error" role="alert">{journeyAdminMessage}</p> : null}
            <div className="settings-actions">
              <button type="button" onClick={() => setJourneyAdminDialog(null)} disabled={journeyAdminState === "saving"}>Cancel</button>
              <button className={journeyAdminDialog.mode === "delete" ? "danger-button" : ""} type="submit" disabled={journeyAdminState === "saving"}>{journeyAdminState === "saving" ? "Verifying…" : journeyAdminDialog.mode === "delete" ? "Delete Journey" : "Confirm"}</button>
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
                <h2>Agent defaults</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </header>

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
                <button type="button" onClick={() => void saveGlobalAgentProfile()} disabled={isStreaming || agentSettingsState === "saving"}>Save global defaults</button>
                <button className="secondary-button" type="button" onClick={() => void restoreDefaultAgentSettings()} disabled={isStreaming || agentSettingsState === "saving"}>Restore Harness defaults</button>
              </div>
              <p className="provider-note">{piModelCatalogState === "loading" ? "Inspecting the local Pi model catalog…" : piModelCatalogState === "error" ? "Local Pi catalog unavailable; retained configured models remain selectable." : `${piModelCatalog.length} locally available Pi models.`}</p>
            </section>

            <section className="settings-section runtime-channel-card" aria-label="Runtime channel">
              <h3>Runtime channel {developmentChannel ? <span className="development-badge">{DEVELOPMENT_BADGE_LABEL}</span> : null}</h3>
              {runtimeChannel ? (
                <dl className="runtime-channel-diagnostic">
                  <div><dt>Channel</dt><dd>{runtimeChannel.channel}</dd></div>
                  <div><dt>Bundle</dt><dd>{runtimeChannel.bundleIdentifier}</dd></div>
                  <div><dt>App data</dt><dd>{runtimeChannel.appDataRoot}</dd></div>
                  <div><dt>Mirror code</dt><dd>{runtimeChannel.mirrorRoot}</dd></div>
                  <div><dt>Mirror home</dt><dd>{runtimeChannel.mirrorHome}</dd></div>
                  <div><dt>Mirror user</dt><dd>{runtimeChannel.mirrorUser}</dd></div>
                  <div><dt>Database</dt><dd>{runtimeChannel.dbPath}</dd></div>
                  <div><dt>Status</dt><dd>{runtimeChannel.status}</dd></div>
                </dl>
              ) : <p className="provider-note">{runtimeChannelError ?? "Inspecting the native runtime channel…"}</p>}
            </section>

            <section className="settings-section provider-card" aria-label="Current session invocation controls">
              <h3>Current session controls</h3>
              <label className="provider-field">Command<input value={providerCommand} onChange={(event) => setProviderCommand(event.target.value)} disabled={providerSafeTestMode} /></label>
              <label className="provider-field">Arguments<input value={providerArgsText} onChange={(event) => setProviderArgsText(event.target.value)} disabled={providerSafeTestMode} /></label>
              <label className="provider-check"><input type="checkbox" checked={providerUseStdin} onChange={(event) => setProviderUseStdin(event.target.checked)} disabled={providerSafeTestMode} />Send prompt through stdin</label>
              <label className="provider-check"><input type="checkbox" checked={providerSafeTestMode} onChange={(event) => setProviderSafeTestMode(event.target.checked)} />Safe test mode (cat)</label>
              {providerErrors.length > 0 ? <p className="provider-error">{providerErrors.join(" ")}</p> : null}
              <div className="provider-actions">
                <button type="button" onClick={applyProviderConfiguration} disabled={isStreaming}>Apply for this session</button>
                <button className="secondary-button" type="button" onClick={resetProviderConfiguration} disabled={isStreaming}>Reset session controls</button>
              </div>
              <p className="provider-note">Command, arguments, stdin and test mode are never persisted. Effective model and thinking flags replace conflicting raw arguments.</p>
            </section>
            {agentSettingsMessage ? <p className={agentSettingsState === "error" ? "settings-error" : "provider-note"} role={agentSettingsState === "error" ? "alert" : "status"}>{agentSettingsMessage}</p> : null}
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
                <button type="button" onClick={() => void saveSelectedJourneyAgentOverride()} disabled={isStreaming || agentSettingsState === "saving"}>Use model for this Journey</button>
                <button className="secondary-button" type="button" onClick={() => void resetSelectedJourneyAgentOverride()} disabled={isStreaming || agentSettingsState === "saving"}>Use global defaults</button>
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
