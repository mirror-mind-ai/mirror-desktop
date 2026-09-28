import type { ConversationChapter } from "../domain/compactionChapters";

type ChapterIndexPanelProps = {
  chapters: readonly ConversationChapter[];
  onSelect: (messageId: string) => void;
  onClose?: () => void;
};

function day(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function range(chapter: ConversationChapter): string {
  const opened = day(chapter.openedAt);
  const closed = day(chapter.closedAt);
  if (opened && closed && opened !== closed) return `${opened} – ${closed}`;
  return closed ?? opened ?? "";
}

// CR080: a conversation of months read as one undifferentiated thread. This is its index —
// every chapter the compactions already carved, named by the Goal Pi wrote. Chapters are
// views over Pi entries: selecting one only moves the reading.
export function ChapterIndexPanel({ chapters, onSelect, onClose }: ChapterIndexPanelProps) {
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
      {chapters.length === 0 ? (
        <p>This Conversation is still one chapter.</p>
      ) : (
        <ol>
          {chapters.map((chapter) => {
            const meta = [range(chapter), `${chapter.turnCount} ${chapter.turnCount === 1 ? "turn" : "turns"}`]
              .filter(Boolean)
              .join(" · ");
            const body = (
              <>
                <span className="conversation-chapter-title">{chapter.title}</span>
                <span className="conversation-chapter-meta">{meta}</span>
                <span className="conversation-chapter-number" aria-hidden="true">{chapter.number}</span>
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
