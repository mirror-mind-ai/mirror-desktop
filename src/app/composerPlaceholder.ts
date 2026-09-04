export type ComposerPlaceholderInput = {
  requiresConversationRestore: boolean;
  isRecordingTurn: boolean;
  isAgentResponding: boolean;
  hasUserMessage: boolean;
};

export function composerPlaceholder({
  requiresConversationRestore,
  isRecordingTurn,
  isAgentResponding,
  hasUserMessage,
}: ComposerPlaceholderInput): string {
  if (requiresConversationRestore) {
    return "This conversation must be restored before another message can be sent.";
  }
  if (isRecordingTurn) {
    return "Prepare your next message. You can send it after this turn is recorded.";
  }
  if (isAgentResponding) {
    return "Prepare your next message. You can send it when the current response is complete.";
  }
  return hasUserMessage
    ? "What would you like to do next?"
    : "What would you like to work on?";
}
