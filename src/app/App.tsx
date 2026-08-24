import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { mockPiAgentStream, reduceStreamedAssistantMessage, type AgentStreamProvider, type TurnCorrelation } from "../agent/agentStream";
import {
  cancelLivePiInvocation,
  hydrateJourneyPiSession,
  inspectExternalPiActivity,
  livePiAgentStream,
  readJourneyPiContextStats,
  readMirrorTurnCommitStatus,
  retryMirrorTurnCommit,
  restartJourneyPiSession,
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
  describeProviderMode,
  providerConfigToArgsText,
  providerModelLabel,
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
import { LiveRuntimeActivity } from "./LiveRuntimeActivity";
import { ComposerRuntimeFooter } from "./ComposerRuntimeFooter";
import { ConversationSyncNotice } from "./ConversationSyncNotice";
import { ExternalPiSyncNotice } from "./ExternalPiSyncNotice";
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
import { inferMessageSpeaker, stripMessageSpeakerSignature } from "./conversationPresentation";
import {
  listMirrorConversations,
  loadJourneyConversation,
  reloadJourneyFromMirror,
  saveJourneyConversation,
  generateMirrorConversationTitle,
  type MirrorConversationCandidate,
} from "./journeyConversationStorage";
import { loadJourneyPreferences, saveJourneyPreferences } from "./journeyPreferenceStorage";
import { loadJourneyRegistry } from "./journeyRegistryStorage";
import {
  createMissionExtractionPacket,
  createUserConversationMessage,
  grammarStateFromViewModel,
  type ConversationMessage,
  type MissionDraft,
} from "../agent/piTaskPacket";
import {
  createJourneyConversation,
  replaceJourneyConversationMessages,
  resetJourneyConversation,
} from "../domain/journeyConversation";
import {
  applyMirrorCommitEvent,
  applyMirrorTurnCommitStatus,
  commitHarnessTurn,
  createTurnCorrelation,
  pendingMirrorTurnRepair,
  stageCorrelatedTurn,
} from "../domain/threeBodyTurnCommit";
import {
  deriveOrderedSidebarJourneys,
  findJourneyById,
  flattenJourneyRegistry,
  markJourneyRecent,
  orderSearchResults,
  searchJourneyRegistry,
  type JourneyListOrder,
  type JourneyPreferences,
  type JourneyRegistry,
  type SidebarJourneyItem,
} from "../domain/journeyRegistry";
import {
  projectExternalPiInspection,
  type ExternalPiFileFingerprint,
} from "../domain/externalPiProjection";
import type { JourneyConversation } from "../domain/journeyConversation";
import {
  defaultJourneyPreferenceState,
  sanitizeJourneyPreferenceState,
  type JourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";
import type { NautilusViewModel } from "../domain/nautilusViewModel";
import appIconUrl from "../../src-tauri/icons/icon.svg";

type AppProps = {
  model: NautilusViewModel;
};

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

function situationLabel(hasMissionDraft: boolean, hasMission: boolean) {
  if (hasMissionDraft) {
    return "Emerging mission";
  }
  if (hasMission) {
    return "Mission formulated";
  }
  return "Journey in conversation";
}

function situationDescription(hasMissionDraft: boolean, hasMission: boolean) {
  if (hasMissionDraft) {
    return "The conversation is giving form to an intention of realization.";
  }
  if (hasMission) {
    return "The Journey already has an initial Mission to orient the conversation.";
  }
  return "The conversation is still recognizing the Journey field.";
}

export function App({ model }: AppProps) {
  const [selectedJourney, setSelectedJourney] = useState(defaultJourneyPreferenceState.activeJourneyId ?? "nautilus-harness");
  const [journeyPreferences, setJourneyPreferences] = useState<JourneyPreferences>({
    pinnedJourneyIds: defaultJourneyPreferenceState.pinnedJourneyIds,
    activeJourneyId: defaultJourneyPreferenceState.activeJourneyId,
    recentJourneyIds: defaultJourneyPreferenceState.recentJourneyIds,
  });
  const [journeySearch, setJourneySearch] = useState("");
  const [journeyListOrder, setJourneyListOrder] = useState<JourneyListOrder>(defaultJourneyPreferenceState.journeyListOrder);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState(() =>
    createJourneyConversation({ journeyId: selectedJourney, initialMessages }),
  );
  const [packetJson, setPacketJson] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMissionDraft, setStreamMissionDraft] = useState<MissionDraft | undefined>();
  const [streamWarnings, setStreamWarnings] = useState<string[]>([]);
  const [streamDiagnostics, setStreamDiagnostics] = useState<string[]>([]);
  const [streamSafety, setStreamSafety] = useState<NormalizedPiResponse["safety"]>();
  const [streamMode, setStreamMode] = useState<"mock" | "live" | undefined>();
  const [runtimeProjection, setRuntimeProjection] = useState<RuntimeProjectionState>(initialRuntimeProjectionState);
  const [runtimeProjectionMessageId, setRuntimeProjectionMessageId] = useState<string | undefined>();
  const [piContextState, setPiContextState] = useState<"checking" | "waiting" | "available" | "not_initialized">("checking");
  const [isInitializingPiContext, setIsInitializingPiContext] = useState(false);
  const [isRetryingMirrorCommit, setIsRetryingMirrorCommit] = useState(false);
  const [mirrorCommitError, setMirrorCommitError] = useState<string | undefined>();
  const [externalPiConflict, setExternalPiConflict] = useState<string | undefined>();
  const [providerConfig, setProviderConfig] = useState(defaultPiProviderConfig);
  const [providerCommand, setProviderCommand] = useState(defaultPiProviderConfig.command);
  const [providerArgsText, setProviderArgsText] = useState(providerConfigToArgsText(defaultPiProviderConfig));
  const [providerUseStdin, setProviderUseStdin] = useState(defaultPiProviderConfig.useStdin);
  const [providerSafeTestMode, setProviderSafeTestMode] = useState(defaultPiProviderConfig.safeTestMode);
  const [providerInvocationMode, setProviderInvocationMode] = useState<AgentInvocationMode>(defaultPiProviderConfig.invocationMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journeyMenuOpen, setJourneyMenuOpen] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [agentRun, setAgentRun] = useState(initialAgentRunState);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [journeyReloadStatus, setJourneyReloadStatus] = useState<string | undefined>();
  const [isJourneyReloading, setIsJourneyReloading] = useState(false);
  const [mirrorConversationPickerOpen, setMirrorConversationPickerOpen] = useState(false);
  const [mirrorConversationCandidates, setMirrorConversationCandidates] = useState<MirrorConversationCandidate[]>([]);
  const [selectedMirrorConversationId, setSelectedMirrorConversationId] = useState<string | undefined>();
  const [mirrorConversationPickerError, setMirrorConversationPickerError] = useState<string | undefined>();
  const [mirrorConversationPickerLoading, setMirrorConversationPickerLoading] = useState(false);
  const [generatingMirrorTitleId, setGeneratingMirrorTitleId] = useState<string | undefined>();
  const [mirrorConversationLoadCandidate, setMirrorConversationLoadCandidate] = useState<MirrorConversationCandidate | undefined>();
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [loadedJourneyRegistry, setLoadedJourneyRegistry] = useState<JourneyRegistry>(emptyJourneyRegistry);
  const chatStreamRef = useRef<HTMLElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const journeyMenuRef = useRef<HTMLDivElement | null>(null);
  const mirrorTitleGenerationInFlightRef = useRef(false);
  const checkedMirrorTurnRef = useRef<string | undefined>(undefined);
  const conversationRef = useRef<JourneyConversation>(conversation);
  const externalPiFingerprintRef = useRef(new Map<string, ExternalPiFileFingerprint>());
  const externalPiInFlightRef = useRef(new Set<string>());
  const externalPiRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const externalPiRuntimeRef = useRef({ conversationLoaded, isStreaming, agentRunStatus: agentRun.status, safeTestMode: providerConfig.safeTestMode });
  conversationRef.current = conversation;
  externalPiRuntimeRef.current = { conversationLoaded, isStreaming, agentRunStatus: agentRun.status, safeTestMode: providerConfig.safeTestMode };

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
  const visibleSidebarJourneys = journeySearch.trim() ? searchResults : sidebarJourneys;
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
  const providerErrors = useMemo(() => validateProviderConfig(providerConfig), [providerConfig]);
  const authoritativeContextStats = conversation.authoritativeContextStats;
  const contextIdentityMatches = authoritativeContextStats
    && authoritativeContextStats.piSessionId === conversation.liveIdentity.piSessionId
    && authoritativeContextStats.generation === conversation.liveIdentity.generation;
  const reportedContextUsage = contextIdentityMatches ? authoritativeContextStats.usage : undefined;
  const pendingMirrorRepair = useMemo(() => pendingMirrorTurnRepair(conversation), [conversation]);
  const configuredContextWindow = configuredModelContextWindow(providerConfig);
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
  const currentSituation = situationLabel(Boolean(streamMissionDraft), Boolean(model.mission));
  const currentSituationDescription = situationDescription(Boolean(streamMissionDraft), Boolean(model.mission));
  const currentMissionTitle = streamMissionDraft?.title ?? model.mission?.title ?? "No mission formulated yet";
  const currentDeliveryTitle = "No delivery formulated yet";
  const presentMapCounters = [
    { label: "Territory", value: 1 },
    { label: "Missions", value: streamMissionDraft || model.mission ? 1 : 0 },
    { label: "Deliveries", value: 0 },
    { label: "Evidence", value: 0 },
    { label: "Realizations", value: 0 },
  ];

  function scheduleExternalPiRefresh(delayMs = 200) {
    if (externalPiRefreshTimerRef.current) {
      clearTimeout(externalPiRefreshTimerRef.current);
    }
    externalPiRefreshTimerRef.current = setTimeout(() => {
      externalPiRefreshTimerRef.current = undefined;
      void refreshExternalPiActivity();
    }, delayMs);
  }

  async function refreshExternalPiActivity() {
    const runtime = externalPiRuntimeRef.current;
    const current = conversationRef.current;
    const checkpoint = current.reconciliation.checkpoints.pi;
    if (
      !runtime.conversationLoaded
      || runtime.isStreaming
      || runtime.agentRunStatus === "running"
      || runtime.safeTestMode
      || !checkpoint?.sessionFile
      || !current.reconciliation.checkpoints.harness
    ) return;

    const authorityKey = [
      current.journeyId,
      current.liveIdentity.piSessionId,
      current.liveIdentity.generation,
      checkpoint.sessionFile,
    ].join(":");
    if (externalPiInFlightRef.current.has(authorityKey)) return;
    externalPiInFlightRef.current.add(authorityKey);
    const requestedLeaf = checkpoint.leafEntryId;
    try {
      const inspection = await inspectExternalPiActivity(
        current,
        externalPiFingerprintRef.current.get(authorityKey),
      );
      if (!inspection) return;
      externalPiFingerprintRef.current.set(authorityKey, inspection.fingerprint);
      const latest = conversationRef.current;
      if (
        latest.journeyId !== current.journeyId
        || latest.liveIdentity.piSessionId !== current.liveIdentity.piSessionId
        || latest.liveIdentity.generation !== current.liveIdentity.generation
        || latest.reconciliation.checkpoints.pi?.leafEntryId !== requestedLeaf
      ) return;

      const result = projectExternalPiInspection(latest, inspection, new Date().toISOString());
      if (!result.changed) return;
      await saveJourneyConversation(result.conversation);
      const afterSave = conversationRef.current;
      if (
        afterSave.journeyId !== latest.journeyId
        || afterSave.liveIdentity.generation !== latest.liveIdentity.generation
        || afterSave.reconciliation.checkpoints.pi?.leafEntryId !== requestedLeaf
      ) return;
      setConversation((currentConversation) => {
        if (
          currentConversation.journeyId !== result.conversation.journeyId
          || currentConversation.liveIdentity.generation !== result.conversation.liveIdentity.generation
          || currentConversation.reconciliation.checkpoints.pi?.leafEntryId !== requestedLeaf
        ) return currentConversation;
        return {
          ...result.conversation,
          importedActivity: currentConversation.importedActivity,
          authoritativeContextStats: currentConversation.authoritativeContextStats,
          certifiedMirrorMode: currentConversation.certifiedMirrorMode,
        };
      });
      setExternalPiConflict(result.conflictCode);
    } catch (error) {
      console.warn("Could not refresh external Pi activity.", error);
      setExternalPiConflict("pi_session_unavailable");
    } finally {
      externalPiInFlightRef.current.delete(authorityKey);
    }
  }

  useEffect(() => {
    const onFocus = () => scheduleExternalPiRefresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleExternalPiRefresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (externalPiRefreshTimerRef.current) clearTimeout(externalPiRefreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (conversationLoaded) scheduleExternalPiRefresh(0);
  }, [conversation.id, conversation.liveIdentity.generation, conversationLoaded]);

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
    let cancelled = false;

    async function restoreJourneyRegistryAndPreferences() {
      let registry = emptyJourneyRegistry;
      let preferences: JourneyPreferenceState = defaultJourneyPreferenceState;
      try {
        const [loadedRegistry, loadedPreferences] = await Promise.all([loadJourneyRegistry(), loadJourneyPreferences()]);
        registry = loadedRegistry ?? emptyJourneyRegistry;
        preferences = loadedPreferences ? { ...defaultJourneyPreferenceState, ...loadedPreferences } : defaultJourneyPreferenceState;
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
      setJourneyPreferences({
        pinnedJourneyIds: sanitizedPreferences.pinnedJourneyIds,
        activeJourneyId: nextActiveJourney,
        recentJourneyIds: sanitizedPreferences.recentJourneyIds,
      });
      setJourneyListOrder(sanitizedPreferences.journeyListOrder);
      if (nextActiveJourney) {
        setSelectedJourney(nextActiveJourney);
      }
      setRegistryLoaded(true);
      setPreferencesLoaded(true);
    }

    void restoreJourneyRegistryAndPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!registryLoaded || !preferencesLoaded) {
      return;
    }

    let cancelled = false;
    setConversationLoaded(false);
    setPiContextState("checking");

    async function restoreConversation() {
      try {
        const persistedConversation = await loadJourneyConversation(selectedJourney);
        if (!cancelled) {
          setConversation(
            persistedConversation?.journeyId === selectedJourney
              ? persistedConversation
              : createJourneyConversation({ journeyId: selectedJourney, initialMessages }),
          );
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
    if (!conversationLoaded || isStreaming || providerConfig.safeTestMode) {
      return;
    }
    const providerModel = providerModelLabel(providerConfig);
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
        const importedConversation = conversation.liveIdentity.origin === "mirror_import"
          && Boolean(conversation.liveIdentity.mirrorConversationId);
        setPiContextState(inspection.status === "missing" && importedConversation ? "not_initialized" : "waiting");
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
    providerConfig,
  ]);

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
    if (!conversationLoaded || isStreaming) {
      return;
    }
    void saveJourneyConversation(conversation);
  }, [conversation, conversationLoaded, isStreaming]);

  useEffect(() => {
    if (!conversationLoaded || isStreaming || !pendingMirrorRepair) return;
    if (checkedMirrorTurnRef.current === pendingMirrorRepair.correlation.turnId) return;
    checkedMirrorTurnRef.current = pendingMirrorRepair.correlation.turnId;
    void readMirrorTurnCommitStatus(
      conversation.journeyId,
      pendingMirrorRepair.sessionFile,
      pendingMirrorRepair.correlation,
    ).then((status) => {
      if (status.status === "committed") {
        setConversation((currentConversation) => applyMirrorTurnCommitStatus(
          currentConversation,
          pendingMirrorRepair.correlation,
          status,
          new Date().toISOString(),
        ));
        setMirrorCommitError(undefined);
      }
    }).catch((error) => {
      setMirrorCommitError(error instanceof Error ? error.message : String(error));
    });
  }, [conversation.journeyId, conversationLoaded, isStreaming, pendingMirrorRepair]);

  useEffect(() => {
    checkedMirrorTurnRef.current = undefined;
    setMirrorCommitError(undefined);
    setExternalPiConflict(undefined);
  }, [selectedJourney]);

  useEffect(() => {
    const chatStream = chatStreamRef.current;
    const chatEnd = chatEndRef.current;
    if (!chatStream || !chatEnd) {
      return;
    }

    requestAnimationFrame(() => {
      chatEnd.scrollIntoView({ block: "end", behavior: isStreaming ? "auto" : "smooth" });
    });
  }, [messages, isStreaming, runtimeProjection]);

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

  async function initializeCurrentPiContext() {
    if (
      isInitializingPiContext
      || isStreaming
      || conversation.liveIdentity.origin !== "mirror_import"
      || !conversation.liveIdentity.mirrorConversationId
    ) {
      return;
    }

    setIsInitializingPiContext(true);
    setPiContextState("checking");
    try {
      await hydrateJourneyPiSession(
        conversation.journeyId,
        conversation.liveIdentity.piSessionId,
        providerConfig,
      );
      const inspection = await readJourneyPiContextStats(
        conversation.journeyId,
        conversation.liveIdentity.piSessionId,
      );
      const snapshot = inspection.snapshot;
      if (
        inspection.status !== "available"
        || !snapshot
        || snapshot.providerModel !== providerModelLabel(providerConfig)
      ) {
        setPiContextState("waiting");
        return;
      }
      setConversation((currentConversation) => ({
        ...currentConversation,
        authoritativeContextStats: {
          piSessionId: currentConversation.liveIdentity.piSessionId,
          generation: currentConversation.liveIdentity.generation,
          providerModel: snapshot.providerModel,
          capturedAt: new Date().toISOString(),
          usage: { tokens: snapshot.tokens, contextWindow: null, percent: null },
        },
      }));
      setPiContextState("available");
    } catch (error) {
      setPiContextState("not_initialized");
      const message = error instanceof Error ? error.message : String(error);
      setStreamWarnings((warnings) => [...warnings, message]);
    } finally {
      setIsInitializingPiContext(false);
    }
  }

  async function generatePacket(mode: "mock" | "live", retryContent?: string) {
    const content = (retryContent ?? draft).trim();
    if (!content || isStreaming || agentRun.status === "running" || (mode === "live" && providerErrors.length > 0)) {
      return;
    }

    const userMessage = createUserConversationMessage(content);
    const nextMessages = [...conversation.messages, userMessage];
    const packet = createMissionExtractionPacket({
      conversation: nextMessages,
      currentState,
      journeyId: selectedJourney,
      liveConversation: conversation.liveIdentity,
    });
    const assistantMessage: ConversationMessage = {
      id: `assistant-${new Date().toISOString()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    const run = startAgentRun({ content, mode });
    const correlation: TurnCorrelation | undefined = mode === "live" && run.id
      ? createTurnCorrelation({
          conversation,
          runId: run.id,
          turnId: `turn-${run.id}`,
          userMessageId: userMessage.id,
          assistantMessageId: assistantMessage.id,
        })
      : undefined;
    const stagedConversation = correlation
      ? stageCorrelatedTurn(conversation, correlation, userMessage, assistantMessage)
      : replaceJourneyConversationMessages(conversation, [...nextMessages, assistantMessage]);
    if (correlation) {
      try {
        await saveJourneyConversation(stagedConversation);
      } catch (error) {
        setStreamWarnings((warnings) => [...warnings, `Could not stage correlated turn: ${error instanceof Error ? error.message : String(error)}`]);
        return;
      }
    }
    const provider: AgentStreamProvider = mode === "mock"
      ? mockPiAgentStream
      : (packet) => livePiAgentStream(packet, providerConfig, correlation);

    setConversation(stagedConversation);
    setPacketJson(JSON.stringify(packet, null, 2));
    setDraft("");
    setIsStreaming(true);
    setAgentRun(run);
    setJourneyPreferences((preferences) => markJourneyRecent(preferences, selectedJourney));
    setStreamMode(mode);
    setRuntimeProjection(initialRuntimeProjectionState);
    setRuntimeProjectionMessageId(assistantMessage.id);
    setStreamWarnings([]);
    setStreamDiagnostics([]);
    setStreamSafety(undefined);

    const conversationBeforeRun = conversation;
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
              && currentStats.providerModel === providerModelLabel(providerConfig);
            return {
              ...currentConversation,
              authoritativeContextStats: {
                piSessionId: currentConversation.liveIdentity.piSessionId,
                generation: currentConversation.liveIdentity.generation,
                providerModel: providerModelLabel(providerConfig),
                capturedAt: new Date().toISOString(),
                usage: mergeRuntimeContextUsage(sameAuthority ? currentStats.usage : undefined, event.usage),
              },
            };
          });
        }
        if (event.type === "mirror_commit" && correlation) {
          setConversation((currentConversation) => applyMirrorCommitEvent(
            currentConversation,
            correlation,
            event.commit,
            new Date().toISOString(),
          ));
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
      if (runFailed && !runReachedAgent) {
        setConversation(conversationBeforeRun);
      } else if (runWasCancelled || runFailed) {
        setConversation((currentConversation) =>
          replaceJourneyConversationMessages(
            currentConversation,
            currentConversation.messages.filter(
              (message) => message.id !== assistantMessage.id || message.content.trim().length > 0,
            ),
          ),
        );
      } else if (correlation) {
        setConversation((currentConversation) => commitHarnessTurn(
          currentConversation,
          correlation,
          new Date().toISOString(),
        ));
      }
      setIsStreaming(false);
    }
  }

  async function retryPendingMirrorCommit() {
    if (!pendingMirrorRepair || isStreaming || isRetryingMirrorCommit) return;
    setIsRetryingMirrorCommit(true);
    setMirrorCommitError(undefined);
    try {
      const status = await retryMirrorTurnCommit(
        conversation.journeyId,
        pendingMirrorRepair.sessionFile,
        pendingMirrorRepair.correlation,
      );
      if (status.status !== "committed") {
        throw new Error("Mirror still reports an incomplete turn commit.");
      }
      setConversation((currentConversation) => applyMirrorTurnCommitStatus(
        currentConversation,
        pendingMirrorRepair.correlation,
        status,
        new Date().toISOString(),
      ));
      checkedMirrorTurnRef.current = pendingMirrorRepair.correlation.turnId;
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

  async function openMirrorConversationPicker() {
    if (isStreaming || isJourneyReloading) {
      return;
    }

    setJourneyMenuOpen(false);
    setMirrorConversationPickerOpen(true);
    setMirrorConversationPickerLoading(true);
    setMirrorConversationPickerError(undefined);
    setSelectedMirrorConversationId(undefined);
    try {
      const candidates = await listMirrorConversations(selectedJourney);
      setMirrorConversationCandidates(candidates);
      setSelectedMirrorConversationId(candidates[0]?.id);
      setMirrorConversationLoadCandidate(undefined);
    } catch (error) {
      setMirrorConversationCandidates([]);
      setMirrorConversationPickerError(error instanceof Error ? error.message : String(error));
    } finally {
      setMirrorConversationPickerLoading(false);
    }
  }

  function closeMirrorConversationPicker() {
    if (isJourneyReloading) {
      return;
    }
    setMirrorConversationPickerOpen(false);
    setMirrorConversationPickerError(undefined);
    setMirrorConversationLoadCandidate(undefined);
  }

  async function generateCandidateTitle(candidate: MirrorConversationCandidate) {
    if (mirrorTitleGenerationInFlightRef.current) {
      return;
    }

    mirrorTitleGenerationInFlightRef.current = true;
    setSelectedMirrorConversationId(candidate.id);
    setIsJourneyReloading(true);
    setGeneratingMirrorTitleId(candidate.id);
    setMirrorConversationPickerError(undefined);
    try {
      await generateMirrorConversationTitle(selectedJourney, candidate.id);
      const candidates = await listMirrorConversations(selectedJourney);
      setMirrorConversationCandidates(candidates);
      setSelectedMirrorConversationId(candidate.id);
    } catch (error) {
      setMirrorConversationPickerError(error instanceof Error ? error.message : String(error));
    } finally {
      mirrorTitleGenerationInFlightRef.current = false;
      setGeneratingMirrorTitleId(undefined);
      setIsJourneyReloading(false);
    }
  }

  async function reloadSelectedMirrorConversation() {
    const conversationId = mirrorConversationLoadCandidate?.id ?? selectedMirrorConversationId;
    if (isStreaming || isJourneyReloading || !conversationId) {
      return;
    }

    setIsJourneyReloading(true);
    setJourneyReloadStatus("Reloading selected Mirror conversation...");
    try {
      const summary = await reloadJourneyFromMirror(selectedJourney, conversationId);
      const reloadedConversation = await loadJourneyConversation(selectedJourney);
      if (reloadedConversation?.journeyId === selectedJourney) {
        const hydrationSummary = await hydrateJourneyPiSession(
          selectedJourney,
          reloadedConversation.liveIdentity.piSessionId,
          providerConfig,
        );
        setConversation(reloadedConversation);
        setJourneyReloadStatus(`${summary} ${hydrationSummary}`.trim());
      }
      setMirrorConversationPickerOpen(false);
      setMirrorConversationLoadCandidate(undefined);
      if (!reloadedConversation) {
        setJourneyReloadStatus(summary || "Selected Mirror conversation reloaded.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMirrorConversationPickerError(message);
      setJourneyReloadStatus(message);
    } finally {
      setIsJourneyReloading(false);
    }
  }

  async function clearChatSession() {
    if (isStreaming || isJourneyReloading) {
      return;
    }

    setJourneyMenuOpen(false);
    setIsJourneyReloading(true);
    setJourneyReloadStatus("Restarting Harness conversation and Pi session...");
    try {
      const resetSummary = await restartJourneyPiSession(
        selectedJourney,
        conversation.liveIdentity.piSessionId,
      );
      setDraft("");
      setConversation((currentConversation) =>
        resetJourneyConversation({ conversation: currentConversation, initialMessages }),
      );
      setPacketJson("");
      setStreamMissionDraft(undefined);
      setStreamWarnings([]);
      setStreamDiagnostics([]);
      setStreamSafety(undefined);
      setStreamMode(undefined);
      setRuntimeProjection(initialRuntimeProjectionState);
      setRuntimeProjectionMessageId(undefined);
      setJourneyPreferences((preferences) => markJourneyRecent(preferences, selectedJourney));
      setJourneyReloadStatus(`Conversation restarted. ${resetSummary}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStreamWarnings((warnings) => [...warnings, message]);
      setJourneyReloadStatus(`Could not restart conversation: ${message}`);
    } finally {
      setIsJourneyReloading(false);
    }
  }

  function applyProviderConfiguration() {
    const nextConfig = createProviderConfig({
      command: providerCommand,
      argsText: providerArgsText,
      useStdin: providerUseStdin,
      safeTestMode: providerSafeTestMode,
      invocationMode: providerInvocationMode,
    });
    setProviderConfig(nextConfig);
    setProviderCommand(nextConfig.command);
    setProviderArgsText(providerConfigToArgsText(nextConfig));
    setProviderUseStdin(nextConfig.useStdin);
    setProviderSafeTestMode(nextConfig.safeTestMode);
    setProviderInvocationMode(nextConfig.invocationMode);
  }

  function resetProviderConfiguration() {
    setProviderConfig(defaultPiProviderConfig);
    setProviderCommand(defaultPiProviderConfig.command);
    setProviderArgsText(providerConfigToArgsText(defaultPiProviderConfig));
    setProviderUseStdin(defaultPiProviderConfig.useStdin);
    setProviderSafeTestMode(defaultPiProviderConfig.safeTestMode);
    setProviderInvocationMode(defaultPiProviderConfig.invocationMode);
  }

  function selectJourney(journeyId: string) {
    if (isStreaming || journeyId === selectedJourney) {
      return;
    }

    setSelectedJourney(journeyId);
    setJourneyPreferences((preferences) => ({
      ...preferences,
      activeJourneyId: journeyId,
    }));
    setDraft("");
    setPacketJson("");
    setStreamMissionDraft(undefined);
    setStreamWarnings([]);
    setStreamDiagnostics([]);
    setStreamSafety(undefined);
    setStreamMode(undefined);
    setRuntimeProjection(initialRuntimeProjectionState);
    setRuntimeProjectionMessageId(undefined);
  }

  function togglePinnedJourney(journeyId: string) {
    setJourneyPreferences((preferences) => ({
      ...preferences,
      pinnedJourneyIds: preferences.pinnedJourneyIds.includes(journeyId)
        ? preferences.pinnedJourneyIds.filter((id) => id !== journeyId)
        : [...preferences.pinnedJourneyIds, journeyId],
    }));
  }

  return (
    <main className={`app-shell ${rightPanelCollapsed ? "right-panel-collapsed" : ""} ${isJourneyReloading ? "is-busy" : ""}`}>
      <aside className="journey-sidebar" aria-label="Journeys">
        <div className="brand-block">
          <img className="brand-mark" src={appIconUrl} alt="" aria-hidden="true" />
          <div>
            <strong>Nautilus</strong>
            <small>Journey cockpit</small>
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

        <div className="journey-order-control" aria-label="Journey list order">
          {([
            ["recent", "Recent"],
            ["name", "A–Z"],
            ["tree", "Tree"],
          ] as const).map(([order, label]) => (
            <button
              key={order}
              className={journeyListOrder === order ? "selected" : ""}
              type="button"
              onClick={() => setJourneyListOrder(order)}
              aria-pressed={journeyListOrder === order}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="journey-list">
          {visibleSidebarJourneys.length === 0 ? (
            <div className="journey-empty-state">
              {journeySearch.trim() ? (
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
            return (
              <div
                key={journey.id}
                className={`journey-item accent-${visual.accent} ${journey.id === selectedJourney ? "selected" : ""} ${isStreaming ? "disabled" : ""}`}
                style={{ "--journey-depth": journeyListOrder === "tree" ? journey.depth : 0 } as CSSProperties & Record<"--journey-depth", number>}
                role="button"
                tabIndex={isStreaming ? -1 : 0}
                aria-disabled={isStreaming}
                onClick={() => {
                  selectJourney(journey.id);
                  setJourneySearch("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectJourney(journey.id);
                    setJourneySearch("");
                  }
                }}
              >
                <span className="journey-icon">{visual.icon}</span>
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
      </aside>

      <section className="chat-shell" aria-label={`${selectedJourneyItem.name} agent chat`}>
        <header className={`chat-header accent-${selectedJourneyVisual.accent} ${headerExpanded ? "" : "chat-header-collapsed"}`}>
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
                <div className="journey-menu-wrap" ref={journeyMenuRef}>
                  <button
                    className="menu-button"
                    type="button"
                    onClick={() => setJourneyMenuOpen((open) => !open)}
                    aria-label="Journey menu"
                    aria-expanded={journeyMenuOpen}
                    title="Journey menu"
                  >
                    ⋯
                  </button>
                  {journeyMenuOpen ? (
                    <div className="journey-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => void clearChatSession()} disabled={isStreaming || isJourneyReloading}>
                        {isJourneyReloading ? "Restarting Conversation..." : "Restart Conversation"}
                      </button>
                      <div className="journey-menu-separator" role="separator" />
                      <button type="button" role="menuitem" onClick={() => void openMirrorConversationPicker()} disabled={isStreaming || isJourneyReloading}>
                        {isJourneyReloading ? "Loading from Mirror..." : "Load Conversation from Mirror..."}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  className="menu-button header-toggle"
                  type="button"
                  onClick={() => setHeaderExpanded((expanded) => !expanded)}
                  aria-label={headerExpanded ? "Hide header" : "Show header"}
                  aria-pressed={!headerExpanded}
                  title={headerExpanded ? "Hide header" : "Show header"}
                >
                  {headerExpanded ? "⌃" : "⌄"}
                </button>
                <button
                  className="menu-button right-panel-toggle"
                  type="button"
                  onClick={() => setRightPanelCollapsed((collapsed) => !collapsed)}
                  aria-label={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
                  aria-pressed={rightPanelCollapsed}
                  title={rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
                >
                  {rightPanelCollapsed ? "◨" : "◧"}
                </button>
              </div>
            </div>
            {headerExpanded ? (
              <>
                <p className="journey-moment-summary">{currentSituationDescription}</p>
                <section className="journey-status-rail" aria-label="Current realization context">
                  <span className="status-pill status-pill-primary" title={currentMissionTitle}>
                    <span>Mission</span>
                    <strong>{currentMissionTitle}</strong>
                  </span>
                  <span className="status-pill" title={currentDeliveryTitle}>
                    <span>Delivery</span>
                    <strong>{currentDeliveryTitle}</strong>
                  </span>
                  <span className="status-pill" title={currentSituationDescription}>
                    <span>Situation</span>
                    <strong>{currentSituation}</strong>
                  </span>
                </section>
                <div className="present-map-summary" aria-label="Current map summary">
                  <span>Current map</span>
                  {presentMapCounters.map((item) => (
                    <strong key={item.label}>
                      {item.label} {item.value}
                    </strong>
                  ))}
                  <div className="present-map-avatars" aria-label="Participants present">
                    <span title="Human Navigator">N</span>
                    <span title="Pi agent">π</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <section className="chat-stream" aria-label="Conversation" ref={chatStreamRef}>
          {journeyReloadStatus ? <p className="journey-reload-status">{journeyReloadStatus}</p> : null}
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
                  </article>
                ) : null}
                <ImportedActivity events={messageActivity} basePath={selectedJourneyBasePath} />
              </div>
            );
          })}

          <div ref={chatEndRef} className="chat-scroll-anchor" aria-hidden="true" />
        </section>

        <section className="composer" aria-label="Message composer">
          {externalPiConflict && !isStreaming ? (
            <ExternalPiSyncNotice reason={externalPiConflict} />
          ) : null}
          {pendingMirrorRepair && !isStreaming ? (
            <ConversationSyncNotice
              retrying={isRetryingMirrorCommit}
              error={mirrorCommitError ?? pendingMirrorRepair.failureCode}
              onRetry={() => void retryPendingMirrorCommit()}
            />
          ) : null}
          <div className="composer-input-wrap">
            <textarea
              aria-label="Natural-language intention"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void generatePacket("live");
                }
              }}
              placeholder="Write a message to this journey agent."
            />
            <ComposerRuntimeFooter
              projection={runtimeProjection}
              runActive={agentRun.status === "running"}
              contextUsage={authoritativeContextUsage}
              activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}
              contextState={piContextState}
              providerModel={providerModelLabel(providerConfig)}
              canInitializeContext={piContextState === "not_initialized"}
              initializingContext={isInitializingPiContext}
              onInitializeContext={() => void initializeCurrentPiContext()}
            />
            <div className="composer-inline-actions">
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
                  disabled={!draft.trim() || isStreaming || agentRun.status === "running" || providerErrors.length > 0}
                  aria-label="Send message"
                  title="Send message"
                >
                  ↑
                </button>
              )}
            </div>
          </div>
        </section>
      </section>

      <aside className="grammar-panel" aria-label="Realization grammar inspector" aria-hidden={rightPanelCollapsed}>
        <section className="grammar-card grammar-card-primary">
          <p className="eyebrow">Inspector</p>
          <h2>On-demand grammar</h2>
          <p className="grammar-summary">
            The conversation is the primary field. This panel is an auxiliary lens for reviewing extracted structure.
          </p>
        </section>

        <section className="grammar-card">
          <p className="eyebrow">Summary</p>
          <dl>
            <Row label="Identity" value={model.identity.name} />
            <Row label="Mission" value={streamMissionDraft?.title ?? model.mission?.title ?? "none"} />
            <Row label="Questions" value={String(streamWarnings.length)} />
          </dl>
        </section>

        <section className="grammar-card settings-card">
          <p className="eyebrow">App</p>
          <h3>Agent model</h3>
          <p className="provider-model-label">{providerModelLabel(providerConfig)}</p>
          <dl>
            <Row label="Run" value={agentRun.status} />
            <Row label="Started" value={agentRun.startedAt ? formatTime(agentRun.startedAt) : "none"} />
            <Row label="Conversation" value={conversationLoaded ? "local" : "loading"} />
          </dl>
          {agentRun.error ? <p className="provider-error">{agentRun.error}</p> : null}
          <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </section>


        {streamDiagnostics.length > 0 ? (
          <section className="grammar-card diagnostics-card">
            <p className="eyebrow">Diagnostics</p>
            <ul>
              {streamDiagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {packetJson ? (
          <section className="grammar-card packet-card">
            <p className="eyebrow">Pi Task Packet</p>
            <pre className="packet-preview">{packetJson}</pre>
          </section>
        ) : null}

        {model.errors.length > 0 ? (
          <section className="grammar-card errors" role="alert">
            <h2>Validation errors</h2>
            <ul>
              {model.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>

      {mirrorConversationPickerOpen ? (
        <div className="settings-backdrop" role="presentation" onClick={closeMirrorConversationPicker}>
          <section
            className="settings-window mirror-conversation-picker"
            role="dialog"
            aria-modal="true"
            aria-label="Select Mirror conversation"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <p className="eyebrow">Mirror reload</p>
                <h2>Select conversation</h2>
                <p className="settings-intro">Choose which Mirror conversation to materialize for {selectedJourneyItem.name}.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeMirrorConversationPicker} disabled={isJourneyReloading}>
                Cancel
              </button>
            </header>

            {mirrorConversationPickerError ? <p className="provider-error">{mirrorConversationPickerError}</p> : null}
            {mirrorConversationPickerLoading ? <p className="journey-reload-status">Loading Mirror conversations...</p> : null}
            {!mirrorConversationPickerLoading && mirrorConversationCandidates.length === 0 ? (
              <p className="empty-chat-copy">No Mirror conversations found for this Journey.</p>
            ) : null}

            {mirrorConversationCandidates.length > 0 ? (
              <div className="mirror-conversation-list" role="listbox" aria-label="Mirror conversations">
                {mirrorConversationCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`mirror-conversation-option ${candidate.id === selectedMirrorConversationId ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedMirrorConversationId(candidate.id);
                      setMirrorConversationLoadCandidate(candidate);
                    }}
                    role="option"
                    aria-selected={candidate.id === selectedMirrorConversationId}
                  >
                    <div className="mirror-conversation-select">
                      <span>
                        <strong>{candidate.title}</strong>
                        <small>Code {candidate.code} · {candidate.messageCount} messages</small>
                      </span>
                      <span className="mirror-conversation-date">{formatDateTime(candidate.lastUpdatedAt)}</span>
                    </div>
                    <button
                      type="button"
                      className="secondary-button mirror-title-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void generateCandidateTitle(candidate);
                      }}
                      disabled={isJourneyReloading}
                      aria-label={`Generate title for ${candidate.title}`}
                      title="Generate title with Mirror"
                    >
                      {generatingMirrorTitleId === candidate.id ? "…" : "✦"}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {mirrorConversationLoadCandidate ? (
              <section className="mirror-load-confirmation" role="alertdialog" aria-label="Confirm conversation load">
                <div>
                  <strong>Load this conversation?</strong>
                  <p>{mirrorConversationLoadCandidate.title}</p>
                  <small>Code {mirrorConversationLoadCandidate.code} · {mirrorConversationLoadCandidate.messageCount} messages · {formatDateTime(mirrorConversationLoadCandidate.lastUpdatedAt)}</small>
                </div>
                <div className="provider-actions">
                  <button type="button" onClick={() => void reloadSelectedMirrorConversation()} disabled={isJourneyReloading}>
                    {isJourneyReloading ? "Loading..." : "Confirm"}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setMirrorConversationLoadCandidate(undefined)} disabled={isJourneyReloading}>
                    Cancel
                  </button>
                </div>
              </section>
            ) : null}

            <div className="provider-actions">
              <button className="secondary-button" type="button" onClick={closeMirrorConversationPicker} disabled={isJourneyReloading}>
                Close
              </button>
            </div>
          </section>
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
                <h2>Agent provider</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </header>

            <section className="settings-section provider-card">
              <h3>{describeProviderMode(providerConfig)}</h3>
              <dl>
                <Row label="Model" value={providerModelLabel(providerConfig)} />
                <Row label="Command" value={providerConfig.command} />
                <Row label="Args" value={providerConfig.args.length > 0 ? providerConfig.args.join(" ") : "none"} />
                <Row label="Input" value={providerConfig.useStdin ? "stdin" : "prompt argument"} />
              </dl>
              <label className="provider-field">
                Invocation mode
                <select
                  value={providerInvocationMode}
                  onChange={(event) => setProviderInvocationMode(event.target.value as AgentInvocationMode)}
                  disabled={providerSafeTestMode}
                >
                  <option value="mirror">Mirror runtime Pi</option>
                  <option value="raw">Raw local Pi</option>
                </select>
              </label>
              <label className="provider-field">
                Command
                <input value={providerCommand} onChange={(event) => setProviderCommand(event.target.value)} disabled={providerSafeTestMode} />
              </label>
              <label className="provider-field">
                Arguments
                <input value={providerArgsText} onChange={(event) => setProviderArgsText(event.target.value)} disabled={providerSafeTestMode} />
              </label>
              <label className="provider-check">
                <input type="checkbox" checked={providerUseStdin} onChange={(event) => setProviderUseStdin(event.target.checked)} disabled={providerSafeTestMode} />
                Send prompt through stdin
              </label>
              <label className="provider-check">
                <input type="checkbox" checked={providerSafeTestMode} onChange={(event) => setProviderSafeTestMode(event.target.checked)} />
                Safe test mode (cat)
              </label>
              {providerErrors.length > 0 ? <p className="provider-error">{providerErrors.join(" ")}</p> : null}
              <div className="provider-actions">
                <button type="button" onClick={applyProviderConfiguration} disabled={isStreaming}>
                  Apply provider settings
                </button>
                <button className="secondary-button" type="button" onClick={resetProviderConfiguration} disabled={isStreaming}>
                  Reset provider
                </button>
              </div>
              <p className="provider-note">Current app session only. No secrets are stored. Mirror runtime mode sends the natural user message through Pi from the Mirror runtime root for the active Journey.</p>
            </section>
          </section>
        </div>
      ) : null}
    </main>
  );
}

type RowProps = {
  label: string;
  value: string;
};

function Row({ label, value }: RowProps) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
