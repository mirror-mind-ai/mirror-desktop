import type { ConversationCatalogEntry } from "../domain/conversationSpaces";

type MirrorEntry = Extract<ConversationCatalogEntry, { kind: "mirror_history" }>;

type Props = {
  entry: MirrorEntry;
  busy?: boolean;
  message?: string;
  onCreateHandoff: () => void;
  onOpenTerminal: () => void;
};

export function MirrorHistoryActionSurface(props: Props) {
  return <section className="mirror-history-action-surface" aria-label={`${props.entry.title} actions`}>
    <div className="mirror-history-action-card">
      <div className="journey-arrival-status"><span aria-hidden="true" /> Mirror history · Source actions only</div>
      <p className="mirror-history-summary">
        This conversation belongs to Mirror Core via Terminal. Click “Continue in new Desktop Conversation” to continue here. Keep in mind that won’t be the same conversation, but a new one with the same resumed context.
      </p>
      <div className="mirror-history-actions">
        <button type="button" onClick={props.onCreateHandoff} disabled={props.busy}>Continue in new Desktop Conversation</button>
        <button className="secondary-button" type="button" onClick={props.onOpenTerminal} disabled={props.busy}>Continue with recalled context in Terminal</button>
      </div>
      <p className="provider-note">Created with Mirror Core via Terminal. The source remains there.</p>
      {props.message ? <p className="provider-note" role="status">{props.message}</p> : null}
    </div>
  </section>;
}
