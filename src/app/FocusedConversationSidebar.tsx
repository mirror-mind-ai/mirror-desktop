import { useRef, useState } from "react";
import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";
import { ConversationEntryContextMenu } from "./ConversationEntryContextMenu";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;
type DesktopEntry = Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>;

const INITIAL_VISIBLE_CONVERSATIONS = 6;

type Props = {
  journeyId: string;
  journeyName: string;
  accent?: string;
  selected: ConversationSpaceSelection;
  entries: ConversationCatalogEntry[];
  status: "loading" | "ready" | "error";
  error?: string;
  busy?: boolean;
  actionMessage?: string;
  onCreateConversation: () => void;
  onSelectEntry: (entry: ConversationCatalogEntry) => void;
  onContinueMirror: (entry: MirrorEntry) => void;
  onOpenMirrorTerminal: (entry: MirrorEntry) => void;
  onRenameConversation: (entry: ConversationCatalogEntry) => void;
  onDeleteDesktop: (entry: DesktopEntry) => void;
};

export function FocusedConversationSidebar(props: Props) {
  const [showAll, setShowAll] = useState(false);
  const [contextEntry, setContextEntry] = useState<{ entry: ConversationCatalogEntry; x: number; y: number } | null>(null);
  const contextTriggerRef = useRef<HTMLElement | null>(null);
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
        disabled={props.busy}
        aria-label={`Create new conversation in ${props.journeyName}`}
        title="New conversation"
      >
        <span aria-hidden="true">{props.busy ? "◌" : "＋"}</span><span>{props.busy ? "Working…" : "New"}</span>
      </button>
    </div>
    {props.status === "loading" ? <p className="focused-conversation-status" role="status">Loading conversations…</p> : null}
    {props.status === "error" ? <p className="focused-conversation-status error" role="alert">{props.error ?? "Conversations are unavailable."}</p> : null}
    {props.status === "ready" && props.entries.length === 0 ? <p className="focused-conversation-status">No additional conversations yet.</p> : null}
    {props.actionMessage ? <p className="focused-conversation-status" role="status">{props.actionMessage}</p> : null}
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
          onContextMenu={(event) => {
            event.preventDefault();
            props.onSelectEntry(entry);
            contextTriggerRef.current = event.currentTarget;
            setContextEntry({
              entry,
              x: Math.min(event.clientX, window.innerWidth - 290),
              y: Math.min(event.clientY, window.innerHeight - 150),
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
              event.preventDefault();
              props.onSelectEntry(entry);
              const bounds = event.currentTarget.getBoundingClientRect();
              contextTriggerRef.current = event.currentTarget;
              setContextEntry({ entry, x: bounds.left + 20, y: bounds.bottom + 4 });
            }
          }}
          aria-current={selected ? "page" : undefined}
          aria-haspopup="menu"
          aria-expanded={contextEntry?.entry.conversationId === entry.conversationId ? true : undefined}
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
    {contextEntry ? <ConversationEntryContextMenu
      entry={contextEntry.entry}
      x={contextEntry.x}
      y={contextEntry.y}
      busy={props.busy}
      returnFocusTo={contextTriggerRef.current}
      onContinue={props.onContinueMirror}
      onOpenTerminal={props.onOpenMirrorTerminal}
      onRename={props.onRenameConversation}
      onDeleteDesktop={props.onDeleteDesktop}
      onDismiss={() => setContextEntry(null)}
    /> : null}
  </section>;
}
