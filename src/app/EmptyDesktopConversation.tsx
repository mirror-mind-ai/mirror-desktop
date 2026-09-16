import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import { ConversationDetailHeader } from "./ConversationDetailHeader";
import { journeyConversationStarters } from "./JourneyArrivalSurface";

type DesktopEntry = Extract<ConversationCatalogEntry, { kind: "desktop_conversation" }>;

type HistoricalSegments = {
  count: number;
  state: "idle" | "loading" | "error";
  disabled: boolean;
  onLoad: () => void;
};

type Props = {
  entry: DesktopEntry;
  journeyName: string;
  historicalSegments?: HistoricalSegments;
  onChoose: (message: string) => void;
};

export function EmptyDesktopConversation({ entry, journeyName, historicalSegments, onChoose }: Props) {
  return <section className="mirror-history-action-surface empty-desktop-conversation" aria-label={`${entry.title} start`}>
    <div className="mirror-history-action-card">
      <div className="journey-arrival-status"><span aria-hidden="true" /> Conversation ready · Journey context is active</div>
      <ConversationDetailHeader entry={entry} historicalSegmentCount={historicalSegments?.count} />
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
      {historicalSegments && (historicalSegments.count > 0 || historicalSegments.state === "error") ? (
        <div className="historical-segment-control conversation-history-action" role={historicalSegments.state === "error" ? "alert" : "status"}>
          <strong>Earlier history</strong>
          <span>{historicalSegments.state === "error"
            ? "Earlier history could not be verified. The current Segment remains available."
            : `${historicalSegments.count} earlier ${historicalSegments.count === 1 ? "Segment" : "Segments"} available.`}</span>
          <button type="button" className="secondary-button" onClick={historicalSegments.onLoad}
            disabled={historicalSegments.disabled || historicalSegments.state === "loading"}>
            {historicalSegments.state === "loading"
              ? "Loading earlier Segments…"
              : `Load ${historicalSegments.count} earlier ${historicalSegments.count === 1 ? "Segment" : "Segments"}`}
          </button>
        </div>
      ) : null}
    </div>
  </section>;
}
