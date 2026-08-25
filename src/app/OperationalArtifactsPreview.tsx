import type { RepresentativeJourneyPreview } from "./journeyAltitudePreview";

type OperationalArtifactsPreviewProps = {
  journeyName: string;
  artifacts: RepresentativeJourneyPreview["artifacts"];
};

export function OperationalArtifactsPreview({
  journeyName,
  artifacts,
}: OperationalArtifactsPreviewProps) {
  return (
    <section className="operational-artifacts-preview" aria-label="Representative Journey artifacts">
      <div className="operational-artifacts-heading">
        <div>
          <p className="eyebrow">Journey artifacts</p>
          <h2>{journeyName}</h2>
        </div>
        <span className="preview-badge">Representative preview</span>
      </div>
      <p className="operational-artifacts-note">
        Live workspace reading comes later. These entries only explore the relationship between conversation and material context.
      </p>
      <ul className="operational-artifact-list">
        {artifacts.items.map((artifact) => (
          <li key={artifact.id} className={`operational-artifact-item artifact-${artifact.kind}`}>
            <span className="operational-artifact-icon" aria-hidden="true">
              {artifact.kind === "folder" ? "▾" : "·"}
            </span>
            <span>
              <strong>{artifact.label}</strong>
              <small>{artifact.path}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
