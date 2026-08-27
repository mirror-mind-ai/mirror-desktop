import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { mockPiAgentStream, reduceStreamedAssistantMessage, type AgentStreamProvider, type MirrorCommitEvent, type TurnCorrelation } from "../agent/agentStream";
import {
  cancelLivePiInvocation,
  livePiAgentStream,
  readJourneyPiContextStats,
  readMirrorTurnCommitStatus,
  retryMirrorTurnCommit,
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
import { JourneyAltitudeSwitcher } from "./JourneyAltitudeSwitcher";
import { JourneyAltitudeEmptyState } from "./JourneyAltitudeEmptyState";
import { JourneyDocumentationBrowser } from "./JourneyDocumentationBrowser";
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
import { loadJourneyRegistry, refreshJourneyRegistry } from "./journeyRegistryStorage";
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
  applyMirrorCommitEvent,
  applyMirrorTurnCommitStatus,
  commitHarnessTurn,
  pendingMirrorTurnRepair,
  stageCorrelatedTurn,
} from "../domain/threeBodyTurnCommit";
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
import { classifyDedicatedTurnState, dedicatedTurnBlocksNewInvocation } from "../domain/dedicatedTurnCommit";
import {
  defaultJourneyPreferenceState,
  sanitizeJourneyPreferenceState,
  type JourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";
import type { NautilusViewModel } from "../domain/nautilusViewModel";
import type { JourneyProjectionBundle } from "../domain/journeyProjections";
import appIconUrl from "../../src-tauri/icons/icon.svg";
import { JourneyTreeIcon } from "./JourneyTreeIcon";

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
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState(() =>
    createJourneyConversation({ journeyId: selectedJourney, initialMessages }),
  );
  const [packetJson, setPacketJson] = useState("");
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
  const journeyMenuRef = useRef<HTMLDivElement | null>(null);
  const journeyTreeButtonRef = useRef<HTMLButtonElement | null>(null);
  const journeyTreeMenuRef = useRef<HTMLDivElement | null>(null);
  const checkedMirrorTurnRef = useRef<string | undefined>(undefined);
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
  const providerErrors = useMemo(() => validateProviderConfig(providerConfig), [providerConfig]);
  const authoritativeContextStats = conversation.authoritativeContextStats;
  const contextIdentityMatches = authoritativeContextStats
    && authoritativeContextStats.piSessionId === conversation.liveIdentity.piSessionId
    && authoritativeContextStats.generation === conversation.liveIdentity.generation;
  const reportedContextUsage = contextIdentityMatches ? authoritativeContextStats.usage : undefined;
  const pendingMirrorRepair = useMemo(() => pendingMirrorTurnRepair(conversation), [conversation]);
  const dedicatedThreadReady = journeyThreadState.kind === "ready";
  const dedicatedTurnState = classifyDedicatedTurnState(conversation, isStreaming || agentRun.status === "running");
  const reconciliationBlocksInvocation = dedicatedThreadReady
    ? dedicatedTurnBlocksNewInvocation(dedicatedTurnState)
    : conversation.reconciliation.classification !== "in_sync";
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
  const altitudeSwitchDisabled = isStreaming || agentRun.status === "running" || isJourneyReloading || projectionLoadStatus === "loading";
  const operationalChatSelected = selectedAltitude === "operational" && selectedOperationalSurface === "chat";
  const rightPanelVisible = operationalChatSelected && !rightPanelCollapsed;

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

    async function restoreJourneyRegistryAndPreferences() {
      let registry = emptyJourneyRegistry;
      let preferences: JourneyPreferenceState = defaultJourneyPreferenceState;
      try {
        const [loadedRegistry, loadedPreferences] = await Promise.all([
          loadJourneyRegistry(),
          loadJourneyPreferences(),
          retireLegacyParityState().catch((error) => {
            console.warn("Legacy parity state was retained for manual review.", error);
          }),
        ]);
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
    setJourneyThreadState({ kind: "loading" });
    setPiContextState("checking");

    async function restoreConversation() {
      try {
        const dedicatedThread = await loadNautilusJourneyThread(selectedJourney);
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
          const pendingTurn = [...restoredConversation.reconciliation.turns].reverse().find((turn) =>
            turn.origin === "nautilus" && turn.runId && turn.pi.state !== "committed",
          );
          const stagedUser = [...restoredConversation.messages].reverse().find((message) => message.role === "user");
          const stagedAssistant = [...restoredConversation.messages].reverse().find((message) => message.role === "assistant");
          const nativeTurn = turns.at(-1);
          if (pendingTurn?.runId && stagedUser && stagedAssistant && nativeTurn) {
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
            restoredConversation = applyMirrorTurnCommitStatus(restoredConversation, recoveryCorrelation, {
              schemaVersion: "0.2.0",
              status: "missing",
              conversationId: classified.activeGeneration.mirrorConversationId,
              messageCount: 0,
              piEvidence: {
                userEntryId: nativeTurn.userEntryId,
                assistantEntryId: nativeTurn.assistantEntryId,
                leafEntryId: nativeTurn.assistantEntryId,
                entryCount: nativeTurn.entryCount,
                sessionFile: classified.activeGeneration.piSessionFile,
              },
            }, new Date().toISOString());
            restoredConversation = commitHarnessTurn(restoredConversation, recoveryCorrelation, new Date().toISOString());
            await saveDedicatedJourneyConversation(restoredConversation);
          } else {
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
          setJourneyThreadState({ kind: "inconsistent", reasonCodes: ["invalid_record"] });
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
    if (!conversationLoaded || journeyThreadState.kind !== "ready" || isStreaming) return;
    void saveDedicatedJourneyConversation(conversation).catch((error) => {
      console.warn("Could not persist dedicated Journey projection.", error);
    });
  }, [conversation, conversationLoaded, isStreaming, journeyThreadState.kind]);

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

  async function generatePacket(mode: "mock" | "live", retryContent?: string) {
    const content = (retryContent ?? draft).trim();
    if (!content || journeyThreadState.kind !== "ready" || isStreaming || agentRun.status === "running" || reconciliationBlocksInvocation || (mode === "live" && providerErrors.length > 0)) {
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

    const userMessage = createUserConversationMessage(content);
    const nextMessages = [...baseConversation.messages, userMessage];
    const packet = createMissionExtractionPacket({
      conversation: nextMessages,
      currentState,
      journeyId: selectedJourney,
      liveConversation: baseConversation.liveIdentity,
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
    const provider: AgentStreamProvider = mode === "mock"
      ? mockPiAgentStream
      : (packet) => livePiAgentStream(packet, providerConfig, correlation);

    if (correlation) {
      try {
        await saveDedicatedJourneyConversation(stagedConversation);
      } catch (error) {
        setStreamWarnings((warnings) => [...warnings, error instanceof Error ? error.message : String(error)]);
        return;
      }
    }
    conversationRef.current = stagedConversation;
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

    const conversationBeforeRun = baseConversation;
    let rawLiveOutput = "";
    let runReachedAgent = false;
    let runWasCancelled = false;
    let runFailed = false;
    let observedAssistantMirrorCommit: MirrorCommitEvent | undefined;
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
        if (event.type === "mirror_commit" && correlation) {
          if (event.commit.phase === "assistant") observedAssistantMirrorCommit = event.commit;
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
      setIsStreaming(false);
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
        setIsFinalizingTurn(true);
        let settled = commitHarnessTurn(conversationRef.current, correlation, new Date().toISOString());
        const sessionFile = settled.liveIdentity.piSessionFile;
        try {
          if (!sessionFile) throw new Error("Dedicated Pi session file is missing.");
          if (observedAssistantMirrorCommit?.status === "committed") {
            settled = applyMirrorCommitEvent(settled, correlation, observedAssistantMirrorCommit, new Date().toISOString());
            await saveDedicatedJourneyConversation(settled);
          } else {
            await saveDedicatedJourneyConversation(settled);
            const status = await retryMirrorTurnCommit(settled.journeyId, sessionFile, correlation);
            settled = applyMirrorTurnCommitStatus(settled, correlation, status, new Date().toISOString());
            await saveDedicatedJourneyConversation(settled);
          }
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
      setDraft("");
      setPacketJson("");
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
      const refreshedRegistry = await refreshJourneyRegistry(selectedJourney);
      const reconciled = reconcileReloadedJourneyState(refreshedRegistry, {
        selectedJourneyId: selectedJourney,
        pinnedJourneyIds: journeyPreferences.pinnedJourneyIds,
        recentJourneyIds: journeyPreferences.recentJourneyIds,
        collapsedJourneyIds,
      });
      if (!reconciled) {
        throw new Error("The refreshed registry no longer contains the active Journey.");
      }
      setLoadedJourneyRegistry(refreshedRegistry);
      setJourneyPreferences((current) => ({
        ...current,
        activeJourneyId: reconciled.selectedJourneyId,
        pinnedJourneyIds: reconciled.pinnedJourneyIds,
        recentJourneyIds: reconciled.recentJourneyIds,
      }));
      setCollapsedJourneyIds(reconciled.collapsedJourneyIds);
      setJourneyRegistryRefreshState("succeeded");
      setJourneyRegistryRefreshMessage("Journey tree reloaded.");
    } catch (error) {
      setJourneyRegistryRefreshState("failed");
      setJourneyRegistryRefreshMessage(error instanceof Error ? error.message : "Could not reload the Journey tree.");
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

  return (
    <main className={`app-shell altitude-${selectedAltitude} ${rightPanelVisible ? "" : "right-panel-collapsed"} ${isJourneyReloading ? "is-busy" : ""}`}>
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
                  disabled={!operationalChatSelected}
                  aria-label={!operationalChatSelected
                    ? "Journey details are available in Operational Chat"
                    : rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
                  aria-pressed={rightPanelCollapsed}
                  title={!operationalChatSelected
                    ? "Journey details are available in Operational Chat"
                    : rightPanelCollapsed ? "Show right panel" : "Hide right panel"}
                >
                  {rightPanelCollapsed ? "◨" : "◧"}
                </button>
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
        >
          {journeyReloadStatus ? <p className="journey-reload-status">{journeyReloadStatus}</p> : null}
          {messages.length === 0 && journeyThreadState.kind === "ready" ? (
            <JourneyArrivalSurface
              journeyName={selectedJourneyItem.name}
              stage={selectedJourneyItem.stage}
              onChoose={setDraft}
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

        <section
          className="composer"
          aria-label="Message composer"
          hidden={!operationalChatSelected || journeyThreadState.kind !== "ready"}
        >
          {reconciliationBlocksInvocation && !pendingMirrorRepair && !isStreaming ? (
            <section className="dedicated-turn-notice" role="status">
              <strong>Finishing the dedicated turn</strong>
              <p>Nautilus will enable the next send after the active Pi/Mirror pair settles.</p>
            </section>
          ) : null}
          {pendingMirrorRepair && !isStreaming ? (
            <ConversationSyncNotice
              retrying={isRetryingMirrorCommit}
              error={mirrorCommitError ?? pendingMirrorRepair.failureCode}
              onRetry={() => void retryPendingMirrorCommit()}
            />
          ) : null}
          {isFinalizingTurn ? <p className="turn-finalization-status" aria-live="polite">Recording the completed turn… You can draft the next message now.</p> : null}
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
              placeholder={reconciliationBlocksInvocation
                ? "Draft your next message while the completed turn is recorded."
                : "Write a message to this journey agent."}
              disabled={isJourneyReloading || agentRun.status === "running"}
            />
            <ComposerRuntimeFooter
              projection={runtimeProjection}
              runActive={agentRun.status === "running"}
              contextUsage={authoritativeContextUsage}
              activeMode={conversation.certifiedMirrorMode?.mode ?? undefined}
              contextState={piContextState}
              providerModel={providerModelLabel(providerConfig)}
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
                  disabled={!draft.trim() || isStreaming || agentRun.status === "running" || reconciliationBlocksInvocation || providerErrors.length > 0}
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

      <aside className="grammar-panel" aria-label="Journey details" aria-hidden={!rightPanelVisible}>
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
