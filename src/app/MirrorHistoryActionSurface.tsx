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
  return <section className="mirror-history-action-surface" aria-label={`${props.entry.title} actions`}>
    <div className="mirror-history-action-card">
      <p className="eyebrow">Available in Mirror</p>
      <h2>{props.entry.title}</h2>
      <p>This conversation belongs to {props.journeyId}, but it does not have a Desktop session that can be resumed here.</p>
      <dl>
        <div><dt>Messages</dt><dd>{props.entry.messageCount}</dd></div>
        <div><dt>Last recorded</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(props.entry.updatedAt))}</dd></div>
        {props.entry.persona ? <div><dt>Persona</dt><dd>{props.entry.persona}</dd></div> : null}
      </dl>
      <div className="mirror-history-actions">
        <button type="button" onClick={props.onCreateHandoff} disabled={props.busy}>Create Desktop conversation from this history</button>
        <button className="secondary-button" type="button" onClick={props.onOpenTerminal} disabled={props.busy}>Open in Terminal with recalled context</button>
        <button className="secondary-button" type="button" onClick={props.onRename} disabled={props.busy}>Rename in Mirror</button>
      </div>
      <p className="provider-note">The source remains in Mirror. No transcript import, exact session resume or synchronization is performed.</p>
      {props.message ? <p className="provider-note" role="status">{props.message}</p> : null}
    </div>
  </section>;
}
