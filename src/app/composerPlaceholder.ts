import type { ConversationAvailabilityCondition } from "../domain/conversationAvailability";

export type ComposerPlaceholderInput = {
  availabilityCondition: ConversationAvailabilityCondition;
  isRecordingTurn: boolean;
  isAgentResponding: boolean;
  hasUserMessage: boolean;
};

export function composerPlaceholder({
  availabilityCondition,
  isRecordingTurn,
  isAgentResponding,
  hasUserMessage,
}: ComposerPlaceholderInput): string {
  if (availabilityCondition === "conversation_authority_unavailable") {
    return "This conversation authority must be inspected before another message can be sent.";
  }
  if (availabilityCondition === "local_admission_unavailable") {
    return "The previous local turn must be made safe before another message can be sent.";
  }
  if (availabilityCondition === "recovery_inspection") {
    return "Mirror Desktop is checking whether a new turn can be persisted safely.";
  }
  if (availabilityCondition === "native_authority_unknown") {
    return "Mirror Desktop is checking native turn authority before sending.";
  }
  if (availabilityCondition === "runtime_unbound") {
    return "Connect a Mirror runtime before sending. You can keep drafting here.";
  }
  if (availabilityCondition === "native_capacity_full") {
    return "All agent slots are occupied. You can keep drafting while one becomes available.";
  }
  if (availabilityCondition === "journey_lease_occupied") {
    return "Another Conversation in this Journey is active. You can keep drafting here.";
  }
  if (isRecordingTurn) {
    return "Prepare your next message. You can send it after this turn is recorded.";
  }
  if (isAgentResponding || availabilityCondition === "live_turn") {
    return "Prepare your next message. You can send it when the current response is complete.";
  }
  return hasUserMessage
    ? "What would you like to do next?"
    : "What would you like to work on?";
}
