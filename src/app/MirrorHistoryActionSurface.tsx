import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;

type Props = {
  journeyId: string;
  entry: MirrorEntry;
  busy?: boolean;
  message?: string;
  onCreateHandoff: () => void;
  onOpenTerminal: () => void;
  onRename: () => void;
};

export function MirrorHistoryActionSurface(props: Props) {
  const recordedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(props.entry.updatedAt));

  return <section className="mirror-history-action-surface" aria-label={`${props.entry.title} actions`}>
    <div className="mirror-history-action-card">
      <p className="eyebrow">Mirror history</p>
      <div className="mirror-history-title-row">
        <h2>{props.entry.title}</h2>
        <span className="mirror-history-badge">Available in Mirror</span>
      </div>
      <p className="mirror-history-summary">
        This history belongs to {props.journeyId}. It can continue in a new Desktop conversation, but it cannot resume an exact Desktop session.
      </p>
      <div className="mirror-history-metadata" aria-label="Conversation metadata">
        <span><strong>{props.entry.messageCount}</strong> messages</span>
        <span>Last recorded {recordedAt}</span>
      </div>
      <div className="mirror-history-actions">
        <button type="button" onClick={props.onCreateHandoff} disabled={props.busy}>Continue in new Desktop conversation</button>
        <button className="secondary-button" type="button" onClick={props.onOpenTerminal} disabled={props.busy}>Open recalled context in Terminal</button>
        <button className="secondary-button" type="button" onClick={props.onRename} disabled={props.busy} aria-label="Rename in Mirror">Rename</button>
      </div>
      <p className="provider-note">The source remains in Mirror. No transcript import, exact session resume or synchronization is performed.</p>
      {props.message ? <p className="provider-note" role="status">{props.message}</p> : null}
    </div>
  </section>;
}
