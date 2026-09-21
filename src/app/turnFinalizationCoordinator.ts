import type { TurnCorrelation } from "../agent/agentStream";
import {
  executeCompletedSettlement,
  executeInterruptedSettlement,
  type ActiveSettlementEvidence,
  type JourneySettlementAuthority,
} from "./journeySettlement";
import { journeyPersistenceCoordinator } from "./journeyPersistenceCoordinator";
import {
  decideTurnJournalTerminal,
  requireExactTurnJournalRecord,
  type TurnJournalDocument,
  type TurnJournalRecord,
} from "./turnJournal";
import type { MirrorAppendOutboxSummary } from "./mirrorAppendOutboxStorage";
import {
  applyMirrorAppendReceipt,
  applyPiExecutionEvidence,
  createMirrorAppendOutboxItem,
  type MirrorAppendOutboxItem,
  type MirrorAppendReceipt,
} from "../domain/mirrorAppendOutbox";
import { commitHarnessTurn } from "../domain/threeBodyTurnCommit";
import {
  replaceJourneyConversationMessages,
  type JourneyConversation,
} from "../domain/journeyConversation";

export type TurnFinalizationPorts = {
  loadActiveEvidence(authority: JourneySettlementAuthority): Promise<ActiveSettlementEvidence>;
  saveProjection(projection: JourneyConversation, authority: JourneySettlementAuthority): Promise<void>;
  cleanupLease(authority: JourneySettlementAuthority): Promise<void>;
  loadJournal(journeyId: string): Promise<TurnJournalDocument>;
  advanceJournal(
    authority: JourneySettlementAuthority,
    expected: TurnJournalRecord["phase"] | TurnJournalRecord["phase"][],
    next: TurnJournalRecord["phase"],
  ): Promise<void>;
  enqueueOutboxItem(item: MirrorAppendOutboxItem, authority: JourneySettlementAuthority): Promise<void>;
  deliverOutboxItem(itemId: string, authority: JourneySettlementAuthority): Promise<MirrorAppendReceipt>;
  acknowledgeOutboxItem(
    itemId: string,
    conversationId: string,
    authority: JourneySettlementAuthority,
  ): Promise<void>;
  loadPersistedProjection(
    authority: JourneySettlementAuthority,
  ): Promise<JourneyConversation | undefined>;
  savePostFrontierProjection(
    projection: JourneyConversation,
    authority: JourneySettlementAuthority,
    summary: MirrorAppendOutboxSummary,
  ): Promise<void>;
};

export type TurnPresentationPhase = "frontier" | "settled" | "interrupted" | "failed";

export type TurnFinalizationEvent =
  | {
      type: "presentation";
      authority: JourneySettlementAuthority;
      projection: JourneyConversation;
      phase: TurnPresentationPhase;
      error?: string;
    }
  | { type: "durable_evidence_changed"; journeyId: string };

export function validateExactOutboxSummary(
  summary: MirrorAppendOutboxSummary,
  projection: JourneyConversation,
  authority: JourneySettlementAuthority,
): void {
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

export function upgradeMirrorCommitments(
  candidate: JourneyConversation,
  reference: JourneyConversation,
): JourneyConversation {
  if (reference.journeyId !== candidate.journeyId
    || reference.id !== candidate.id
    || reference.liveIdentity.generation !== candidate.liveIdentity.generation) {
    return candidate;
  }
  let upgraded = false;
  const turns = candidate.reconciliation.turns.map((turn) => {
    if (turn.mirror.state === "committed") return turn;
    const committed = reference.reconciliation.turns.find((candidateTurn) => (
      candidateTurn.turnId === turn.turnId
      && candidateTurn.runId === turn.runId
      && candidateTurn.mirror.state === "committed"
      && candidateTurn.harness.userMessageId === turn.harness.userMessageId
      && candidateTurn.harness.assistantMessageId === turn.harness.assistantMessageId
    ));
    if (!committed) return turn;
    upgraded = true;
    return { ...turn, mirror: committed.mirror };
  });
  if (!upgraded) return candidate;
  const candidateCheckpoint = candidate.reconciliation.checkpoints.mirror;
  const referenceCheckpoint = reference.reconciliation.checkpoints.mirror;
  const checkpoints = referenceCheckpoint
    && (!candidateCheckpoint || referenceCheckpoint.messageCount > candidateCheckpoint.messageCount)
    ? { ...candidate.reconciliation.checkpoints, mirror: referenceCheckpoint }
    : candidate.reconciliation.checkpoints;
  return {
    ...candidate,
    reconciliation: { ...candidate.reconciliation, turns, checkpoints },
  };
}

export async function enqueueProjectionOutbox(
  projection: JourneyConversation,
  authority: JourneySettlementAuthority,
  ports: TurnFinalizationPorts,
): Promise<MirrorAppendOutboxSummary> {
  const outboxItem = createMirrorAppendOutboxItem(projection, authority);
  await ports.enqueueOutboxItem(outboxItem, authority);
  const journal = await ports.loadJournal(authority.journeyId);
  const journalRecord = journal.records.find((record) => record.authority.runId === authority.runId);
  if (journalRecord?.phase === "terminal_durable" || journalRecord?.phase === "projected") {
    await ports.advanceJournal(authority, journalRecord.phase, "outbox_enqueued");
  }
  return {
    schemaVersion: "1.0.0",
    itemId: outboxItem.itemId,
    journeyId: outboxItem.journeyId,
    threadId: outboxItem.threadId,
    generation: outboxItem.generation,
    conversationId: outboxItem.conversationId,
    createdAt: outboxItem.createdAt,
  };
}

export async function appendAndAcknowledgeProjection(
  projection: JourneyConversation,
  authority: JourneySettlementAuthority,
  summary: MirrorAppendOutboxSummary,
  ports: TurnFinalizationPorts,
): Promise<JourneyConversation> {
  validateExactOutboxSummary(summary, projection, authority);
  const receipt = await ports.deliverOutboxItem(summary.itemId, authority);
  return journeyPersistenceCoordinator.run(authority, "post_frontier", async () => {
    const latestProjection = await ports.loadPersistedProjection(authority);
    if (!latestProjection) throw new Error("mirror_append_projection_missing");
    validateExactOutboxSummary(summary, latestProjection, authority);
    const settled = applyMirrorAppendReceipt(latestProjection, authority, receipt, new Date().toISOString());
    await ports.savePostFrontierProjection(settled, authority, summary);
    await ports.acknowledgeOutboxItem(summary.itemId, summary.conversationId, authority);
    const journal = await ports.loadJournal(authority.journeyId);
    if (journal.records.some((record) => record.authority.runId === authority.runId)) {
      await ports.advanceJournal(authority, "outbox_enqueued", "settled");
    }
    return settled;
  });
}

export type TurnFinalizationCoordinator = {
  subscribe(listener: (event: TurnFinalizationEvent) => void): () => void;
  finalizeCompletedTurn(input: {
    authority: JourneySettlementAuthority;
    correlation: TurnCorrelation;
    projection: JourneyConversation;
    decorate?: (settled: JourneyConversation) => JourneyConversation;
  }, ports: TurnFinalizationPorts): Promise<JourneyConversation>;
  finalizeInterruptedTurn(input: {
    authority: JourneySettlementAuthority;
    projection: JourneyConversation;
  }, ports: Pick<TurnFinalizationPorts, "loadActiveEvidence" | "cleanupLease"> & {
    saveInterruptedProjection(
      projection: JourneyConversation,
      authority: JourneySettlementAuthority,
    ): Promise<void>;
  }): Promise<JourneyConversation>;
  publishSettled(authority: JourneySettlementAuthority, projection: JourneyConversation): void;
  notifyDurableEvidenceChanged(journeyId: string): void;
};

export function createTurnFinalizationCoordinator(): TurnFinalizationCoordinator {
  const listeners = new Set<(event: TurnFinalizationEvent) => void>();
  const queues = new Map<string, Promise<unknown>>();
  const lastPublished = new Map<string, JourneyConversation>();

  function emit(event: TurnFinalizationEvent): void {
    for (const listener of [...listeners]) listener(event);
  }

  function publish(
    authority: JourneySettlementAuthority,
    projection: JourneyConversation,
    phase: TurnPresentationPhase,
    error?: string,
  ): void {
    const key = `${authority.journeyId}:${authority.generation}`;
    const previous = lastPublished.get(key);
    const merged = previous ? upgradeMirrorCommitments(projection, previous) : projection;
    lastPublished.set(key, merged);
    emit({ type: "presentation", authority, projection: merged, phase, ...(error ? { error } : {}) });
  }

  function serialize<T>(journeyId: string, task: () => Promise<T>): Promise<T> {
    const previous = queues.get(journeyId) ?? Promise.resolve();
    const next = previous.then(task, task);
    queues.set(journeyId, next.catch(() => undefined));
    return next;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    finalizeCompletedTurn(input, ports) {
      const { authority, correlation } = input;
      return serialize(authority.journeyId, async () => {
        let settled = input.projection;
        try {
          const journal = await ports.loadJournal(authority.journeyId);
          const journalRecord = requireExactTurnJournalRecord(journal, authority);
          if (decideTurnJournalTerminal(journalRecord) !== "completed") {
            throw new Error("turn_journal_completed_outcome_required");
          }
          const execution = journalRecord.terminalEvidence?.piExecution;
          if (!execution) throw new Error("turn_journal_completed_evidence_missing");
          settled = replaceJourneyConversationMessages(
            settled,
            settled.messages.map((message) => message.id === authority.harnessAssistantMessageId
              ? { ...message, content: execution.assistantText }
              : message),
          );
          settled = applyPiExecutionEvidence(settled, correlation, {
            userEntryId: execution.userEntryId,
            assistantEntryId: execution.assistantEntryId,
            leafEntryId: execution.leafEntryId,
            entryCount: execution.entryCount,
            sessionFile: authority.piSessionFile,
            committedAt: execution.committedAt,
          });
          settled = commitHarnessTurn(settled, correlation, new Date().toISOString());
          settled = input.decorate?.(settled) ?? settled;
          const projectionAtFrontier = settled;
          const settlement = await executeCompletedSettlement({
            projection: projectionAtFrontier,
            authority,
            cleanupLeaseAuthority: authority,
          }, {
            loadActiveEvidence: ports.loadActiveEvidence,
            saveActiveProjection: (projection, exactAuthority) => journeyPersistenceCoordinator.run(
              exactAuthority, "pre_frontier", () => ports.saveProjection(projection, exactAuthority),
            ),
            enqueueOutbox: async (projection, exactAuthority) => {
              const summary = await journeyPersistenceCoordinator.run(
                exactAuthority, "pre_frontier", () => enqueueProjectionOutbox(projection, exactAuthority, ports),
              );
              emit({ type: "durable_evidence_changed", journeyId: exactAuthority.journeyId });
              return summary;
            },
            cleanupLease: ports.cleanupLease,
            onLeaseReleased: () => publish(authority, projectionAtFrontier, "frontier"),
            appendAndAcknowledge: (projection, summary, exactAuthority) => (
              appendAndAcknowledgeProjection(projection, exactAuthority, summary, ports)
            ),
          });
          settled = settlement.projection;
          publish(authority, settled, "settled");
          emit({ type: "durable_evidence_changed", journeyId: authority.journeyId });
          return settled;
        } catch (error) {
          publish(authority, settled, "failed", error instanceof Error ? error.message : String(error));
          emit({ type: "durable_evidence_changed", journeyId: authority.journeyId });
          throw error;
        }
      });
    },

    finalizeInterruptedTurn(input, ports) {
      const { authority } = input;
      return serialize(authority.journeyId, async () => {
        const projection = await journeyPersistenceCoordinator.run(
          authority, "interrupted", () => executeInterruptedSettlement({
            projection: input.projection,
            authority,
          }, {
            loadActiveEvidence: ports.loadActiveEvidence,
            saveInterruptedProjection: ports.saveInterruptedProjection,
            cleanupLease: ports.cleanupLease,
          }),
        );
        publish(authority, projection, "interrupted");
        emit({ type: "durable_evidence_changed", journeyId: authority.journeyId });
        return projection;
      });
    },

    publishSettled(authority, projection) {
      publish(authority, projection, "settled");
      emit({ type: "durable_evidence_changed", journeyId: authority.journeyId });
    },

    notifyDurableEvidenceChanged(journeyId) {
      emit({ type: "durable_evidence_changed", journeyId });
    },
  };
}

export const turnFinalizationCoordinator = createTurnFinalizationCoordinator();
