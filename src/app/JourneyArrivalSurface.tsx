type Props = {
  journeyName: string;
  stage?: string;
  onChoose: (message: string) => void;
};

const suggestions = [
  { label: "Understand where we are", message: "Onde estamos nesta Journey?" },
  { label: "Explore the current tension", message: "Qual tensão merece mais atenção agora?" },
  { label: "Recognize what wants continuity", message: "O que já foi realizado e o que está pedindo continuidade?" },
  { label: "Think out loud", message: "Quero pensar em voz alta sobre esta Journey." },
];

export function JourneyArrivalSurface({ journeyName, stage, onChoose }: Props) {
  return (
    <section className="journey-arrival" aria-label={`${journeyName} conversation starting point`}>
      <div className="journey-arrival-status"><span aria-hidden="true" /> Conversation ready · Journey context is active</div>
      <p className="eyebrow">{journeyName}</p>
      <h2>Where would you like to begin?</h2>
      <p className="journey-arrival-copy">Choose a starting point or write your own message below. Nothing is sent until you decide.</p>
      <div className="journey-arrival-suggestions" aria-label="First message suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion.label} type="button" onClick={() => onChoose(suggestion.message)}>
            {suggestion.label}
          </button>
        ))}
      </div>
      {stage ? <div className="journey-arrival-stage"><span>Current stage</span><strong>{stage}</strong></div> : null}
    </section>
  );
}
