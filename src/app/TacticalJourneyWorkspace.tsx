import type { TacticalProjection } from "../domain/journeyProjections";
import { JourneyProjectionNotice } from "./JourneyProjectionNotice";

type TacticalJourneyWorkspaceProps = {
  projection: TacticalProjection;
  stale?: boolean;
};

export function TacticalJourneyWorkspace({ projection, stale = false }: TacticalJourneyWorkspaceProps) {
  const { mission, evidence, deliverables } = projection.content;
  return (
    <section id="journey-altitude-tactical-panel" className="tactical-journey-workspace" role="tabpanel" aria-label="Tactical workspace">
      {stale ? <JourneyProjectionNotice altitude="tactical" kind="stale" /> : null}
      <div className="tactical-workspace-frame">
        <article className="tactical-mission-anchor" aria-labelledby="tactical-mission-title">
          <div className="tactical-reading-label"><span aria-hidden="true">◎</span><span>Active mission</span></div>
          <h3 id="tactical-mission-title">{mission.title}</h3>
          <p>{mission.purpose}</p>
        </article>
        <div className="tactical-supporting-readings">
          <section className="tactical-reading" aria-labelledby="tactical-evidence-title">
            <header><span className="tactical-reading-number" aria-hidden="true">01</span><div><h3 id="tactical-evidence-title">Evidence</h3><p>Signals that support this mission.</p></div></header>
            <ul>{evidence.map((item) => <li key={item.id}><span className="tactical-evidence-mark" aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.summary}</p></div></li>)}</ul>
          </section>
          <section className="tactical-reading" aria-labelledby="tactical-deliverables-title">
            <header><span className="tactical-reading-number" aria-hidden="true">02</span><div><h3 id="tactical-deliverables-title">Deliverables</h3><p>Concrete expressions of movement.</p></div></header>
            <ul>{deliverables.map((item) => <li key={item.id}><span className="tactical-deliverable-mark" aria-hidden="true">◇</span><div><strong>{item.title}</strong><p>{item.summary}</p></div></li>)}</ul>
          </section>
        </div>
      </div>
    </section>
  );
}
