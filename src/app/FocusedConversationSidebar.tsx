import { useState } from "react";
import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";

const INITIAL_VISIBLE_CONVERSATIONS = 6;

type Props = {
  journeyId: string;
  journeyName: string;
  accent?: string;
  selected: ConversationSpaceSelection;
  entries: ConversationCatalogEntry[];
  status: "loading" | "ready" | "error";
  error?: string;
  onCreateConversation: () => void;
  onSelectEntry: (entry: ConversationCatalogEntry) => void;
};

export function FocusedConversationSidebar(props: Props) {
  const [showAll, setShowAll] = useState(false);
  const visibleEntries = showAll ? props.entries : props.entries.slice(0, INITIAL_VISIBLE_CONVERSATIONS);
  const hiddenCount = Math.max(0, props.entries.length - visibleEntries.length);

  return <section className={`focused-conversation-sidebar${props.accent ? ` accent-${props.accent}` : ""}`} aria-label={`${props.journeyName} conversations`}>
    <div className="focused-conversation-heading">
      <span className="focused-conversation-heading-copy">
        <strong>Conversations</strong>
        <small aria-label={`${props.entries.length} conversations`}>{props.entries.length}</small>
      </span>
      <button
        className="focused-conversation-create"
        type="button"
        onClick={props.onCreateConversation}
        aria-label={`Create new conversation in ${props.journeyName}`}
        title="New conversation"
      >
        <span aria-hidden="true">＋</span><span>New</span>
      </button>
    </div>
    {props.status === "loading" ? <p className="focused-conversation-status" role="status">Loading conversations…</p> : null}
    {props.status === "error" ? <p className="focused-conversation-status error" role="alert">{props.error ?? "Conversations are unavailable."}</p> : null}
    {props.status === "ready" && props.entries.length === 0 ? <p className="focused-conversation-status">No additional conversations yet.</p> : null}
    <div className="focused-conversation-list">
      {visibleEntries.map((entry) => {
        const selected = props.selected.kind === entry.kind && props.selected.conversationId === entry.conversationId;
        const metadata = entry.kind === "desktop_conversation"
          ? `Desktop · ${entry.messageCount ? `${entry.messageCount} messages` : "Not started"}`
          : `Mirror · ${entry.messageCount} messages · ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(entry.updatedAt))}`;
        return <button
          className={`focused-conversation-entry ${entry.kind}${selected ? " selected" : ""}`}
          type="button"
          key={`${entry.kind}:${entry.conversationId}`}
          onClick={() => props.onSelectEntry(entry)}
          aria-current={selected ? "page" : undefined}
          title={entry.title}
        >
          <span className="focused-conversation-icon" aria-hidden="true">{entry.kind === "desktop_conversation" ? "◆" : "◇"}</span>
          <span><span className="focused-conversation-title">{entry.title}</span><small>{metadata}</small></span>
        </button>;
      })}
    </div>
    {hiddenCount > 0 ? (
      <button className="focused-conversation-more" type="button" onClick={() => setShowAll(true)}>
        Show {hiddenCount} more
      </button>
    ) : showAll && props.entries.length > INITIAL_VISIBLE_CONVERSATIONS ? (
      <button className="focused-conversation-more" type="button" onClick={() => setShowAll(false)}>Show less</button>
    ) : null}
  </section>;
}
