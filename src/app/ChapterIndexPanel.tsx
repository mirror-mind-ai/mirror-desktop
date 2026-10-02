import {
  formatChapterDateRange,
  recentChapterShortcuts,
  type ConversationChapter,
} from "../domain/compactionChapters";

type ChapterIndexPanelProps = {
  chapters: readonly ConversationChapter[];
  onSelect: (messageId: string) => void;
  onClose?: () => void;
  /**
   * CR114: a Journey opens on its current chapter, so most chapters have no loaded opening on
   * arrival. Their rows offer the load that makes them reachable instead of reading as dead.
   */
  onLoadEarlierHistory?: () => void;
  earlierHistoryState?: "idle" | "loading" | "error";
  /** Explicit only in tests; production follows the reader's own locale. */
  locale?: string;
};

type ChapterRowProps = {
  chapter: ConversationChapter;
  onSelect: (messageId: string) => void;
  onLoadEarlierHistory?: () => void;
  earlierHistoryState?: "idle" | "loading" | "error";
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

function ChapterRow({
  chapter,
  onSelect,
  onLoadEarlierHistory,
  earlierHistoryState,
  locale,
}: ChapterRowProps) {
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
  const loading = earlierHistoryState === "loading";
  return (
    <li className={chapter.status === "current" ? "is-current" : undefined}>
      {chapter.openingMessageId ? (
        <button
          type="button"
          onClick={() => onSelect(chapter.openingMessageId as string)}
          aria-label={`Go to chapter ${chapter.number}: ${chapter.title}`}
        >
          {body}
        </button>
      ) : onLoadEarlierHistory ? (
        <button
          type="button"
          className="is-unloaded"
          onClick={onLoadEarlierHistory}
          disabled={loading}
          aria-label={loading
            ? "Loading earlier history"
            : `Load earlier history to reach chapter ${chapter.number}: ${chapter.title}`}
          title={loading ? "Loading earlier history…" : "Not loaded yet. Select to load earlier history."}
        >
          {body}
        </button>
      ) : (
        <div title="Not in the loaded transcript">{body}</div>
      )}
    </li>
  );
}

function ChapterList({
  chapters,
  onSelect,
  onLoadEarlierHistory,
  earlierHistoryState,
  locale,
}: {
  chapters: readonly ConversationChapter[];
  onSelect: (messageId: string) => void;
  onLoadEarlierHistory?: () => void;
  earlierHistoryState?: "idle" | "loading" | "error";
  locale?: string;
}) {
  return (
    <ol>
      {chapters.map((chapter) => (
        <ChapterRow
          key={chapter.segmentId}
          chapter={chapter}
          onSelect={onSelect}
          onLoadEarlierHistory={onLoadEarlierHistory}
          earlierHistoryState={earlierHistoryState}
          locale={locale}
        />
      ))}
    </ol>
  );
}

// CR080: a conversation of months read as one undifferentiated thread. This is its index —
// every chapter the compactions already carved, named by the Goal Pi wrote. Chapters are
// views over Pi entries: selecting one only moves the reading.
export function ChapterIndexPanel({
  chapters,
  onSelect,
  onClose,
  onLoadEarlierHistory,
  earlierHistoryState,
  locale,
}: ChapterIndexPanelProps) {
  // Once the index is long enough to bury its own end, the chapters a reader reaches for
  // get a section of their own. The chronological arc stays below, where the chapter
  // metaphor belongs, and the stable numbers make an entry recognisable in both places.
  const shortcuts = recentChapterShortcuts(chapters);
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
        <div className="conversation-chapter-scroll">
          {shortcuts.length > 0 ? (
            <section className="conversation-chapter-section">
              <h3 className="eyebrow">Most recent</h3>
              <ChapterList
                chapters={shortcuts}
                onSelect={onSelect}
                onLoadEarlierHistory={onLoadEarlierHistory}
                earlierHistoryState={earlierHistoryState}
                locale={locale}
              />
            </section>
          ) : null}
          <section className="conversation-chapter-section">
            {shortcuts.length > 0 ? <h3 className="eyebrow">All chapters</h3> : null}
            <ChapterList
              chapters={chapters}
              onSelect={onSelect}
              onLoadEarlierHistory={onLoadEarlierHistory}
              earlierHistoryState={earlierHistoryState}
              locale={locale}
            />
          </section>
        </div>
      )}
    </aside>
  );
}
