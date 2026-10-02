import type { ConversationMessage } from "../agent/piTaskPacket";

/**
 * CR114: what durable storage keeps when the loaded surface is only the current chapter.
 *
 * Since CR046 the transcript body is reconstructed from the Pi session, and the stored projection
 * is compatibility metadata. That made it safe to overwrite the stored messages with whatever the
 * surface had just projected — as long as the surface always projected everything. A bounded
 * working set breaks that assumption: writing the window verbatim would delete the durable record
 * of every earlier message, and with it the attachment provenance that only the Desktop holds.
 *
 * The rule is ownership. The surface owns the messages it loaded, so a removal inside the window
 * is honoured — that is how an interrupted turn drops an answer that produced neither words nor
 * work. Everything before the window is outside the surface's knowledge and is preserved exactly.
 *
 * On a complete load the window starts where the history starts, nothing is preserved, and this is
 * the overwrite it has always been.
 */
export function preserveDurableConversationHistory(
  previous: readonly ConversationMessage[] | undefined,
  projected: readonly ConversationMessage[],
): ConversationMessage[] {
  if (!previous?.length) return [...projected];
  if (!projected.length) return [...previous];
  const boundary = previous.findIndex((message) => message.id === projected[0]!.id);
  if (boundary === 0) return [...projected];
  if (boundary > 0) return [...previous.slice(0, boundary), ...projected];
  // The surface opens on a message the stored record has never seen, so where the window begins
  // cannot be established. Keeping what the surface does not mention can be corrected by the next
  // complete load; deleting it cannot.
  const projectedIds = new Set(projected.map((message) => message.id));
  return [...previous.filter((message) => !projectedIds.has(message.id)), ...projected];
}
