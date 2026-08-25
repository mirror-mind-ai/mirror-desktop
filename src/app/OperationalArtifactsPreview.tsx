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
    <section
      id="operational-artifacts-panel"
      className="operational-artifacts-workspace"
      role="tabpanel"
      aria-label="Representative Journey artifacts"
    >
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
      <div className="operational-artifacts-layout">
        <div className="operational-artifacts-browser">
          <p className="operational-artifacts-section-label">Workspace structure</p>
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
        </div>
        <div className="operational-artifact-detail-preview">
          <span className="operational-artifact-detail-symbol" aria-hidden="true">□</span>
          <h3>Artifact detail area</h3>
          <p>Selecting and reading real Journey files belongs to the next Operational artifact increment.</p>
        </div>
      </div>
    </section>
  );
}
