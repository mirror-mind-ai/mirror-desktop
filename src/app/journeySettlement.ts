export type ExactLeaseAuthority = {
  journeyId: string;
  runId: string;
};

export type CompletedSettlementInput<TProjection, TOutbox, TAuthority extends ExactLeaseAuthority> = {
  projection: TProjection;
  authority?: TAuthority;
  existingOutbox?: TOutbox;
};

export type CompletedSettlementDependencies<TProjection, TOutbox, TAuthority extends ExactLeaseAuthority> = {
  saveProjection: (projection: TProjection) => Promise<void>;
  enqueueOutbox: (projection: TProjection) => Promise<TOutbox>;
  cleanupLease?: (authority: TAuthority) => Promise<void>;
  appendAndAcknowledge: (projection: TProjection, outbox: TOutbox) => Promise<TProjection>;
};

export async function executeCompletedSettlement<
  TProjection,
  TOutbox,
  TAuthority extends ExactLeaseAuthority,
>(
  input: CompletedSettlementInput<TProjection, TOutbox, TAuthority>,
  dependencies: CompletedSettlementDependencies<TProjection, TOutbox, TAuthority>,
): Promise<{ projection: TProjection; outbox: TOutbox }> {
  let outbox = input.existingOutbox;
  if (outbox === undefined) {
    await dependencies.saveProjection(input.projection);
    outbox = await dependencies.enqueueOutbox(input.projection);
  }
  if (input.authority) {
    if (!dependencies.cleanupLease) {
      throw new Error("exact_settlement_cleanup_dependency_missing");
    }
    await dependencies.cleanupLease(input.authority);
  }
  const projection = await dependencies.appendAndAcknowledge(input.projection, outbox);
  return { projection, outbox };
}

export async function executeInterruptedSettlement<TProjection, TAuthority extends ExactLeaseAuthority>(
  input: { projection: TProjection; authority: TAuthority },
  dependencies: {
    saveInterruptedProjection: (projection: TProjection) => Promise<void>;
    cleanupLease: (authority: TAuthority) => Promise<void>;
  },
): Promise<TProjection> {
  await dependencies.saveInterruptedProjection(input.projection);
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
