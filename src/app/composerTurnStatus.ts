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
