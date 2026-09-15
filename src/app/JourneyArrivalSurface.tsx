type Props = {
  journeyName: string;
  stage?: string;
  onChoose: (message: string) => void;
};

export const journeyConversationStarters = [
  { label: "Understand where we are", message: "Summarize the current state of this Journey and identify the most important next step." },
  { label: "Explore the current tension", message: "Help me explore the main tension in this Journey before deciding what to do." },
  { label: "Recognize what wants continuity", message: "Review what has already been accomplished and what now needs continuity." },
  { label: "Think out loud", message: "I want to think out loud about this Journey. Help me clarify the thread without rushing to a conclusion." },
];

export function JourneyArrivalSurface({ journeyName, stage, onChoose }: Props) {
  return (
    <section className="journey-arrival" aria-label={`${journeyName} conversation starting point`}>
      <div className="journey-arrival-status"><span aria-hidden="true" /> Conversation ready · Journey context is active</div>
      <p className="eyebrow">{journeyName}</p>
      <h2>Where would you like to begin?</h2>
      <p className="journey-arrival-copy">Choose a starting point or write your own message below. Nothing is sent until you decide.</p>
      <div className="journey-arrival-suggestions" aria-label="First message suggestions">
        {journeyConversationStarters.map((suggestion) => (
          <button key={suggestion.label} type="button" onClick={() => onChoose(suggestion.message)}>
            {suggestion.label}
          </button>
        ))}
      </div>
      {stage ? <div className="journey-arrival-stage"><span>Current stage</span><strong>{stage}</strong></div> : null}
    </section>
  );
}
