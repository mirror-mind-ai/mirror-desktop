import type { RepresentativeJourneyPreview } from "./journeyAltitudePreview";

type TacticalJourneyWorkspaceProps = {
  preview: RepresentativeJourneyPreview;
};

const deliverableStateLabels = {
  complete: "Complete",
  forming: "Forming",
} as const;

export function TacticalJourneyWorkspace({ preview }: TacticalJourneyWorkspaceProps) {
  const { mission } = preview.tactical;
  const missionEvidenceIds: ReadonlySet<string> = new Set(mission.evidenceIds);
  const missionDeliverableIds: ReadonlySet<string> = new Set(mission.deliverableIds);
  const relatedEvidence = preview.tactical.evidence.filter((evidence) =>
    missionEvidenceIds.has(evidence.id),
  );
  const relatedDeliverables = preview.tactical.deliverables.filter((deliverable) =>
    missionDeliverableIds.has(deliverable.id),
  );

  return (
    <section
      id="journey-altitude-tactical-panel"
      className="tactical-journey-workspace"
      role="tabpanel"
      aria-label="Tactical workspace"
    >
      <div className="tactical-workspace-frame">
        <article className="tactical-mission-anchor" aria-labelledby="tactical-mission-title">
          <div className="tactical-reading-label">
            <span aria-hidden="true">◎</span>
            <span>Active mission</span>
            <span className="tactical-preview-label">Preview</span>
          </div>
          <h3 id="tactical-mission-title">{mission.title}</h3>
          <p>{mission.purpose}</p>
        </article>

        <div className="tactical-supporting-readings">
          <section className="tactical-reading" aria-labelledby="tactical-evidence-title">
            <header>
              <span className="tactical-reading-number" aria-hidden="true">01</span>
              <div>
                <h3 id="tactical-evidence-title">Evidence</h3>
                <p>Signals that support this mission.</p>
              </div>
            </header>
            <ul>
              {relatedEvidence.map((evidence) => (
                <li key={evidence.id}>
                  <span className="tactical-evidence-mark" aria-hidden="true" />
                  <div>
                    <strong>{evidence.label}</strong>
                    <p>{evidence.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="tactical-reading" aria-labelledby="tactical-deliverables-title">
            <header>
              <span className="tactical-reading-number" aria-hidden="true">02</span>
              <div>
                <h3 id="tactical-deliverables-title">Deliverables</h3>
                <p>Concrete expressions of movement.</p>
              </div>
            </header>
            <ul>
              {relatedDeliverables.map((deliverable) => (
                <li key={deliverable.id}>
                  <span className="tactical-deliverable-mark" aria-hidden="true">◇</span>
                  <div>
                    <strong>{deliverable.label}</strong>
                    <span className={`tactical-deliverable-state state-${deliverable.state}`}>
                      {deliverableStateLabels[deliverable.state]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
