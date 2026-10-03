import type { JourneyConversation, SteeringEvidence } from "../domain/journeyConversation";
import type { RunAuthority } from "../domain/runAuthority";
import { markSteeringDeliveredByQueueDeparture } from "../domain/steeringState";

/**
 * CR117: during a live run the Navigator's corrections are carried by a ref keyed on the run, not
 * by the run's conversation value. The send path writes that ref, and every run-conversation update
 * re-merges it, so the ref — not the conversation — is this run's steering authority while it is
 * alive. Anything that transitions a correction mid-run has to land in the ref or it is overwritten
 * by the next update.
 */
export function mergeLiveSteeringEvidence(
  conversation: JourneyConversation,
  runId: string,
  live: SteeringEvidence[] | undefined,
): JourneyConversation {
  if (!live) return conversation;
  return {
    ...conversation,
    steeringEvidence: [
      ...(conversation.steeringEvidence ?? []).filter((item) => item.runId !== runId),
      ...live,
    ],
  };
}

/**
 * Applies a Pi steering-queue departure to the live evidence of one run, returning the evidence the
 * ref should now hold. Returns the input unchanged when nothing departed or the authority has moved
 * on, so a late event from a superseded run cannot rewrite the current one.
 */
export function applyQueueDepartureToLiveEvidence(
  conversation: JourneyConversation,
  authority: RunAuthority,
  live: SteeringEvidence[] | undefined,
  queued: readonly string[],
  now: Date = new Date(),
): SteeringEvidence[] | undefined {
  if (!live || live.length === 0) return live;
  const held = { ...conversation, steeringEvidence: live };
  try {
    const applied = markSteeringDeliveredByQueueDeparture(held, authority, queued, now);
    // Nothing departed: hand back the very same array so callers can skip republishing.
    if (applied === held) return live;
    return applied.steeringEvidence?.filter((item) => item.runId === authority.runId) ?? live;
  } catch {
    return live;
  }
}
