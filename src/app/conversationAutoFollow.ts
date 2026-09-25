export type ConversationScrollMetrics = {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
};

type ConversationAutoFollowEvent =
  | { type: "scroll"; metrics: ConversationScrollMetrics }
  | { type: "content_updated" }
  | { type: "explicit_bottom" }
  | { type: "journey_changed" };

const BOTTOM_TOLERANCE_PX = 48;

export function isConversationNearBottom(
  { scrollTop, clientHeight, scrollHeight }: ConversationScrollMetrics,
  tolerance = BOTTOM_TOLERANCE_PX,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= tolerance;
}

// CR084: a map-like recenter affordance. It stays in place wherever the Conversation is
// readable so the header does not shift, and only draws attention once the reader has left
// the latest turn behind.
export type ConversationRecenterState = {
  available: boolean;
  emphasized: boolean;
};

export function deriveConversationRecenterState(input: {
  surfaceReady: boolean;
  messageCount: number;
  awayFromEnd: boolean;
}): ConversationRecenterState {
  const available = input.surfaceReady && input.messageCount > 0;
  return { available, emphasized: available && input.awayFromEnd };
}

export function nextConversationAutoFollow(
  current: boolean,
  event: ConversationAutoFollowEvent,
): boolean {
  if (event.type === "scroll") {
    return isConversationNearBottom(event.metrics);
  }
  if (event.type === "content_updated") {
    return current;
  }
  return true;
}
