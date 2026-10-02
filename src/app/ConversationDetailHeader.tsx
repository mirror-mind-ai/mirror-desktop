import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type Props = {
  entry: ConversationCatalogEntry;
  messageCount?: number;
  historicalSegmentCount?: number;
  loadedHistoricalSegmentCount?: number;
};

// CR114: the reader's word for a compaction boundary is chapter (CR080). Segment is the internal
// history and loading boundary CV-008.DS-004 defines as technical, and the two are one to one, so
// a surface that said both was naming the same thing twice.
function historySummary(messageCount: number, earlierCount: number, loadedEarlierCount: number): string {
  if (earlierCount > 0) {
    const current = messageCount === 0 ? "Current chapter empty" : `${messageCount} ${messageCount === 1 ? "message" : "messages"} in current chapter`;
    return `${current} · ${earlierCount} earlier ${earlierCount === 1 ? "chapter" : "chapters"}`;
  }
  if (loadedEarlierCount > 0) {
    return `${messageCount} ${messageCount === 1 ? "message" : "messages"} loaded · ${loadedEarlierCount + 1} chapters`;
  }
  return `${messageCount} ${messageCount === 1 ? "message" : "messages"}`;
}

export function ConversationDetailHeader({ entry, messageCount, historicalSegmentCount = 0, loadedHistoricalSegmentCount = 0 }: Props) {
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(entry.updatedAt));
  const visibleMessageCount = messageCount ?? entry.messageCount;
  return <section className="conversation-detail-header" aria-label={`${entry.title} Conversation details`}>
    <div>
      <p className="eyebrow">{entry.kind === "desktop_conversation" ? "Desktop Conversation" : "Mirror Core Conversation"}</p>
      <h2>{entry.title}</h2>
    </div>
    <div className="conversation-detail-metadata" aria-label="Conversation metadata">
      <span>{historySummary(visibleMessageCount, historicalSegmentCount, loadedHistoricalSegmentCount)}</span>
      <span>{entry.kind === "desktop_conversation" ? "Updated" : "Last recorded"} {date}</span>
    </div>
  </section>;
}
