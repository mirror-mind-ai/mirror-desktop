import type { ChapterDivider } from "../domain/journeyConversation";
import { describeChapterDivider } from "../domain/compactionChapters";

// CR080: a chapter closing used to be invisible — the conversation simply continued on a
// summary. This is that moment, named by the Goal Pi wrote, as a landmark in the reading
// rather than a message from anybody.
export function ChapterDividerRow({ divider, locale }: { divider: ChapterDivider; locale?: string }) {
  const presented = describeChapterDivider(divider, locale);
  return (
    <div className="chapter-divider" role="separator" aria-label={`${presented.label}: ${presented.title}`}>
      <span className="chapter-divider-label">{presented.label}</span>
      <span className="chapter-divider-title">{presented.title}</span>
      {presented.closedAt ? <span className="chapter-divider-date">{presented.closedAt}</span> : null}
    </div>
  );
}
