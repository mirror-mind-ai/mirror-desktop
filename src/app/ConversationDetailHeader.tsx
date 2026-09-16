import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type Props = { entry: ConversationCatalogEntry };

export function ConversationDetailHeader({ entry }: Props) {
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(entry.updatedAt));
  return <section className="conversation-detail-header" aria-label={`${entry.title} Conversation details`}>
    <div>
      <p className="eyebrow">{entry.kind === "desktop_conversation" ? "Desktop Conversation" : "Mirror Core Conversation"}</p>
      <h2>{entry.title}</h2>
    </div>
    <div className="conversation-detail-metadata" aria-label="Conversation metadata">
      <span>{entry.messageCount} {entry.messageCount === 1 ? "message" : "messages"}</span>
      <span>{entry.kind === "desktop_conversation" ? "Updated" : "Last recorded"} {date}</span>
    </div>
  </section>;
}
