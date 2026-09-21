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
  executeCompletedSettlement,
  projectionCurrentTurnMatchesAuthority,
  type JourneySettlementAuthority,
} from "../../app/journeySettlement";
import { shouldShowConversationSyncNotice } from "../../app/composerTurnStatus";
import {
  decideConversationAvailability,
  type ConversationAvailability,
} from "../../domain/conversationAvailability";
import { deriveDurableSynchronizationDebt } from "../../domain/durableSynchronizationStatus";
import {
  applyMirrorAppendReceipt,
  applyPiExecutionEvidence,
  createMirrorAppendOutboxItem,
  type MirrorAppendOutboxItem,
  type MirrorAppendReceipt,
} from "../../domain/mirrorAppendOutbox";
import { commitHarnessTurn, stageCorrelatedTurn } from "../../domain/threeBodyTurnCommit";
import {
  createDedicatedJourneyConversation,
  restoreDedicatedJourneyConversation,
  type JourneyConversation,
} from "../../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../../domain/runAuthority";
import { readyThread } from "./readyThread";

export type WorldJournalPhase =
  | "admitted"
  | "terminal_durable"
  | "projected"
  | "outbox_enqueued"
  | "settled";

export type WorldJournalRecord = {
  turnId: string;
  runId: string;
  phase: WorldJournalPhase;
  terminalOutcome?: "completed";
};

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
  const stores = {
    journal: [] as WorldJournalRecord[],
    outbox: [] as MirrorAppendOutboxItem[],
    mirror: new Map<string, Array<{ id: string; role: string; content: string }>>(),
    projections: new Map<number, JourneyConversation>(),
  };
  let runtime: JourneyRuntimeState = createInitialJourneyRuntimeState();
  let base: JourneyConversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  let selectedJourneyId = journeyId;
  let active: ActiveTurn | undefined;

  function journalRecord(turnId: string): WorldJournalRecord | undefined {
    return stores.journal.find((record) => record.turnId === turnId);
  }

  function advanceJournal(turnId: string, phase: WorldJournalPhase): void {
    const record = journalRecord(turnId);
    if (record) record.phase = phase;
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

  function publishBaseIfCurrent(authority: JourneySettlementAuthority): boolean {
    const persisted = stores.projections.get(authority.generation);
    if (
      selectedJourneyId !== authority.journeyId
      || !persisted
      || !projectionCurrentTurnMatchesAuthority(base, authority)
      || !projectionCurrentTurnMatchesAuthority(persisted, authority)
    ) return false;
    base = persisted;
    return true;
  }

  function dispatch(action: Parameters<typeof journeyRuntimeReducer>[1]): void {
    runtime = journeyRuntimeReducer(runtime, action);
  }

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
      stores.journal.push({ turnId: correlation.turnId, runId, phase: "admitted" });
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
      const record = journalRecord(turn.correlation.turnId);
      if (record) { record.phase = "terminal_durable"; record.terminalOutcome = "completed"; }
      const committedAt = nextInstant();
      let settled = applyPiExecutionEvidence(turn.runConversation, turn.correlation, {
        userEntryId: `pi-user-${turn.runId}`,
        assistantEntryId: `pi-assistant-${turn.runId}`,
        leafEntryId: `pi-assistant-${turn.runId}`,
        entryCount: 2,
        sessionFile: turn.authority.piSessionFile,
        committedAt,
      });
      settled = commitHarnessTurn(settled, turn.correlation, committedAt);
      const projectionAtFrontier = settled;
      try {
        const settlement = await executeCompletedSettlement({
          projection: projectionAtFrontier,
          authority: turn.authority,
          cleanupLeaseAuthority: turn.authority,
        }, {
          loadActiveEvidence: async () => ({
            activeGeneration: turn.authority.generation,
            currentRunId: turn.authority.runId,
            currentTurnId: turn.authority.turnId,
          }),
          saveActiveProjection: async (projection) => {
            stores.projections.set(turn.authority.generation, projection);
            advanceJournal(turn.correlation.turnId, "projected");
          },
          enqueueOutbox: async (projection) => {
            const item = createMirrorAppendOutboxItem(projection, turn.authority);
            stores.outbox.push(item);
            advanceJournal(turn.correlation.turnId, "outbox_enqueued");
            return item;
          },
          cleanupLease: async () => {},
          onLeaseReleased: () => {
            dispatch({ type: "conversation_snapshot", identity: turn.identity, conversation: projectionAtFrontier });
            if (selectedJourneyId === journeyId
              && projectionCurrentTurnMatchesAuthority(base, turn.authority)) {
              base = projectionAtFrontier;
            }
          },
          appendAndAcknowledge: async (projection, item) => {
            if (options.failAppend) throw new Error("mirror_append_failed");
            const receipt = deliverToMirror(item);
            const latest = stores.projections.get(turn.authority.generation) ?? projection;
            const committed = applyMirrorAppendReceipt(latest, turn.authority, receipt, nextInstant());
            stores.projections.set(turn.authority.generation, committed);
            stores.outbox = stores.outbox.filter((candidate) => candidate.itemId !== item.itemId);
            advanceJournal(turn.correlation.turnId, "settled");
            return committed;
          },
        });
        settled = settlement.projection;
        publishBaseIfCurrent(turn.authority);
      } catch {
        if (selectedJourneyId === journeyId
          && projectionCurrentTurnMatchesAuthority(base, turn.authority)) {
          base = settled;
        }
      } finally {
        dispatch({ type: "conversation_snapshot", identity: turn.identity, conversation: settled });
        dispatch({ type: "finalization_finished", identity: turn.identity });
      }
      active = undefined;
    },

    async repairDeliveryDebt(): Promise<void> {
      for (const item of [...stores.outbox]) {
        const record = journalRecord(item.itemId);
        if (!record) continue;
        const persisted = stores.projections.get(item.generation);
        if (!persisted) continue;
        const turn = persisted.reconciliation.turns.find((candidate) => candidate.turnId === item.itemId);
        if (!turn?.runId) continue;
        const correlation = createDedicatedTurnAuthority(
          thread, turn.runId, item.itemId, item.messages[0].id, item.messages[1].id,
        );
        const authority = createJourneySettlementAuthority(
          createRunAuthority(correlation, persisted.liveIdentity, generation),
        );
        const receipt = deliverToMirror(item);
        const committed = applyMirrorAppendReceipt(persisted, authority, receipt, nextInstant());
        stores.projections.set(item.generation, committed);
        stores.outbox = stores.outbox.filter((candidate) => candidate.itemId !== item.itemId);
        advanceJournal(item.itemId, "settled");
        publishBaseIfCurrent(authority);
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
        mirrorMessages.some((message) => message.id === `user-${record.runId}`)
        && mirrorMessages.some((message) => message.id === `assistant-${record.runId}`),
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
        journalRecords: stores.journal,
        outboxItems: stores.outbox.map((item) => ({ itemId: item.itemId })),
      });
      const syncNoticeVisible = shouldShowConversationSyncNotice({
        mirrorRepairPending: Boolean(durableDebt),
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
