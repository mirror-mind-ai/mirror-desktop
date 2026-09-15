import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";

type Props = {
  journeyId: string;
  journeyName: string;
  selected: ConversationSpaceSelection;
  entries: ConversationCatalogEntry[];
  status: "loading" | "ready" | "error";
  error?: string;
  onCollapse: () => void;
  onSelectRoot: () => void;
  onSelectEntry: (entry: ConversationCatalogEntry) => void;
};

export function FocusedConversationSidebar(props: Props) {
  return <section className="focused-conversation-sidebar" aria-label={`${props.journeyName} conversations`}>
    <button className="focused-journey-collapse" type="button" onClick={props.onCollapse}>
      <span aria-hidden="true">‹</span> Back to all Journeys
    </button>
    <button
      className={`focused-journey-root${props.selected.kind === "journey_workspace" ? " selected" : ""}`}
      type="button"
      onClick={props.onSelectRoot}
      aria-current={props.selected.kind === "journey_workspace" ? "page" : undefined}
    >
      <strong>{props.journeyName}</strong>
      <small>Journey workspace</small>
    </button>
    <div className="focused-conversation-heading">
      <span>Conversations</span><small>{props.entries.length}</small>
    </div>
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
