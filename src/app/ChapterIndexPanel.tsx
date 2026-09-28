import { formatChapterDateRange, type ConversationChapter } from "../domain/compactionChapters";

type ChapterIndexPanelProps = {
  chapters: readonly ConversationChapter[];
  onSelect: (messageId: string) => void;
  onClose?: () => void;
  /** Explicit only in tests; production follows the reader's own locale. */
  locale?: string;
};

function describeChapterScale(chapter: ConversationChapter, locale?: string): string {
  // The turn count comes from the Desktop's own reconciliation, which has nothing to say
  // about chapters recorded before it existed. Saying "0 turns" would describe a chapter
  // full of work as empty, so an absent count is simply left unsaid.
  return [
    formatChapterDateRange(chapter.openedAt, chapter.closedAt, locale),
    chapter.turnCount > 0 ? `${chapter.turnCount} ${chapter.turnCount === 1 ? "turn" : "turns"}` : "",
  ].filter(Boolean).join(" · ");
}

// CR080: a conversation of months read as one undifferentiated thread. This is its index —
// every chapter the compactions already carved, named by the Goal Pi wrote. Chapters are
// views over Pi entries: selecting one only moves the reading.
export function ChapterIndexPanel({ chapters, onSelect, onClose, locale }: ChapterIndexPanelProps) {
  return (
    <aside className="conversation-chapter-panel" aria-label="Conversation chapters">
      {onClose ? (
        <button
          type="button"
          className="conversation-panel-close"
          onClick={onClose}
          aria-label="Close chapter index"
          title="Close"
        >
          ×
        </button>
      ) : null}
      <header className="conversation-chapter-panel-intro">
        <p className="eyebrow">Chapters</p>
        <p>
          A long Conversation is compacted as it grows: the agent summarizes what came before
          and continues from that summary. Each compaction closes a chapter, named by the goal
          it was working on. Select one to move the reading there.
        </p>
      </header>
      {chapters.length === 0 ? (
        <p className="conversation-chapter-empty">This Conversation is still one chapter.</p>
      ) : (
        <ol>
          {chapters.map((chapter) => {
            const scale = describeChapterScale(chapter, locale);
            const body = (
              <>
                <span className="conversation-chapter-number" aria-hidden="true">{chapter.number}</span>
                <span className="conversation-chapter-body">
                  <span className="conversation-chapter-title">{chapter.title}</span>
                  {scale ? <span className="conversation-chapter-meta">{scale}</span> : null}
                </span>
              </>
            );
            return (
              <li key={chapter.segmentId} className={chapter.status === "current" ? "is-current" : undefined}>
                {chapter.openingMessageId ? (
                  <button
                    type="button"
                    onClick={() => onSelect(chapter.openingMessageId as string)}
                    aria-label={`Go to chapter ${chapter.number}: ${chapter.title}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div title="Not in the loaded transcript">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
