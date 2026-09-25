import type { ConversationAvailability } from "./conversationAvailability";

export type ConversationRecoveryRouteId =
  | "retry_mirror_sync"
  | "start_new_conversation"
  | "reset_agent_context";

export type ConversationRecoveryRoute = Readonly<{
  id: ConversationRecoveryRouteId;
  label: string;
  consequence: string;
}>;

export type ConversationRecoveryInput = Readonly<{
  availability: ConversationAvailability;
  /**
   * True while the exact native run is still finishing. CR042 makes that the only meaning
   * of a blocking turn, and CR088 proved no recovery route can apply while it holds.
   */
  blockingTurnActive?: boolean;
  mirrorSynchronization?: "none" | "exact_repair_available" | "legacy_gap";
  canCreateDesktopConversation: boolean;
}>;

const retryMirrorSync: ConversationRecoveryRoute = {
  id: "retry_mirror_sync",
  label: "Retry Mirror synchronization",
  consequence: "Retries durable Mirror delivery without running the agent again.",
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

  // Nothing is recoverable while the exact native run is still finishing; a turn stranded
  // at terminal_durable/completed is settled automatically by native reconciliation.
  if (input.blockingTurnActive) return routes;

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
