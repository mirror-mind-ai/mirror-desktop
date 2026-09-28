import type { ChapterDivider } from "./journeyConversation";
import type { ConversationSegmentManifest } from "./conversationSegments";

// CR080: a chapter is the summary Pi wrote when it compacted. Pi's default generator puts a
// `## Goal` heading first, so the chapter's title is the sentence beneath it — the
// Navigator never names a chapter; the name emerges from the work.
export const CHAPTER_TITLE_MAX_LENGTH = 120;

const HEADING = /^#{1,6}\s/u;
const GOAL_HEADING = /^#{1,6}\s*goal\b/iu;

export function chapterTitleFromSummary(summary: string): string {
  const lines = summary.split(/\r?\n/u).map((line) => line.trim());
  const goalIndex = lines.findIndex((line) => GOAL_HEADING.test(line));
  const candidates = goalIndex >= 0 ? lines.slice(goalIndex + 1) : lines;
  // Under a Goal heading, the first body line; a following heading means the section is
  // empty. Without a Goal heading, the first body line anywhere, skipping headings.
  let body: string | undefined;
  for (const line of candidates) {
    if (!line) continue;
    if (HEADING.test(line)) {
      if (goalIndex >= 0) break;
      continue;
    }
    body = line;
    break;
  }
  const text = (body ?? "").replace(/^[-*]\s+/u, "").replace(/\s+/gu, " ").trim();
  if (!text) return "Untitled chapter";
  return text.length > CHAPTER_TITLE_MAX_LENGTH
    ? `${text.slice(0, CHAPTER_TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : text;
}

export type ConversationChapter = {
  segmentId: string;
  number: number;
  status: "closed" | "current";
  title: string;
  openedAt?: string;
  closedAt?: string;
  turnCount: number;
  /** Where this chapter starts in the loaded transcript, when that can be resolved. */
  openingMessageId?: string;
};

/**
 * Where each chapter starts in the transcript. The first chapter opens at the first message;
 * every later one opens at the message its divider marks, in transcript order. Both derive
 * from the same ordered list of compactions, so the ordinals line up with the manifest.
 */
export function chapterOpeningMessageIds(input: {
  messages: readonly { id: string }[];
  chapterDividers?: Record<string, unknown>;
}): string[] {
  const first = input.messages[0];
  if (!first) return [];
  const openings = [first.id];
  for (const message of input.messages) {
    if (message.id !== first.id && input.chapterDividers?.[message.id]) openings.push(message.id);
  }
  return openings;
}

/**
 * Chapters as the Navigator navigates them: a view over the Segment manifest, which is
 * itself a view over Pi entries. Nothing here creates a chapter, and an uncompacted
 * conversation has nothing to navigate — one chapter is just the conversation.
 */
export function projectConversationChapters(
  manifest: ConversationSegmentManifest,
  options?: { openingMessageIds?: readonly string[] },
): ConversationChapter[] {
  if (manifest.segments.length < 2) return [];
  // Only a one-to-one match can be trusted: a manifest refreshed after the surface would
  // misplace every jump, and a wrong jump is worse than no jump.
  const openings = options?.openingMessageIds?.length === manifest.segments.length
    ? options.openingMessageIds
    : undefined;
  return manifest.segments.map((segment, index) => ({
    segmentId: segment.segmentId,
    number: segment.segment,
    status: segment.status,
    title: segment.status === "current"
      ? "Current chapter"
      : chapterTitleFromSummary(segment.summaryHead ?? ""),
    openedAt: segment.openedAt,
    closedAt: segment.closedAt,
    turnCount: segment.turnCount ?? 0,
    openingMessageId: openings?.[index],
  }));
}

/**
 * The divider drawn where a chapter closed. The date is the calendar day of the cut, which
 * is what a reader scrolling through months actually needs; the exact time of a compaction
 * is machine detail. It is written the way the reader's locale writes a date, not as an ISO
 * coordinate, for the same reason the index is.
 */
export function describeChapterDivider(divider: ChapterDivider, locale?: string): {
  label: string;
  title: string;
  closedAt?: string;
} {
  const parsed = validDate(divider.closedAt);
  return {
    label: "Chapter closed",
    title: divider.title,
    closedAt: parsed ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(parsed) : undefined,
  };
}

/**
 * Whether the published Segment manifest still describes this Conversation's chapters.
 *
 * Two ways it can be stale, and both must be checked. It can have missed a compaction the
 * Pi session recorded, and it can carry the right chapters with no evidence of what they
 * were — every manifest published before chapter evidence existed looks exactly like that,
 * which is why those Conversations showed nothing but "Untitled chapter". Segments are
 * presentation only, so rewriting the projection from Pi is always safe.
 */
export function needsChapterEvidenceRefresh(
  manifest: ConversationSegmentManifest | undefined,
  closedChapterCount: number,
): boolean {
  if (!manifest) return true;
  const closed = manifest.segments.filter((segment) => segment.status === "closed");
  if (closed.length !== closedChapterCount) return true;
  return closed.some((segment) => segment.summaryHead === undefined);
}

function validDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * When a chapter ran, as a reader would say it. ISO coordinates are how the session records
 * time; they are not how someone scanning months of conversation reads it. The locale is the
 * reader's own, through the same Intl idiom the rest of the app uses, and `formatRange`
 * collapses a span into one phrase instead of repeating the year on both sides.
 */
export function formatChapterDateRange(
  openedAt: string | undefined,
  closedAt: string | undefined,
  locale?: string,
): string {
  const opened = validDate(openedAt);
  const closed = validDate(closedAt);
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  if (opened && closed) return format.formatRange(opened, closed);
  if (closed) return format.format(closed);
  // A chapter that has not closed is still running, and saying so is more useful than a
  // bare date that looks like it ended there.
  if (opened) return `Since ${format.format(opened)}`;
  return "";
}
