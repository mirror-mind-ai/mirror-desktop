import type { ConversationMessage } from "../../agent/piTaskPacket";
import { startAgentRun } from "../../agent/agentRun";
import type { TurnCorrelation } from "../../agent/agentStream";
import {
  createInitialJourneyRuntimeState,
  isJourneyRuntimeActiveOrFinalizing,
  journeyRuntimeReducer,
  type JourneyRunIdentity,
  type JourneyRuntimeState,
} from "../../app/journeyRuntimeState";
import { deriveJourneyNavigationPresentation } from "../../app/journeyNavigationCoordinator";
import {
  createJourneySettlementAuthority,
  type JourneySettlementAuthority,
} from "../../app/journeySettlement";
import {
  createTurnFinalizationCoordinator,
  upgradeMirrorCommitments,
  type ConvergenceDeps,
  type TurnFinalizationPorts,
} from "../../app/turnFinalizationCoordinator";
import type { TurnJournalRecord } from "../../app/turnJournal";
import { shouldShowConversationSyncNotice } from "../../app/composerTurnStatus";
import {
  decideConversationAvailability,
  type ConversationAvailability,
} from "../../domain/conversationAvailability";
import { deriveDurableSynchronizationDebt } from "../../domain/durableSynchronizationStatus";
import type { MirrorAppendOutboxItem, MirrorAppendReceipt } from "../../domain/mirrorAppendOutbox";
import { stageCorrelatedTurn } from "../../domain/threeBodyTurnCommit";
import {
  createDedicatedJourneyConversation,
  restoreDedicatedJourneyConversation,
  type JourneyConversation,
} from "../../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../../domain/runAuthority";
import { readyThread } from "./readyThread";

export type WorldPresentation = {
  presented: JourneyConversation;
  assistantContentByTurn: Record<string, string | undefined>;
  syncNoticeVisible: boolean;
  pendingRepairTurnId?: string;
  availability: ConversationAvailability;
};

type ActiveTurn = {
  runId: string;
  correlation: TurnCorrelation;
  authority: JourneySettlementAuthority;
  identity: JourneyRunIdentity;
  runConversation: JourneyConversation;
};

let clockTick = 0;

function nextInstant(): string {
  clockTick += 1;
  return new Date(Date.UTC(2026, 8, 21, 12, 0, 0, clockTick)).toISOString();
}

export function createConvergentTurnWorld(journeyId = "convergent-journey") {
  const thread = readyThread(journeyId);
  const generation = thread.generations[0];
  const coordinator = createTurnFinalizationCoordinator();
  const stores = {
    journal: [] as TurnJournalRecord[],
    outbox: [] as MirrorAppendOutboxItem[],
    mirror: new Map<string, Array<{ id: string; role: string; content: string }>>(),
    projections: new Map<number, JourneyConversation>(),
  };
  let runtime: JourneyRuntimeState = createInitialJourneyRuntimeState();
  let base: JourneyConversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  let selectedJourneyId = journeyId;
  let active: ActiveTurn | undefined;
  let failNextDelivery = false;
  let syncFailureEvidence = false;
  let staleReconcileSnapshot: ReturnType<typeof summarizeOutbox> | undefined;

  function summarizeOutbox() {
    return stores.outbox.map((item) => ({
      schemaVersion: item.schemaVersion,
      itemId: item.itemId,
      journeyId: item.journeyId,
      threadId: item.threadId,
      generation: item.generation,
      conversationId: item.conversationId,
      createdAt: item.createdAt,
    }));
  }

  function journalRecordByRunId(runId: string): TurnJournalRecord | undefined {
    return stores.journal.find((record) => record.authority.runId === runId);
  }

  function deliverToMirror(item: MirrorAppendOutboxItem): MirrorAppendReceipt {
    const messages = stores.mirror.get(item.conversationId) ?? [];
    const states = item.messages.map((message) => {
      const existing = messages.some((candidate) => candidate.id === message.id);
      if (!existing) messages.push({ id: message.id, role: message.role, content: message.content });
      return { id: message.id, state: existing ? "existing" as const : "inserted" as const };
    });
    stores.mirror.set(item.conversationId, messages);
    return {
      schemaVersion: "1.0.0",
      status: "accepted",
      conversationId: item.conversationId,
      journeyId: item.journeyId,
      insertedCount: states.filter((state) => state.state === "inserted").length,
      existingCount: states.filter((state) => state.state === "existing").length,
      messages: states,
    };
  }

  const ports: TurnFinalizationPorts = {
    loadActiveEvidence: async (authority) => ({
      activeGeneration: authority.generation,
      currentRunId: authority.runId,
      currentTurnId: authority.turnId,
    }),
    saveProjection: async (projection, authority) => {
      stores.projections.set(authority.generation, projection);
      const record = journalRecordByRunId(authority.runId);
      if (record && record.phase === "terminal_durable") record.phase = "projected";
    },
    cleanupLease: async () => {},
    loadJournal: async () => ({
      schemaVersion: "0.1.0",
      records: stores.journal,
      savedAt: nextInstant(),
    }),
    advanceJournal: async (authority, expected, next) => {
      const record = journalRecordByRunId(authority.runId);
      if (!record) throw new Error("turn_journal_authority_mismatch");
      if (record.phase === next) return;
      const expectedPhases = Array.isArray(expected) ? expected : [expected];
      if (!expectedPhases.includes(record.phase)) {
        throw new Error(`turn_journal_shadow_divergence:${record.phase}:${expectedPhases.join("|")}`);
      }
      record.phase = next;
      record.updatedAt = nextInstant();
    },
    enqueueOutboxItem: async (item) => {
      if (!stores.outbox.some((candidate) => candidate.itemId === item.itemId)) {
        stores.outbox.push(item);
      }
    },
    deliverOutboxItem: async (itemId) => {
      if (failNextDelivery) {
        failNextDelivery = false;
        throw new Error("mirror_append_failed");
      }
      const item = stores.outbox.find((candidate) => candidate.itemId === itemId);
      if (!item) throw new Error("mirror_append_item_missing");
      return deliverToMirror(item);
    },
    acknowledgeOutboxItem: async (itemId) => {
      stores.outbox = stores.outbox.filter((candidate) => candidate.itemId !== itemId);
    },
    loadPersistedProjection: async (authority) => stores.projections.get(authority.generation),
    savePostFrontierProjection: async (projection, authority) => {
      stores.projections.set(authority.generation, projection);
    },
  };

  function dispatch(action: Parameters<typeof journeyRuntimeReducer>[1]): void {
    runtime = journeyRuntimeReducer(runtime, action);
  }

  const convergenceDeps: ConvergenceDeps = {
    ports,
    reconcileDeliveryDebt: async () => {
      if (active) throw new Error("mirror_append_pi_recovery_active_lease");
      if (staleReconcileSnapshot) {
        const snapshot = staleReconcileSnapshot;
        staleReconcileSnapshot = undefined;
        return snapshot;
      }
      return summarizeOutbox();
    },
    loadProjectionByCoords: async (_journeyId, generationNumber) => stores.projections.get(generationNumber),
    deliverPiBackedOutboxItem: async () => {
      throw new Error("world_pi_backed_delivery_unused");
    },
    loadThread: async (_journeyId, threadId) => threadId === thread.threadId ? thread : undefined,
    inspectTranscript: async () => ({ schemaVersion: "0.1.0", entries: [] }),
    inspectNativeOccupancy: async () => ({
      schemaVersion: "0.1.0",
      limit: 2,
      processCapacityInUse: 0,
      entries: [],
    } as never),
    onExactError: (_identity, message) => {
      syncFailureEvidence = message !== undefined;
    },
  };

  coordinator.subscribe((event) => {
    if (event.type !== "presentation") return;
    const authority = event.authority;
    const entryIdentity = runtime.entries[authority.journeyId]?.identity;
    if (entryIdentity?.kind === "live"
      && entryIdentity.authority.runId === authority.runId
      && entryIdentity.authority.generation === authority.generation) {
      dispatch({ type: "conversation_snapshot", identity: entryIdentity, conversation: event.projection });
    }
    if (selectedJourneyId !== authority.journeyId) return;
    if (base.id !== authority.threadId || base.liveIdentity.generation !== authority.generation) return;
    const currentTurnId = base.reconciliation.turns.at(-1)?.turnId;
    base = !currentTurnId
      || event.projection.reconciliation.turns.some((turn) => turn.turnId === currentTurnId)
      ? event.projection
      : upgradeMirrorCommitments(base, event.projection);
  });

  return {
    thread,
    stores,
    get base() { return base; },
    get runtime() { return runtime; },

    beginTurn(runId: string, userText: string): void {
      if (active) throw new Error("world_turn_already_active");
      const correlation = createDedicatedTurnAuthority(
        thread, runId, `turn-${runId}`, `user-${runId}`, `assistant-${runId}`,
      );
      const runAuthority = createRunAuthority(correlation, base.liveIdentity, generation);
      const authority = createJourneySettlementAuthority(runAuthority);
      const identity: JourneyRunIdentity = { kind: "live", authority: runAuthority };
      const userMessage: ConversationMessage = {
        id: correlation.harnessUserMessageId, role: "user", content: userText, createdAt: nextInstant(),
      };
      const assistantMessage: ConversationMessage = {
        id: correlation.harnessAssistantMessageId, role: "assistant", content: "", createdAt: nextInstant(),
      };
      const staged = stageCorrelatedTurn(base, correlation, userMessage, assistantMessage);
      dispatch({
        type: "register",
        identity,
        run: startAgentRun({ content: userText, mode: "live" }),
        assistantMessageId: assistantMessage.id,
        conversationSnapshot: staged,
      });
      if (selectedJourneyId === journeyId) base = staged;
      stores.journal.push({
        schemaVersion: "0.1.0",
        authority: {
          schemaVersion: "0.1.0",
          journeyId: authority.journeyId,
          runId: authority.runId,
          turnId: authority.turnId,
          threadId: authority.threadId,
          generation: authority.generation,
          piSessionId: authority.piSessionId,
          mirrorConversationId: authority.mirrorConversationId,
          harnessUserMessageId: authority.harnessUserMessageId,
          harnessAssistantMessageId: authority.harnessAssistantMessageId,
        },
        phase: "admitted",
        terminalOutcome: null,
        terminalEvidence: null,
        cancellationIntent: "none",
        recoveryDisposition: "none",
        revision: 1,
        createdAt: nextInstant(),
        updatedAt: nextInstant(),
        lastReceipt: null,
      });
      active = { runId, correlation, authority, identity, runConversation: staged };
    },

    streamAssistant(content: string): void {
      if (!active) throw new Error("world_no_active_turn");
      const turn = active;
      turn.runConversation = {
        ...turn.runConversation,
        messages: turn.runConversation.messages.map((message) =>
          message.id === turn.correlation.harnessAssistantMessageId
            ? { ...message, content }
            : message,
        ),
      };
      dispatch({ type: "conversation_snapshot", identity: turn.identity, conversation: turn.runConversation });
      if (selectedJourneyId === journeyId && base.id === turn.runConversation.id) base = turn.runConversation;
    },

    async settleTerminal(options: { failAppend?: boolean } = {}): Promise<void> {
      if (!active) throw new Error("world_no_active_turn");
      const turn = active;
      dispatch({ type: "stream_event", identity: turn.identity, event: { type: "run_status", status: "completed" } });
      dispatch({ type: "stream_finished", identity: turn.identity });
      const committedAt = nextInstant();
      const assistantText = turn.runConversation.messages.find(
        (message) => message.id === turn.correlation.harnessAssistantMessageId,
      )?.content ?? "";
      const record = journalRecordByRunId(turn.runId);
      if (!record) throw new Error("world_journal_record_missing");
      record.phase = "terminal_durable";
      record.terminalOutcome = "completed";
      record.terminalEvidence = {
        capturedAt: committedAt,
        piExecution: {
          userEntryId: `pi-user-${turn.runId}`,
          assistantEntryId: `pi-assistant-${turn.runId}`,
          leafEntryId: `pi-assistant-${turn.runId}`,
          entryCount: 2,
          assistantText,
          assistantTextTruncated: false,
          startedAt: committedAt,
          committedAt,
        },
      };
      failNextDelivery = options.failAppend ?? false;
      try {
        await coordinator.finalizeCompletedTurn({
          authority: turn.authority,
          correlation: turn.correlation,
          projection: turn.runConversation,
        }, ports);
      } catch {
        syncFailureEvidence = true;
      } finally {
        failNextDelivery = false;
        dispatch({ type: "finalization_finished", identity: turn.identity });
      }
      active = undefined;
    },

    primeStaleReconcileSnapshot(): void {
      staleReconcileSnapshot = summarizeOutbox();
    },

    completeDeliveryOutOfBand(): void {
      for (const item of [...stores.outbox]) {
        deliverToMirror(item);
        const record = stores.journal.find((candidate) => candidate.authority.turnId === item.itemId);
        if (record) record.phase = "settled";
      }
      stores.outbox = [];
    },

    async repairDeliveryDebt(): Promise<void> {
      try {
        await coordinator.convergeDelivery(journeyId, convergenceDeps);
        syncFailureEvidence = false;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("mirror_append_pi_recovery_active_lease")) return;
        syncFailureEvidence = true;
        throw error;
      }
    },

    navigateAway(): void {
      selectedJourneyId = `${journeyId}-elsewhere`;
    },

    navigateBack(): void {
      selectedJourneyId = journeyId;
      base = restoreDedicatedJourneyConversation(thread, stores.projections.get(generation.generation));
    },

    restart(): void {
      runtime = createInitialJourneyRuntimeState();
      active = undefined;
      selectedJourneyId = journeyId;
      base = restoreDedicatedJourneyConversation(thread, stores.projections.get(generation.generation));
    },

    durableEvidenceSettled(): boolean {
      const journalSettled = stores.journal.every(
        (record) => record.phase === "settled" && record.terminalOutcome === "completed",
      );
      const outboxEmpty = stores.outbox.length === 0;
      const mirrorMessages = stores.mirror.get(generation.mirrorConversationId) ?? [];
      const mirrorComplete = stores.journal.every((record) =>
        mirrorMessages.some((message) => message.id === record.authority.harnessUserMessageId)
        && mirrorMessages.some((message) => message.id === record.authority.harnessAssistantMessageId),
      );
      return journalSettled && outboxEmpty && mirrorComplete;
    },

    presentation(): WorldPresentation {
      const presentationState = deriveJourneyNavigationPresentation({
        runtimeState: runtime,
        selectedJourneyId,
        loadedConversation: base,
        selectedThreadId: thread.threadId,
      });
      const presented = presentationState.conversation ?? base;
      const entry = presentationState.selectedRuntime;
      const durableDebt = deriveDurableSynchronizationDebt({
        journalRecords: stores.journal.map((record) => ({
          turnId: record.authority.turnId,
          phase: record.phase,
          terminalOutcome: record.terminalOutcome,
        })),
        outboxItems: stores.outbox.map((item) => ({ itemId: item.itemId })),
      });
      const syncNoticeVisible = shouldShowConversationSyncNotice({
        mirrorRepairPending: Boolean(durableDebt) && syncFailureEvidence,
        legacyMirrorGap: false,
        isStreaming: entry.isStreaming,
        isFinalizingTurn: entry.isFinalizingTurn,
      });
      const availability = decideConversationAvailability({
        runtimeBindingReady: true,
        conversationAuthorityReady: true,
        sameConversationExecutionActive: isJourneyRuntimeActiveOrFinalizing(entry),
        nativeAdmission: "allowed",
        recoveryInspectionActive: false,
        mirrorSynchronizationPending: syncNoticeVisible,
      });
      const assistantContentByTurn: Record<string, string | undefined> = {};
      for (const turn of presented.reconciliation.turns) {
        if (!turn.harness.assistantMessageId) continue;
        assistantContentByTurn[turn.turnId] = presented.messages.find(
          (message) => message.id === turn.harness.assistantMessageId,
        )?.content;
      }
      return {
        presented,
        assistantContentByTurn,
        syncNoticeVisible,
        ...(durableDebt ? { pendingRepairTurnId: durableDebt.turnId } : {}),
        availability,
      };
    },
  };
}
