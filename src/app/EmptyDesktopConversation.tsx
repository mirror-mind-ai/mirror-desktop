import { journeyConversationStarters } from "./JourneyArrivalSurface";

type Props = {
  title: string;
  journeyName: string;
  createdAt: string;
  onChoose: (message: string) => void;
};

function MessageCountIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 4.5h13v9h-8l-3.5 3v-3H3.5z" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6.5h12v10H4zM4 9h12M7 3.5v4M13 3.5v4" /></svg>;
}

export function EmptyDesktopConversation({ title, journeyName, createdAt, onChoose }: Props) {
  const created = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(createdAt));
  return <section className="mirror-history-action-surface empty-desktop-conversation" aria-label={`${title} start`}>
    <div className="mirror-history-action-card">
      <div className="journey-arrival-status"><span aria-hidden="true" /> Conversation ready · Journey context is active</div>
      <p className="eyebrow">Desktop Conversation</p>
      <div className="mirror-history-title-row"><h2>{title}</h2></div>
      <p className="mirror-history-summary">
        This conversation belongs to {journeyName}. Choose a starting point or write your own message below. Nothing is sent until you decide.
      </p>
      <div className="mirror-history-metadata" aria-label="Conversation metadata">
        <span><MessageCountIcon /><span><strong>0</strong> messages</span></span>
        <span><CalendarIcon /><span>Created {created}</span></span>
      </div>
      <div className="journey-arrival-suggestions conversation-start-actions" aria-label="First message suggestions">
        {journeyConversationStarters.map((suggestion) => <button
          key={suggestion.label}
          type="button"
          onClick={() => onChoose(suggestion.message)}
        >{suggestion.label}</button>)}
      </div>
    </div>
  </section>;
}
