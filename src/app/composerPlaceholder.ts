export type ComposerPlaceholderInput = {
  isAgentResponding: boolean;
};

export function composerPlaceholder({ isAgentResponding }: ComposerPlaceholderInput): string {
  return isAgentResponding
    ? "Prepare your next message. You can send it when the current response is complete."
    : "What would you like to do next?";
}
