import type { RepresentativeJourneyPreview } from "./journeyAltitudePreview";

type OperationalArtifactsPreviewProps = {
  artifacts: RepresentativeJourneyPreview["artifacts"];
};

export function OperationalArtifactsPreview({ artifacts }: OperationalArtifactsPreviewProps) {
  return (
    <section
      id="operational-artifacts-panel"
      className="operational-artifacts-workspace"
      role="tabpanel"
      aria-label="Operational artifacts workspace"
    >
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
