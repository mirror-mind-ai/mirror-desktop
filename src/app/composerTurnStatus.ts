import type { AgentRunStatus } from "../agent/agentRun";

export type ComposerTurnStatus = "working" | "finishing" | undefined;

type ComposerTurnStatusInput = {
  agentRunStatus: AgentRunStatus;
  runBelongsToSelectedJourney: boolean;
  isStreaming: boolean;
  isFinalizingTurn: boolean;
  reconciliationBlocksInvocation: boolean;
  mirrorRepairPending: boolean;
};

export function shouldShowConversationSyncNotice(input: {
  mirrorRepairPending: boolean;
  legacyMirrorGap: boolean;
  isStreaming: boolean;
  isFinalizingTurn: boolean;
}): boolean {
  return input.mirrorRepairPending
    && !input.legacyMirrorGap
    && !input.isStreaming
    && !input.isFinalizingTurn;
}

export function deriveComposerTurnStatus({
  agentRunStatus,
  runBelongsToSelectedJourney,
  isStreaming,
  isFinalizingTurn,
  reconciliationBlocksInvocation,
  mirrorRepairPending,
}: ComposerTurnStatusInput): ComposerTurnStatus {
  if (!runBelongsToSelectedJourney) {
    return undefined;
  }

  if (isStreaming || agentRunStatus === "running") {
    return "working";
  }

  if (isFinalizingTurn) {
    return "finishing";
  }

  if (mirrorRepairPending) {
    return undefined;
  }

  if (reconciliationBlocksInvocation) {
    return "finishing";
  }

  return undefined;
}

/**
 * CR161: `Finishing` reaches the screen through two sources, and until this every exit was attached
 * to one of them. The settlement flag (`isFinalizingTurn`) is set inside the settlement path and
 * cleared in its `finally`. The reconciliation block is a durable fact about the conversation — the
 * provider committed and the projection has not — and sets nothing in the runtime state.
 *
 * Field, 2026-10-17, production alpha.52: the journal froze at `running` before settlement began,
 * so the flag was never set; the composer said *Finishing* through the second source; and the offer,
 * reading only the first, said `not_finishing` while the screen said *Finishing*. One derivation,
 * read by the surface and by every exit, cannot disagree with itself.
 *
 * `since` is the moment the wait can honestly be counted from. For the settlement source it is the
 * settlement's own clock. For the reconciliation source it is the provider's commit — the durable
 * timestamp the conversation already carries — rather than a renderer clock that would reset on
 * every selection change. When neither is known the start is left unknown, and every threshold
 * stays silent rather than counting from an invented moment.
 */
export type FinishingSource = "settlement" | "reconciliation";

export type ComposerFinishing = Readonly<{ source: FinishingSource; since: number | undefined }>;

export function deriveComposerFinishing(input: {
  status: ComposerTurnStatus;
  isFinalizingTurn: boolean;
  /** The settlement path's own `finishingSince` for this Journey, when it is finalizing. */
  settlementSince?: number;
  /** `pi.committedAt` of the newest Nautilus turn when its Pi body is committed. */
  providerCommittedAt?: string;
}): ComposerFinishing | undefined {
  if (input.status !== "finishing") return undefined;
  if (input.isFinalizingTurn) return { source: "settlement", since: input.settlementSince };
  const committed = input.providerCommittedAt === undefined ? Number.NaN : Date.parse(input.providerCommittedAt);
  return { source: "reconciliation", since: Number.isFinite(committed) ? committed : undefined };
}
