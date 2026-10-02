import { ArtifactMarkdown } from "./ArtifactMarkdown";
import type { JourneyWorkflowViewState } from "../domain/journeyWorkflow";
import {
  composeWorkflowRerenderPrompt,
  composeWorkflowSetupPrompt,
} from "../domain/journeyWorkflowPrompts";

/**
 * CR112: hosts the view a Journey declares about its own work. The app supplies the slot, the
 * provenance and honest absence. It never supplies the shape, and it understands none of the
 * Journey's own vocabulary.
 *
 * Both controls only pre-fill the composer, which is the house boundary measured on
 * `JourneyArrivalSurface`: composing a message is permitted, running the agent is not.
 */
type JourneyWorkflowSurfaceProps = {
  journeyName: string;
  /**
   * The Journey's own description, used only as the language anchor for the composed prompts.
   * CR105 measured that the briefing never reaches a Desktop turn, so the agent cannot read it
   * and the app has to carry it in. It is never displayed here.
   */
  journeyBriefing?: string;
  workflow: JourneyWorkflowViewState;
  onCompose: (message: string) => void;
};

/**
 * Why each reason is worth naming: an empty frame teaches nothing, while the specific reason is
 * usually enough for the Navigator to see what to repair.
 */
function unavailableHeadline(reason: string): string {
  switch (reason) {
    case "manifest_symlink":
      return "The workflow manifest is a symbolic link";
    case "manifest_malformed":
      return "The workflow manifest could not be read as valid JSON";
    case "manifest_oversized":
      return "The workflow manifest is larger than this app will read";
    case "manifest_unreadable":
      return "The workflow manifest could not be opened";
    case "invalid_declared_path":
      return "The manifest declares a path outside this Journey's workspace";
    case "unsupported_schema_version":
      return "The manifest declares a schema version this app does not read";
    case "missing":
      return "The declared view file no longer exists";
    case "symlink":
      return "The declared view file is a symbolic link";
    case "unsupported_type":
      return "The declared view file is not a readable text document";
    case "oversized":
      return "The declared view file is larger than this app will render";
    case "invalid_utf8":
      return "The declared view file is not valid UTF-8 text";
    case "invalid_path":
      return "The declared view path is outside this Journey's workspace";
    default:
      return "The declared view cannot be shown";
  }
}

function ComposeNotice() {
  return (
    <p className="journey-workflow-compose-notice">
      The request is written into the Conversation composer. Nothing is sent until you decide.
    </p>
  );
}

export function JourneyWorkflowSurface(props: JourneyWorkflowSurfaceProps) {
  return (
    <section
      id="operational-workflow-panel"
      className="journey-workflow"
      role="tabpanel"
      aria-label="Workflow"
    >
      {workflowBody(props)}
    </section>
  );
}

function workflowBody({ journeyName, journeyBriefing, workflow, onCompose }: JourneyWorkflowSurfaceProps) {
  if (workflow.status === "loading") {
    return <p className="journey-workflow-state" role="status">Reading the declared workflow…</p>;
  }

  if (workflow.status === "error") {
    return (
      <>
        <div className="journey-workflow-state">
          <strong>The workflow declaration could not be read</strong>
          <p>{workflow.message}</p>
        </div>
      </>
    );
  }

  if (workflow.status === "undeclared") {
    return (
      <>
        <div className="journey-workflow-state">
          <strong>This Journey has not declared a workflow view</strong>
          <p>
            A Journey declares its own view, so this app does not guess at one. When this Journey
            declares a manifest named <code>{workflow.manifestRelativePath}</code> at its root, the
            view it points to appears here.
          </p>
          <p>
            The request below asks this Journey's agent to look for a workflow already written in
            its own documents, report what it found, and stop. It is told not to invent one.
          </p>
        </div>
        <div className="journey-workflow-actions">
          <button type="button" className="secondary-button" onClick={() => onCompose(composeWorkflowSetupPrompt(journeyName, journeyBriefing))}>
            Compose the setup request
          </button>
        </div>
        <ComposeNotice />
      </>
    );
  }

  if (workflow.status === "unavailable") {
    return (
      <>
        <div className="journey-workflow-state">
          <strong>{unavailableHeadline(workflow.reason)}</strong>
          {workflow.detail ? <p>{workflow.detail}</p> : null}
          <p>
            The declared view cannot be shown. Nothing is rendered in its place, because a
            substitute written by this app would not be the view this Journey declared.
          </p>
        </div>
      </>
    );
  }

  const lagging = workflow.status === "possibly_stale";

  return (
    <>
      <header className="journey-workflow-header">
        <h2>{workflow.title}</h2>
        <p className="journey-workflow-subject">Declared by this Journey in {workflow.surfacePath}</p>
      </header>

      {/*
        There is no positive freshness claim anywhere on this surface. The manifest's declared
        source list cannot prove completeness, so the surface can say that a known input changed
        and must never imply that nothing relevant did.
      */}
      {lagging ? (
        <div className="journey-workflow-lag" role="status">
          {workflow.changedInputs.length > 0 ? (
            <p>
              Declared sources changed after this view was written:{" "}
              <strong>{workflow.changedInputs.join(", ")}</strong>
            </p>
          ) : null}
          {workflow.missingInputs.length > 0 ? (
            <p>
              Declared sources that could not be read, so this view could not be checked against
              them: <strong>{workflow.missingInputs.join(", ")}</strong>
            </p>
          ) : null}
          {workflow.changedInputs.length === 0 && workflow.missingInputs.length === 0 ? (
            <p>This view could not be checked against its declared sources.</p>
          ) : null}
        </div>
      ) : null}

      <div className="journey-workflow-view">
        <ArtifactMarkdown content={workflow.content} />
      </div>

      <dl className="journey-workflow-provenance">
        <dt>Contract</dt>
        <dd><code>{workflow.contractPath}</code></dd>
        <dt>Declared sources</dt>
        <dd>
          {workflow.sourcePaths.length > 0
            ? workflow.sourcePaths.map((path) => <code key={path}>{path}</code>)
            : <span>The manifest declares no sources.</span>}
        </dd>
      </dl>

      <div className="journey-workflow-actions">
        <button type="button" className="secondary-button" onClick={() => onCompose(composeWorkflowRerenderPrompt(journeyName, journeyBriefing))}>
          Compose a request to regenerate this view
        </button>
      </div>
      <ComposeNotice />
    </>
  );
}
