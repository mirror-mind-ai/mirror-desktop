import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";

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
  return <section className={`focused-conversation-sidebar${props.accent ? ` accent-${props.accent}` : ""}`} aria-label={`${props.journeyName} conversations`}>
    <div className="focused-conversation-heading">
      <strong>Conversations</strong><small aria-label={`${props.entries.length} conversations`}>{props.entries.length}</small>
    </div>
    <button className="focused-conversation-create" type="button" onClick={props.onCreateConversation}>
      <span aria-hidden="true">＋</span><span>New conversation</span>
    </button>
    {props.status === "loading" ? <p className="focused-conversation-status" role="status">Loading conversations…</p> : null}
    {props.status === "error" ? <p className="focused-conversation-status error" role="alert">{props.error ?? "Conversations are unavailable."}</p> : null}
    {props.status === "ready" && props.entries.length === 0 ? <p className="focused-conversation-status">No additional conversations yet.</p> : null}
    <div className="focused-conversation-list">
      {props.entries.map((entry) => {
        const selected = props.selected.kind === entry.kind && props.selected.conversationId === entry.conversationId;
        return <button
          className={`focused-conversation-entry ${entry.kind}${selected ? " selected" : ""}`}
          type="button"
          key={`${entry.kind}:${entry.conversationId}`}
          onClick={() => props.onSelectEntry(entry)}
          aria-current={selected ? "page" : undefined}
        >
          <span className="focused-conversation-icon" aria-hidden="true">{entry.kind === "desktop_conversation" ? "◆" : "◇"}</span>
          <span><strong>{entry.title}</strong><small>{entry.kind === "desktop_conversation" ? (entry.messageCount ? `${entry.messageCount} messages` : "Not started") : "Available in Mirror"}</small></span>
        </button>;
      })}
    </div>
  </section>;
}
