import { useRef, useState } from "react";
import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";
import {
  conversationVisibilityKey,
  partitionConversationVisibility,
  type HiddenConversationsByJourney,
} from "../domain/conversationVisibility";
import { ConversationEntryContextMenu } from "./ConversationEntryContextMenu";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;
type DesktopEntry = Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>;

const INITIAL_VISIBLE_CONVERSATIONS = 6;

type Props = {
  journeyId: string;
  journeyName: string;
  accent?: string;
  // CR133: several groups can be open at once, and only the selected Journey's group has a
  // selected entry. An absent selection means this group belongs to a Journey the Navigator
  // is looking at rather than working in.
  selected?: ConversationSpaceSelection;
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
  // CR135: the Navigator's own working set. This filters what is rendered and never what the
  // catalog holds, which is why CR134's route can still reach a hidden conversation.
  hiddenConversations: HiddenConversationsByJourney;
  onHideConversation: (entry: ConversationCatalogEntry) => void;
  onRevealConversation: (entry: ConversationCatalogEntry) => void;
  onRevealAllConversations: () => void;
};

export function FocusedConversationSidebar(props: Props) {
  const [showAll, setShowAll] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [contextEntry, setContextEntry] = useState<{ entry: ConversationCatalogEntry; x: number; y: number } | null>(null);
  const contextTriggerRef = useRef<HTMLElement | null>(null);

  // CR135: the Navigator's choice is applied before the app's own cap, and the two counts are
  // kept apart on purpose. A cap the Navigator never set must never undo a choice they made.
  const partition = partitionConversationVisibility({
    entries: props.entries,
    hidden: props.hiddenConversations,
    journeyId: props.journeyId,
    selected: props.selected,
  });
  const visibleEntries = showAll ? partition.visible : partition.visible.slice(0, INITIAL_VISIBLE_CONVERSATIONS);
  const cappedCount = Math.max(0, partition.visible.length - visibleEntries.length);

  function renderEntry(entry: ConversationCatalogEntry) {
    const selection = props.selected;
    const selected = selection !== undefined
      && selection.kind === entry.kind
      && selection.conversationId === entry.conversationId;
    const key = conversationVisibilityKey(entry);
    const hidden = partition.shownBecauseSelected === key;
    const metadata = entry.kind === "desktop_conversation"
      ? `Desktop · ${entry.messageCount ? `${entry.messageCount} messages` : "Not started"}`
      : `Mirror · ${entry.messageCount} messages · ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(entry.updatedAt))}`;
    return <button
      className={`focused-conversation-entry ${entry.kind}${selected ? " selected" : ""}${hidden ? " is-hidden" : ""}`}
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
      <span><span className="focused-conversation-title">{entry.title}</span><small>{hidden ? `${metadata} · Hidden` : metadata}</small></span>
    </button>;
  }

  return <section
    className={`focused-conversation-sidebar${props.accent ? ` accent-${props.accent}` : ""}${props.status === "loading" ? " is-loading" : ""}`}
    aria-label={`${props.journeyName} conversations`}
  >
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
      {visibleEntries.map((entry) => renderEntry(entry))}
    </div>
    {cappedCount > 0 ? (
      <button className="focused-conversation-more" type="button" onClick={() => setShowAll(true)}>
        Show {cappedCount} more
      </button>
    ) : showAll && partition.visible.length > INITIAL_VISIBLE_CONVERSATIONS ? (
      <button className="focused-conversation-more" type="button" onClick={() => setShowAll(false)}>Show less</button>
    ) : null}
    {partition.hidden.length > 0 ? <div className="focused-conversation-hidden">
      <button
        className="focused-conversation-hidden-toggle"
        type="button"
        onClick={() => setShowHidden((open) => !open)}
        aria-expanded={showHidden}
        aria-label={`${partition.hidden.length} hidden conversations in ${props.journeyName}`}
        // The doubt this CR exists to remove arrives before the section is opened, so the
        // reassurance has to be reachable in the closed state too, not only inside it.
        title="Hidden only from this list. Nothing was deleted."
      >
        <span aria-hidden="true">{showHidden ? "⌄" : "›"}</span>
        <span>{partition.hidden.length} hidden</span>
      </button>
      {showHidden ? <div className="focused-conversation-hidden-body">
        <p className="focused-conversation-hidden-note">
          Hidden only from this list. Nothing was deleted, and revealing puts it back.
        </p>
        {partition.hidden.map((entry) => <div
          className="focused-conversation-hidden-row"
          key={`hidden:${entry.kind}:${entry.conversationId}`}
        >
          {renderEntry(entry)}
          <button
            className="focused-conversation-reveal"
            type="button"
            onClick={() => props.onRevealConversation(entry)}
            aria-label={`Reveal ${entry.title} in ${props.journeyName}`}
            title="Put this conversation back in the list"
          >Reveal</button>
        </div>)}
        <button
          className="focused-conversation-reveal-all"
          type="button"
          onClick={props.onRevealAllConversations}
        >Reveal all {partition.hidden.length}</button>
      </div> : null}
    </div> : null}
    {contextEntry ? <ConversationEntryContextMenu
      entry={contextEntry.entry}
      x={contextEntry.x}
      y={contextEntry.y}
      busy={props.busy}
      hidden={(props.hiddenConversations[props.journeyId] ?? []).includes(conversationVisibilityKey(contextEntry.entry))}
      onHide={props.onHideConversation}
      onReveal={props.onRevealConversation}
      returnFocusTo={contextTriggerRef.current}
      onContinue={props.onContinueMirror}
      onOpenTerminal={props.onOpenMirrorTerminal}
      onRename={props.onRenameConversation}
      onDeleteDesktop={props.onDeleteDesktop}
      onDismiss={() => setContextEntry(null)}
    /> : null}
  </section>;
}
