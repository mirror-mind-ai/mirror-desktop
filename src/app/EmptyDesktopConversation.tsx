import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import { ConversationDetailHeader } from "./ConversationDetailHeader";
import { journeyConversationStarters } from "./JourneyArrivalSurface";

type DesktopEntry = Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>;

type Props = {
  entry: DesktopEntry;
  journeyName: string;
  onChoose: (message: string) => void;
};

export function EmptyDesktopConversation({ entry, journeyName, onChoose }: Props) {
  return <section className="mirror-history-action-surface empty-desktop-conversation" aria-label={`${entry.title} start`}>
    <div className="mirror-history-action-card">
      <div className="journey-arrival-status"><span aria-hidden="true" /> Conversation ready · Journey context is active</div>
      <ConversationDetailHeader entry={entry} />
      <p className="mirror-history-summary">
        This conversation belongs to {journeyName}. Choose a starting point or write your own message below. Nothing is sent until you decide.
      </p>
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
