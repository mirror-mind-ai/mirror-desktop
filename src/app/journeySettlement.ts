import type { JourneyConversation } from "../domain/journeyConversation";
import {
  createJourneySettlementAuthority,
  type JourneySettlementAuthority,
} from "../domain/journeySettlementAuthority";

export { createJourneySettlementAuthority };
export type { JourneySettlementAuthority };

export type ExactLeaseAuthority = {
  journeyId: string;
  runId: string;
};

export type ActiveSettlementEvidence = Readonly<{
  activeGeneration: number;
  currentRunId: string;
  currentTurnId: string;
}>;

export type GenerationScopedOutboxAuthority = Readonly<{
  itemId: string;
  journeyId: string;
  threadId: string;
  generation: number;
  conversationId: string;
}>;

function projectionMatchesAuthority(
  authority: JourneySettlementAuthority,
  projection: JourneyConversation,
): boolean {
  const turn = projection.reconciliation.turns.find((candidate) => candidate.turnId === authority.turnId);
  return projection.journeyId === authority.journeyId
    && projection.id === authority.threadId
    && projection.liveIdentity.journeyId === authority.journeyId
    && projection.liveIdentity.harnessConversationId === authority.threadId
    && projection.liveIdentity.generation === authority.generation
    && projection.liveIdentity.piSessionId === authority.piSessionId
    && projection.liveIdentity.piSessionFile === authority.piSessionFile
    && projection.liveIdentity.mirrorConversationId === authority.mirrorConversationId
    && turn?.runId === authority.runId
    && turn.harness.userMessageId === authority.harnessUserMessageId
    && turn.harness.assistantMessageId === authority.harnessAssistantMessageId;
}

export function validatePreFrontierSettlement(
  authority: JourneySettlementAuthority,
  projection: JourneyConversation,
  evidence: ActiveSettlementEvidence,
): void {
  if (!projectionMatchesAuthority(authority, projection)
    || evidence.activeGeneration !== authority.generation
    || evidence.currentRunId !== authority.runId
    || evidence.currentTurnId !== authority.turnId) {
    throw new Error("settlement_pre_frontier_authority_stale");
  }
}

export function validatePostFrontierSettlement(
  authority: JourneySettlementAuthority,
  projection: JourneyConversation,
  outbox: GenerationScopedOutboxAuthority,
): void {
  if (!projectionMatchesAuthority(authority, projection)
    || outbox.itemId !== authority.turnId
    || outbox.journeyId !== authority.journeyId
    || outbox.threadId !== authority.threadId
    || outbox.generation !== authority.generation
    || outbox.conversationId !== authority.mirrorConversationId) {
    throw new Error("settlement_post_frontier_authority_mismatch");
  }
}

export type CompletedSettlementInput<
  TProjection extends JourneyConversation,
  TOutbox extends GenerationScopedOutboxAuthority,
> = {
  projection: TProjection;
  authority: JourneySettlementAuthority;
  cleanupLeaseAuthority?: JourneySettlementAuthority;
  existingOutbox?: TOutbox;
};

export type CompletedSettlementDependencies<
  TProjection extends JourneyConversation,
  TOutbox extends GenerationScopedOutboxAuthority,
> = {
  loadActiveEvidence: (authority: JourneySettlementAuthority) => Promise<ActiveSettlementEvidence>;
  saveActiveProjection: (projection: TProjection, authority: JourneySettlementAuthority) => Promise<void>;
  enqueueOutbox: (projection: TProjection, authority: JourneySettlementAuthority) => Promise<TOutbox>;
  cleanupLease?: (authority: JourneySettlementAuthority) => Promise<void>;
  onLeaseReleased?: () => Promise<void> | void;
  appendAndAcknowledge: (
    projection: TProjection,
    outbox: TOutbox,
    authority: JourneySettlementAuthority,
  ) => Promise<TProjection>;
};

export async function executeCompletedSettlement<
  TProjection extends JourneyConversation,
  TOutbox extends GenerationScopedOutboxAuthority,
>(
  input: CompletedSettlementInput<TProjection, TOutbox>,
  dependencies: CompletedSettlementDependencies<TProjection, TOutbox>,
): Promise<{ projection: TProjection; outbox: TOutbox }> {
  let outbox = input.existingOutbox;
  if (outbox === undefined) {
    validatePreFrontierSettlement(
      input.authority,
      input.projection,
      await dependencies.loadActiveEvidence(input.authority),
    );
    await dependencies.saveActiveProjection(input.projection, input.authority);
    validatePreFrontierSettlement(
      input.authority,
      input.projection,
      await dependencies.loadActiveEvidence(input.authority),
    );
    outbox = await dependencies.enqueueOutbox(input.projection, input.authority);
  }
  validatePostFrontierSettlement(input.authority, input.projection, outbox);
  if (input.cleanupLeaseAuthority) {
    if (!dependencies.cleanupLease) {
      throw new Error("exact_settlement_cleanup_dependency_missing");
    }
    if (input.cleanupLeaseAuthority.journeyId !== input.authority.journeyId
      || input.cleanupLeaseAuthority.runId !== input.authority.runId) {
      throw new Error("exact_settlement_cleanup_authority_mismatch");
    }
    await dependencies.cleanupLease(input.cleanupLeaseAuthority);
    await dependencies.onLeaseReleased?.();
  }
  const projection = await dependencies.appendAndAcknowledge(input.projection, outbox, input.authority);
  return { projection, outbox };
}

export async function executeInterruptedSettlement<TProjection extends JourneyConversation>(
  input: { projection: TProjection; authority: JourneySettlementAuthority },
  dependencies: {
    loadActiveEvidence: (authority: JourneySettlementAuthority) => Promise<ActiveSettlementEvidence>;
    saveInterruptedProjection: (
      projection: TProjection,
      authority: JourneySettlementAuthority,
    ) => Promise<void>;
    cleanupLease: (authority: JourneySettlementAuthority) => Promise<void>;
  },
): Promise<TProjection> {
  validatePreFrontierSettlement(
    input.authority,
    input.projection,
    await dependencies.loadActiveEvidence(input.authority),
  );
  await dependencies.saveInterruptedProjection(input.projection, input.authority);
  validatePreFrontierSettlement(
    input.authority,
    input.projection,
    await dependencies.loadActiveEvidence(input.authority),
  );
  await dependencies.cleanupLease(input.authority);
  return input.projection;
}

export async function rollbackRejectedReservation<
  TProjection,
  TInspection,
  TAuthority extends ExactLeaseAuthority,
>(
  input: { projection: TProjection; authority: TAuthority },
  dependencies: {
    saveRollbackProjection: (projection: TProjection) => Promise<void>;
    inspectAfterRollback: () => Promise<TInspection>;
    isExactFinalizingLease: (inspection: TInspection, authority: TAuthority) => boolean;
    cleanupExactFinalizingLease: (authority: TAuthority) => Promise<void>;
  },
): Promise<TInspection> {
  await dependencies.saveRollbackProjection(input.projection);
  const inspection = await dependencies.inspectAfterRollback();
  if (dependencies.isExactFinalizingLease(inspection, input.authority)) {
    await dependencies.cleanupExactFinalizingLease(input.authority);
  }
  return inspection;
}
