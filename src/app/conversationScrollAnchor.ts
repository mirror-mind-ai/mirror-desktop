/**
 * CR125: manual scroll anchoring for the Conversation surface.
 *
 * Mirror Desktop renders in WKWebView, which does not implement CSS scroll anchoring — the browser
 * mechanism that keeps visible content still when layout above it changes. The Conversation needs it
 * more than most surfaces: the instant a turn settles, the previous turn is reclassified
 * `historical` and its whole action trail collapses into one summary line, directly above a reader
 * who may be anywhere in the transcript. Nothing moved the scroller, so `scrollTop` stays where it
 * was and the content under the reader's eyes travels upward instead.
 *
 * This supplies the missing mechanism: remember which message the reader is looking at and where it
 * sits on screen, then after the layout changes, put it back at the same place.
 *
 * It is needed only for a reader who has scrolled away from the end. A reader pinned to the bottom
 * is already stable, because the scroller's maximum and the content shrink by the same amount and
 * the browser's clamp cancels the travel exactly — see the CR for the arithmetic.
 */

/** A message's vertical extent, measured from the top of the visible scroller. */
export type ConversationAnchorMeasurement = {
  readonly messageId: string;
  readonly top: number;
  readonly bottom: number;
};

export type ConversationScrollAnchor = {
  readonly messageId: string;
  readonly viewportOffset: number;
};

/**
 * Layout rounds, and a scroller fights back when nudged by a fraction of a pixel. A correction has
 * to be worth at least one.
 */
const ANCHOR_CORRECTION_MIN_PX = 1;

/**
 * The topmost message the reader can still see. A message straddling the top edge is the honest
 * choice — it is what their eyes are on — so the anchor's offset is often negative.
 */
export function selectConversationScrollAnchor(
  measurements: readonly ConversationAnchorMeasurement[],
): ConversationScrollAnchor | undefined {
  const visible = measurements.find((measurement) => measurement.bottom > 0);
  return visible ? { messageId: visible.messageId, viewportOffset: visible.top } : undefined;
}

/**
 * How far the anchored message has travelled since it was recorded, to be applied as
 * `scrollTop += correction`.
 *
 * Returns nothing when the message is no longer rendered. A turn can drop its answer, and
 * re-anchoring onto whatever is nearby would move the reader somewhere they never chose — worse
 * than leaving them where they are, which the next scroll corrects anyway.
 */
export function conversationScrollAnchorCorrection(
  anchor: ConversationScrollAnchor,
  measurements: readonly ConversationAnchorMeasurement[],
): number | undefined {
  const current = measurements.find((measurement) => measurement.messageId === anchor.messageId);
  if (!current) return undefined;
  const correction = current.top - anchor.viewportOffset;
  return Math.abs(correction) >= ANCHOR_CORRECTION_MIN_PX ? correction : undefined;
}
