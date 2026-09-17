import type { ConversationAvailability } from "./conversationAvailability";

export type ConversationRecoveryRouteId =
  | "retry_mirror_sync"
  | "recover_preserved_response"
  | "preserve_attempt_and_continue"
  | "start_new_conversation"
  | "reset_agent_context";

export type ConversationRecoveryRoute = Readonly<{
  id: ConversationRecoveryRouteId;
  label: string;
  consequence: string;
}>;

export type BlockingTurnRecoveryEvidence = Readonly<{
  phase: "admitted" | "running" | "terminal_durable" | "projected";
  terminalOutcome: "completed" | "cancelled" | "spawn_failed" | "process_died" | null;
  hasFreshCompletePiEvidence: boolean;
  exactRunInactive: boolean;
}>;

export type ConversationRecoveryInput = Readonly<{
  availability: ConversationAvailability;
  blockingTurn?: BlockingTurnRecoveryEvidence;
  mirrorSynchronization?: "none" | "exact_repair_available" | "legacy_gap";
  canCreateDesktopConversation: boolean;
}>;

const retryMirrorSync: ConversationRecoveryRoute = {
  id: "retry_mirror_sync",
  label: "Retry Mirror synchronization",
  consequence: "Retries durable Mirror delivery without running the agent again.",
};

const recoverPreservedResponse: ConversationRecoveryRoute = {
  id: "recover_preserved_response",
  label: "Recover preserved response",
  consequence: "Projects the exact response already preserved in the durable turn journal.",
};

const preserveAttemptAndContinue: ConversationRecoveryRoute = {
  id: "preserve_attempt_and_continue",
  label: "Preserve attempt and continue",
  consequence: "Keeps the durable attempt evidence and continues without claiming a missing response was restored.",
};

const startNewConversation: ConversationRecoveryRoute = {
  id: "start_new_conversation",
  label: "Start new Conversation",
  consequence: "Creates a separate local Conversation without changing this one.",
};

const resetAgentContext: ConversationRecoveryRoute = {
  id: "reset_agent_context",
  label: "Reset agent context",
  consequence: "Preserves this generation and prepares a new agent context.",
};

export function decideConversationRecoveryRoutes(
  input: ConversationRecoveryInput,
): ConversationRecoveryRoute[] {
  const routes: ConversationRecoveryRoute[] = [];
  const blocking = input.blockingTurn;

  if (blocking) {
    if (!blocking.exactRunInactive) return routes;
    if (blocking.phase === "terminal_durable"
      && blocking.terminalOutcome === "completed"
      && blocking.hasFreshCompletePiEvidence) {
      routes.push(recoverPreservedResponse);
    }
    routes.push(preserveAttemptAndContinue);
    return routes;
  }

  if (input.mirrorSynchronization === "exact_repair_available") {
    routes.push(retryMirrorSync);
  }
  if (input.mirrorSynchronization !== "none") {
    if (input.availability.canStartNewConversation && input.canCreateDesktopConversation) {
      routes.push(startNewConversation);
    }
    if (input.availability.canResetAgentContext) routes.push(resetAgentContext);
  }
  return routes;
}
