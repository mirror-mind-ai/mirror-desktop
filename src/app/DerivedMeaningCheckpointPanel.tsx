import type { DerivedMeaningCheckpoint } from "../domain/journeyProjections";

type DerivedMeaningCheckpointPanelProps = {
  checkpoints: DerivedMeaningCheckpoint[];
};

const stateLabels: Record<DerivedMeaningCheckpoint["state"], string> = {
  provisional: "Provisional reading",
  consolidated: "Consolidated checkpoint",
  contested: "Contested meaning",
  correction_requested: "Correction requested",
  stale: "Stale checkpoint",
};

export function DerivedMeaningCheckpointPanel({ checkpoints }: DerivedMeaningCheckpointPanelProps) {
  if (checkpoints.length === 0) return null;
  return (
    <section className="derived-meaning-checkpoints" aria-labelledby="derived-meaning-checkpoints-title">
      <div className="derived-checkpoint-header">
        <p className="eyebrow">Derived meaning governance</p>
        <h3 id="derived-meaning-checkpoints-title">Meaning checkpoints</h3>
        <p>Provisional interpretations stay visibly distinct from consolidated checkpoints. Corrections preserve their source evidence instead of rewriting it.</p>
      </div>
      <ul>
        {checkpoints.map((checkpoint) => (
          <li key={checkpoint.id} className={`derived-checkpoint state-${checkpoint.state.replace("_", "-")}`}>
            <div>
              <span className="derived-checkpoint-state">{stateLabels[checkpoint.state]}</span>
              <strong>{checkpoint.title}</strong>
              <p>{checkpoint.summary}</p>
              {checkpoint.correctionBoundary ? <p className="derived-correction-boundary">Correction boundary: {checkpoint.correctionBoundary}</p> : null}
              <SourceReferences references={checkpoint.sourceReferences} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceReferences({ references }: { references: string[] }) {
  return (
    <details className="derived-checkpoint-sources">
      <summary>Checkpoint sources ({references.length})</summary>
      <ul>{references.map((reference) => <li key={reference}>{reference}</li>)}</ul>
    </details>
  );
}
