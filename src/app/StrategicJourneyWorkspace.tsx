import type { StrategicProjection } from "../domain/journeyProjections";
import { JourneyProjectionNotice } from "./JourneyProjectionNotice";

type StrategicJourneyWorkspaceProps = {
  projection: StrategicProjection;
  stale?: boolean;
};

export function StrategicJourneyWorkspace({ projection, stale = false }: StrategicJourneyWorkspaceProps) {
  const realization = projection.content.realizations[0];
  if (!realization) return null;
  const impactIds = new Set(realization.impactIds);
  const relatedImpacts = projection.content.impacts.filter((impact) => impactIds.has(impact.id));
  return (
    <section id="journey-altitude-strategic-panel" className="strategic-journey-workspace" role="tabpanel" aria-label="Strategic workspace">
      {stale ? <JourneyProjectionNotice altitude="strategic" kind="stale" /> : null}
      <div className="strategic-workspace-frame">
        <article className="strategic-realization-anchor" aria-labelledby="strategic-realization-title">
          <div className="strategic-reading-label"><span aria-hidden="true">✦</span><span>Realization</span></div>
          <h2 id="strategic-realization-title">{realization.title}</h2>
          <p>{realization.summary}</p>
        </article>
        <section className="strategic-impacts" aria-labelledby="strategic-impacts-title">
          <header><p className="eyebrow">What changed</p><h3 id="strategic-impacts-title">Observed impacts</h3></header>
          <ul>{relatedImpacts.map((impact) => <li key={impact.id}><span aria-hidden="true">◇</span><span><strong>{impact.title}</strong><br />{impact.summary}</span></li>)}</ul>
        </section>
        <div className="strategic-value-lenses" aria-label="Complementary value lenses">
          <section className="strategic-value-lens" aria-labelledby="strategic-pragmatic-title"><span className="strategic-lens-mark" aria-hidden="true">01</span><p className="eyebrow">Capacity created</p><h3 id="strategic-pragmatic-title">Pragmatic value</h3><p>{realization.pragmaticValue.summary}</p></section>
          <section className="strategic-value-lens" aria-labelledby="strategic-integrative-title"><span className="strategic-lens-mark" aria-hidden="true">02</span><p className="eyebrow">Meaning integrated</p><h3 id="strategic-integrative-title">Integrative value</h3><p>{realization.integrativeValue.summary}</p></section>
        </div>
      </div>
    </section>
  );
}
