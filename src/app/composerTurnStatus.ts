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

export function deriveComposerTurnStatus({
  agentRunStatus,
  runBelongsToSelectedJourney,
  isStreaming,
  isFinalizingTurn,
  reconciliationBlocksInvocation,
  mirrorRepairPending,
}: ComposerTurnStatusInput): ComposerTurnStatus {
  if (mirrorRepairPending || !runBelongsToSelectedJourney) {
    return undefined;
  }

  if (isStreaming || agentRunStatus === "running") {
    return "working";
  }

  if (isFinalizingTurn || reconciliationBlocksInvocation) {
    return "finishing";
  }

  return undefined;
}
