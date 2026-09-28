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
