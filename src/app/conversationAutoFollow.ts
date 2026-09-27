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

// CR092: a map-like recenter affordance floating over the Conversation. Sometimes the map
// drifts away from the territory and you want it synced back; the end of the Conversation is
// the territory. Because it no longer lives among header siblings it could displace, presence
// itself is the signal — which is what the metaphor asks for, and why CR084's emphasis state
// is gone: emphasis was a substitute for a presence the header could not offer.
export type ConversationRecenterState = {
  visible: boolean;
};

export function deriveConversationRecenterState(input: {
  surfaceReady: boolean;
  messageCount: number;
  awayFromEnd: boolean;
}): ConversationRecenterState {
  return { visible: input.surfaceReady && input.messageCount > 0 && input.awayFromEnd };
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
