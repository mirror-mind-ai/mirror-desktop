import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;

type Props = {
  journeyId: string;
  entry: MirrorEntry;
  busy?: boolean;
  message?: string;
  onCreateHandoff: () => void;
  onOpenTerminal: () => void;
};

function MessageCountIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 4.5h13v9h-8l-3.5 3v-3H3.5z" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6.5h12v10H4zM4 9h12M7 3.5v4M13 3.5v4" /></svg>;
}

export function MirrorHistoryActionSurface(props: Props) {
  const recordedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(props.entry.updatedAt));

  return <section className="mirror-history-action-surface" aria-label={`${props.entry.title} actions`}>
    <div className="mirror-history-action-card">
      <p className="eyebrow">Mirror Core Conversation</p>
      <div className="mirror-history-title-row">
        <h2>{props.entry.title}</h2>
      </div>
      <p className="mirror-history-summary">
        This conversation belongs to {props.journeyId}. Click “Continue in new Desktop Conversation” to continue. Keep in mind that won’t be the same conversation, but a new one with the same resumed context.
      </p>
      <div className="mirror-history-metadata" aria-label="Conversation metadata">
        <span><MessageCountIcon /><span><strong>{props.entry.messageCount}</strong> messages</span></span>
        <span><CalendarIcon /><span>Last recorded {recordedAt}</span></span>
      </div>
      <div className="mirror-history-actions">
        <button type="button" onClick={props.onCreateHandoff} disabled={props.busy}>Continue in new Desktop Conversation</button>
        <button className="secondary-button" type="button" onClick={props.onOpenTerminal} disabled={props.busy}>Continue with recalled context in Terminal</button>
      </div>
      <p className="provider-note">Created with Mirror Core via Terminal. The source remains there.</p>
      {props.message ? <p className="provider-note" role="status">{props.message}</p> : null}
    </div>
  </section>;
}
