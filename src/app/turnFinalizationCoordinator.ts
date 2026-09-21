import type { TurnCorrelation } from "../agent/agentStream";
import {
  createJourneySettlementAuthority,
  executeCompletedSettlement,
  executeInterruptedSettlement,
  type ActiveSettlementEvidence,
  type JourneySettlementAuthority,
} from "./journeySettlement";
import { journeyPersistenceCoordinator } from "./journeyPersistenceCoordinator";
import {
  decideTurnJournalTerminal,
  hasFreshCompleteTurnJournalEvidence,
  isTurnJournalSuccessorEligible,
  requireExactTurnJournalRecord,
  type TurnJournalDocument,
  type TurnJournalRecord,
} from "./turnJournal";
import type { MirrorAppendOutboxSummary } from "./mirrorAppendOutboxStorage";
import {
  resolvePersistedSettlementRecovery,
  resolveRetainedLeaseForOutboxRecovery,
} from "./journeySettlementRecovery";
import {
  validatePiInvocationRegistryInspection,
  type PiInvocationRegistryInspection,
} from "./piInvocationOccupancy";
import {
  applyMirrorAppendReceipt,
  applyPiExecutionEvidence,
  createMirrorAppendOutboxItem,
  type MirrorAppendOutboxItem,
  type MirrorAppendReceipt,
} from "../domain/mirrorAppendOutbox";
import { commitHarnessTurn, stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import {
  projectPiBackedConversationSurface,
  type PiConversationSurfaceInspection,
} from "../domain/piBackedConversationSurface";
import {
  createDedicatedJourneyConversation,
  replaceJourneyConversationMessages,
  type JourneyConversation,
} from "../domain/journeyConversation";
import { createRunAuthority } from "../domain/runAuthority";
import type { NautilusJourneyThread } from "../domain/nautilusJourneyThread";

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

export type ConvergenceDeps = {
  ports: TurnFinalizationPorts;
  reconcileDeliveryDebt(journeyId: string): Promise<MirrorAppendOutboxSummary[]>;
  loadProjectionByCoords(
    journeyId: string,
    generation: number,
    threadId: string,
  ): Promise<JourneyConversation | undefined>;
  deliverPiBackedOutboxItem(itemId: string, journeyId: string): Promise<MirrorAppendReceipt>;
  loadThread(journeyId: string): Promise<NautilusJourneyThread | undefined>;
  inspectTranscript(
    journeyId: string,
    threadId: string,
    generation: number,
    piSessionId: string,
    piSessionFile: string,
  ): Promise<PiConversationSurfaceInspection>;
  inspectNativeOccupancy(): Promise<PiInvocationRegistryInspection>;
  onExactError(
    identity: TurnJournalRecord["authority"] | JourneySettlementAuthority,
    message: string | undefined,
  ): void;
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
  convergeDelivery(journeyId: string, deps: ConvergenceDeps): Promise<boolean>;
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

    convergeDelivery(journeyId, deps) {
      const { ports } = deps;
      const convergeLegacyItem = async (item: MirrorAppendOutboxSummary): Promise<boolean> => {
        const journal = await ports.loadJournal(item.journeyId);
        let exactIdentity: TurnJournalRecord["authority"] | JourneySettlementAuthority | undefined =
          journal.records.find((record) => (
            record.authority.turnId === item.itemId
            && record.authority.journeyId === item.journeyId
            && record.authority.threadId === item.threadId
            && record.authority.generation === item.generation
            && record.authority.mirrorConversationId === item.conversationId
          ))?.authority;
        try {
          const projected = await deps.loadProjectionByCoords(item.journeyId, item.generation, item.threadId);
          if (!projected) {
            await deps.deliverPiBackedOutboxItem(item.itemId, item.journeyId);
            if (exactIdentity) {
              deps.onExactError(
                exactIdentity,
                "Mirror delivery was accepted; local acknowledgement awaits Pi-backed projection reconstruction.",
              );
              return false;
            }
            throw new Error("settlement_recovery_evidence_missing");
          }
          const recovery = resolvePersistedSettlementRecovery(projected, item);
          if (recovery.status === "blocked") throw new Error(recovery.diagnostic);
          const { authority } = recovery;
          exactIdentity = authority;
          if (journal.records.some((record) => record.authority.runId === authority.runId)) {
            await ports.advanceJournal(authority, ["projected", "outbox_enqueued"], "outbox_enqueued");
          }
          const inspection = await deps.inspectNativeOccupancy();
          if (!validatePiInvocationRegistryInspection(inspection)) {
            throw new Error("mirror_outbox_native_lease_inspection_invalid");
          }
          if (resolveRetainedLeaseForOutboxRecovery(inspection, authority)) {
            await ports.cleanupLease(authority);
          }
          const settled = await appendAndAcknowledgeProjection(recovery.projection, authority, item, ports);
          publish(authority, settled, "settled");
          deps.onExactError(authority, undefined);
          return true;
        } catch (error) {
          if (exactIdentity) {
            deps.onExactError(exactIdentity, error instanceof Error ? error.message : String(error));
          }
          throw error;
        }
      };
      const convergePiBackedItem = async (
        item: MirrorAppendOutboxSummary,
        record: TurnJournalRecord,
      ): Promise<boolean> => {
        let authority: JourneySettlementAuthority | undefined;
        try {
          const storedProjection = await deps.loadProjectionByCoords(item.journeyId, item.generation, item.threadId);
          const thread = await deps.loadThread(item.journeyId);
          const generation = thread?.generations.find((candidate) => (
            candidate.generation === item.generation
            && candidate.piSessionId === record.authority.piSessionId
            && candidate.mirrorConversationId === item.conversationId
            && Boolean(candidate.piSessionFile)
            && Boolean(candidate.activationReceipt?.activatedAt)
          ));
          if (!thread || thread.threadId !== item.threadId || !generation) {
            throw new Error("mirror_append_complete_durable_projection_missing");
          }
          const recoveryThread = {
            ...thread,
            activeGeneration: generation.generation,
            generations: thread.generations.map((candidate) => ({
              ...candidate,
              status: candidate.generation === generation.generation ? "ready" as const : "inactive" as const,
            })),
          };
          const persistedProjection = storedProjection
            ?? createDedicatedJourneyConversation({ thread: recoveryThread, initialMessages: [] });
          if (!persistedProjection.liveIdentity.activationReceiptActivatedAt) {
            throw new Error("mirror_append_complete_durable_projection_missing");
          }
          const correlation = {
            schemaVersion: "0.2.0" as const,
            journeyId: record.authority.journeyId,
            threadId: record.authority.threadId,
            harnessConversationId: record.authority.threadId,
            piSessionId: record.authority.piSessionId,
            mirrorConversationId: record.authority.mirrorConversationId,
            generation: record.authority.generation,
            activationReceiptActivatedAt: persistedProjection.liveIdentity.activationReceiptActivatedAt,
            turnId: record.authority.turnId,
            runId: record.authority.runId,
            harnessUserMessageId: record.authority.harnessUserMessageId,
            harnessAssistantMessageId: record.authority.harnessAssistantMessageId,
          };
          authority = createJourneySettlementAuthority(
            createRunAuthority(correlation, persistedProjection.liveIdentity),
          );
          const execution = record.terminalEvidence?.piExecution;
          if (!execution || !hasFreshCompleteTurnJournalEvidence(record)) {
            throw new Error("mirror_append_complete_durable_evidence_missing");
          }
          const transcriptInspection = await deps.inspectTranscript(
            authority.journeyId,
            authority.threadId,
            authority.generation,
            authority.piSessionId,
            authority.piSessionFile,
          );
          let projection = persistedProjection;
          if (!projection.reconciliation.turns.some((turn) => turn.turnId === correlation.turnId)) {
            const userEntry = transcriptInspection.entries.find((entry) => entry.entryId === execution.userEntryId);
            const assistantEntry = transcriptInspection.entries.find(
              (entry) => entry.entryId === execution.assistantEntryId,
            );
            if (!userEntry || !assistantEntry) {
              throw new Error("mirror_append_complete_durable_evidence_missing");
            }
            projection = stageCorrelatedTurn(
              projection,
              correlation,
              {
                id: correlation.harnessUserMessageId,
                role: "user",
                content: userEntry.visibleText,
                createdAt: userEntry.timestamp,
              },
              {
                id: correlation.harnessAssistantMessageId,
                role: "assistant",
                content: execution.assistantText,
                createdAt: assistantEntry.timestamp,
              },
            );
          }
          projection = applyPiExecutionEvidence(projection, correlation, {
            userEntryId: execution.userEntryId,
            assistantEntryId: execution.assistantEntryId,
            leafEntryId: execution.leafEntryId,
            entryCount: execution.entryCount,
            sessionFile: authority.piSessionFile,
            committedAt: execution.committedAt,
          });
          projection = commitHarnessTurn(projection, correlation, execution.committedAt);
          projection = projectPiBackedConversationSurface(projection, transcriptInspection);
          const inspection = await deps.inspectNativeOccupancy();
          if (resolveRetainedLeaseForOutboxRecovery(inspection, authority)) {
            await ports.cleanupLease(authority);
          }
          const receipt = await deps.deliverPiBackedOutboxItem(item.itemId, item.journeyId);
          const persistedTargetMirror = persistedProjection.reconciliation.turns.find(
            (turn) => turn.turnId === correlation.turnId,
          )?.mirror;
          const projectionAlreadyCommitted = persistedTargetMirror?.state === "committed"
            && persistedTargetMirror.userMessageId === correlation.harnessUserMessageId
            && persistedTargetMirror.assistantMessageId === correlation.harnessAssistantMessageId
            && receipt.messages[0]?.id === correlation.harnessUserMessageId
            && receipt.messages[1]?.id === correlation.harnessAssistantMessageId;
          const settled = applyMirrorAppendReceipt(projection, authority, receipt, new Date().toISOString());
          if (!projectionAlreadyCommitted) {
            await ports.savePostFrontierProjection(settled, authority, item);
          }
          await ports.advanceJournal(authority, "outbox_enqueued", "settled");
          await ports.acknowledgeOutboxItem(item.itemId, item.conversationId, authority);
          publish(authority, settled, "settled");
          deps.onExactError(authority, undefined);
          return true;
        } catch (error) {
          if (authority) {
            deps.onExactError(authority, error instanceof Error ? error.message : String(error));
          }
          throw error;
        }
      };
      const resumeProjectedRecord = async (record: TurnJournalRecord): Promise<void> => {
        const projection = await deps.loadProjectionByCoords(
          record.authority.journeyId,
          record.authority.generation,
          record.authority.threadId,
        );
        if (!projection) throw new Error("mirror_append_complete_durable_projection_missing");
        const correlation = {
          schemaVersion: "0.2.0" as const,
          journeyId: record.authority.journeyId,
          threadId: record.authority.threadId,
          harnessConversationId: record.authority.threadId,
          piSessionId: record.authority.piSessionId,
          mirrorConversationId: record.authority.mirrorConversationId,
          generation: record.authority.generation,
          activationReceiptActivatedAt: projection.liveIdentity.activationReceiptActivatedAt ?? "",
          turnId: record.authority.turnId,
          runId: record.authority.runId,
          harnessUserMessageId: record.authority.harnessUserMessageId,
          harnessAssistantMessageId: record.authority.harnessAssistantMessageId,
        };
        const authority = createJourneySettlementAuthority(
          createRunAuthority(correlation, projection.liveIdentity),
        );
        const settlement = await executeCompletedSettlement({
          projection,
          authority,
          projectionAlreadyDurable: true,
        }, {
          loadActiveEvidence: ports.loadActiveEvidence,
          saveActiveProjection: ports.saveProjection,
          enqueueOutbox: (candidate, exactAuthority) => journeyPersistenceCoordinator.run(
            exactAuthority, "pre_frontier", () => enqueueProjectionOutbox(candidate, exactAuthority, ports),
          ),
          appendAndAcknowledge: (candidate, summary, exactAuthority) => (
            appendAndAcknowledgeProjection(candidate, exactAuthority, summary, ports)
          ),
        });
        publish(authority, settlement.projection, "settled");
        deps.onExactError(authority, undefined);
      };
      return serialize(journeyId, async () => {
        const failures: string[] = [];
        let settledAny = false;
        const items = await deps.reconcileDeliveryDebt(journeyId);
        const orderedItems = [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
        const remainingItemIds = new Set(orderedItems.map((item) => item.itemId));
        const legacyItems = orderedItems.filter((item) => item.schemaVersion !== "1.1.0");
        const piBackedItems = orderedItems.filter((item) => item.schemaVersion === "1.1.0");
        for (const item of legacyItems) {
          try {
            if (await convergeLegacyItem(item)) {
              settledAny = true;
              remainingItemIds.delete(item.itemId);
            }
          } catch (error) {
            failures.push(`${item.itemId}:${error instanceof Error ? error.message : String(error)}`);
          }
        }
        const journal = piBackedItems.length > 0 ? await ports.loadJournal(journeyId) : undefined;
        for (const item of piBackedItems) {
          const record = journal?.records.find((candidate) => (
            candidate.authority.turnId === item.itemId
            && candidate.authority.journeyId === item.journeyId
            && candidate.authority.threadId === item.threadId
            && candidate.authority.generation === item.generation
            && candidate.authority.mirrorConversationId === item.conversationId
          ));
          if (!record) {
            failures.push(`${item.itemId}:mirror_append_pi_backed_journal_authority_missing`);
            continue;
          }
          try {
            if (await convergePiBackedItem(item, record)) {
              settledAny = true;
              remainingItemIds.delete(item.itemId);
            }
          } catch (error) {
            failures.push(`${item.itemId}:${error instanceof Error ? error.message : String(error)}`);
          }
        }
        const resumeJournal = await ports.loadJournal(journeyId);
        const projectedRecord = [...resumeJournal.records].reverse().find((record) => (
          record.phase === "projected"
          && record.terminalOutcome === "completed"
          && isTurnJournalSuccessorEligible(record)
          && !remainingItemIds.has(record.authority.turnId)
        ));
        if (projectedRecord) {
          try {
            await resumeProjectedRecord(projectedRecord);
            settledAny = true;
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            failures.push(`${projectedRecord.authority.turnId}:${reason}`);
            deps.onExactError(projectedRecord.authority, reason);
          }
        }
        emit({ type: "durable_evidence_changed", journeyId });
        if (failures.length > 0) {
          throw new Error(`synchronization_convergence_partial:${failures.join(",")}`);
        }
        return settledAny;
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
