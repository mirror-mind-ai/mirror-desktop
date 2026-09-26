import type { ResponseModelAttribution } from "../domain/journeyConversation";

// CR091: which model produced each answer. The transcript is history, so this names the
// model rather than the Model Intent that may have been selected at the time: intents are a
// living vocabulary that can be renamed or rebound, and Pi records the model on every
// assistant message but almost never the thinking level an intent also binds.
export type ResponseModelBadge = {
  label: string;
  /** True where this answer's model differs from the previous attributed one. */
  changed: boolean;
};

export function projectResponseModelBadges(input: {
  messages: readonly { id: string; role: string }[];
  responseModels?: Record<string, ResponseModelAttribution>;
  /**
   * Model captured on the live run (CR090), for the answer Pi has not recorded yet. It
   * arrives already formatted, because that is the shape the run recorded.
   */
  liveAttribution?: { messageId: string; label: string };
}): Record<string, ResponseModelBadge> {
  const badges: Record<string, ResponseModelBadge> = {};
  let previousLabel: string | undefined;

  for (const message of input.messages) {
    if (message.role !== "assistant") continue;
    // Pi is the authority; the live capture only covers what it has not written yet.
    const recorded = input.responseModels?.[message.id];
    const label = recorded
      ? `${recorded.provider}/${recorded.model}`
      : input.liveAttribution?.messageId === message.id ? input.liveAttribution.label : undefined;
    if (!label) continue;

    badges[message.id] = { label, changed: label !== previousLabel };
    previousLabel = label;
  }

  return badges;
}
