import { ArtifactMarkdown } from "./ArtifactMarkdown";
import type { JourneyCanvasViewState } from "../domain/journeyCanvas";
import {
  composeCanvasRedrawPrompt,
  composeCanvasTeachingPrompt,
} from "../domain/journeyCanvasPrompts";

/**
 * CR112: hosts the drawing a Journey's agent keeps. The app supplies the slot, when it was drawn,
 * and honest absence. It supplies no shape and names no genre, which is the whole finding of the
 * pivot: naming the genre is what made a truthful panel look wrong.
 *
 * Both controls only pre-fill the composer, the house boundary measured on
 * `JourneyArrivalSurface`: composing a message is permitted, running the agent is not.
 */
type JourneyCanvasSurfaceProps = {
  journeyName: string;
  /**
   * The Journey's own description, used only as the language anchor for the composed prompts.
   * CR105 measured that the briefing never reaches a Desktop turn, so the agent cannot read it
   * and the app has to carry it in. It is never displayed here.
   */
  journeyBriefing?: string;
  canvas: JourneyCanvasViewState;
  onCompose: (message: string) => void;
  onReload: () => void;
  reloading: boolean;
};

/**
 * Why each reason is worth naming: an empty frame teaches nothing, while the specific reason is
 * usually enough for the Navigator to see what to repair.
 */
function unavailableHeadline(reason: string): string {
  switch (reason) {
    case "symlink":
      return "The canvas file is a symbolic link";
    case "oversized":
      return "The canvas file is larger than this app will render";
    case "invalid_utf8":
      return "The canvas file is not valid UTF-8 text";
    case "unsupported_type":
      return "The canvas path is not a readable text document";
    case "unreadable":
      return "The canvas file could not be opened";
    default:
      return "The canvas cannot be shown";
  }
}

function ComposeNotice() {
  return (
    <p className="journey-canvas-compose-notice">
      The request is written into the Conversation composer. Nothing is sent until you decide.
    </p>
  );
}

function drawnAtLabel(drawnAt?: number): string {
  if (drawnAt === undefined) return "Drawn at an unknown time";
  return `Drawn ${new Date(drawnAt).toLocaleString()}`;
}

export function JourneyCanvasSurface(props: JourneyCanvasSurfaceProps) {
  return (
    <section
      id="operational-canvas-panel"
      className="journey-canvas"
      role="tabpanel"
      aria-label="Canvas"
    >
      {canvasBody(props)}
    </section>
  );
}

function TeachingAction({ journeyName, journeyBriefing, onCompose }: Pick<JourneyCanvasSurfaceProps, "journeyName" | "journeyBriefing" | "onCompose">) {
  return (
    <button
      type="button"
      className="secondary-button"
      onClick={() => onCompose(composeCanvasTeachingPrompt(journeyName, journeyBriefing))}
    >
      Teach the agent to draw on the canvas
    </button>
  );
}

function canvasBody(props: JourneyCanvasSurfaceProps) {
  const { journeyName, journeyBriefing, canvas, onCompose, onReload, reloading } = props;

  if (canvas.status === "loading") {
    return <p className="journey-canvas-state" role="status">Reading the canvas…</p>;
  }

  if (canvas.status === "error") {
    return (
      <div className="journey-canvas-state">
        <strong>The canvas could not be read</strong>
        <p>{canvas.message}</p>
      </div>
    );
  }

  if (canvas.status === "undrawn") {
    return (
      <>
        <div className="journey-canvas-state">
          <strong>This Journey's agent has not drawn a canvas</strong>
          <p>
            The canvas is the agent's drawing area: a durable view of what is happening in this
            Journey, kept in a file named <code>{canvas.relativePath}</code> at the Journey root.
            This app renders whatever is there and decides nothing about its shape.
          </p>
          <p>
            The request below asks this Journey's agent what belongs on the canvas, draws a first
            version, and records the practice in <code>{canvas.instructionsRelativePath}</code> so
            it survives the session.
          </p>
        </div>
        <div className="journey-canvas-actions">
          <TeachingAction journeyName={journeyName} journeyBriefing={journeyBriefing} onCompose={onCompose} />
        </div>
        <ComposeNotice />
      </>
    );
  }

  if (canvas.status === "unavailable") {
    return (
      <div className="journey-canvas-state">
        <strong>{unavailableHeadline(canvas.reason)}</strong>
        <p>
          Nothing is rendered in its place, because a substitute written by this app would not be
          the drawing this Journey keeps. The file is <code>{canvas.relativePath}</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="journey-canvas-header">
        {/*
          The only temporal fact on this surface. With no declared sources the app cannot know
          whether the drawing is current, so it says when it was made and implies nothing further.
        */}
        <p className="journey-canvas-subject">{drawnAtLabel(canvas.drawnAt)}</p>
        <button
          type="button"
          className="journey-canvas-reload"
          onClick={onReload}
          disabled={reloading}
          aria-label="Reload the canvas"
          title="Reload the canvas"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </header>

      {reloading ? <p className="journey-canvas-reloading" role="status">Re-reading the canvas…</p> : null}

      <div className="journey-canvas-view">
        <ArtifactMarkdown content={canvas.content} />
      </div>

      {/*
        A drawing without standing instructions is a drawing that will not be kept, so the
        teaching gesture stays available beside the redraw gesture rather than replacing it.
      */}
      {!canvas.instructionsPresent ? (
        <div className="journey-canvas-state">
          <strong>This canvas has no standing instructions</strong>
          <p>
            Without <code>{canvas.instructionsRelativePath}</code> the agent has nothing durable to
            follow, so the next session will not know what to redraw or when.
          </p>
        </div>
      ) : null}

      <div className="journey-canvas-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onCompose(composeCanvasRedrawPrompt(journeyName, journeyBriefing))}
        >
          Ask the agent to redraw the canvas
        </button>
        {!canvas.instructionsPresent ? (
          <TeachingAction journeyName={journeyName} journeyBriefing={journeyBriefing} onCompose={onCompose} />
        ) : null}
      </div>
      <ComposeNotice />
    </>
  );
}
