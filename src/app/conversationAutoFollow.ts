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

export function conversationContentUpdateScroll(
  following: boolean,
  { clientHeight, scrollHeight }: ConversationScrollMetrics,
): ScrollToOptions | undefined {
  if (!following) return undefined;
  return {
    top: Math.max(0, scrollHeight - clientHeight),
    behavior: "auto",
  };
}

export function conversationExplicitScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}
