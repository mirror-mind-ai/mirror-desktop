import { journeyAgentStatusLabel, type JourneyAgentStatus as Status } from "./journeyAgentStatus";

type JourneyAgentStatusIndicatorProps = {
  journeyName: string;
  status: Status;
  placement: "sidebar" | "header";
};

const statusCopy: Record<Status, { label: string; title: string }> = {
  idle: { label: "agent is idle", title: "Agent idle" },
  working: { label: "agent is working", title: "Agent working" },
  finishing: { label: "agent is finishing", title: "Agent finishing" },
  finished: { label: "agent finished", title: "Agent finished" },
  interrupted: { label: "agent was interrupted", title: "Agent interrupted" },
  failed: { label: "agent failed", title: "Agent failed" },
};

/**
 * CR102: every state owns a shape, so the glyph alone identifies it.
 *
 * Colour and motion used to carry the whole signal, and measurement showed how little they carried:
 * Working and Finishing sat 1.15 apart on the default theme and were identical by construction on
 * the light families, where the reduced-motion preference also removed the animation that was the
 * last difference between them. Topology survives all three — a shared colour register, a stripped
 * animation, and a greyscale display.
 *
 * The quiet states stay small and centred; the terminal ones fill the badge with a disc and knock
 * the mark out of it, because those are the ones asking to be noticed. The Ready glyph is CR106's,
 * unchanged.
 */
function StatusGlyph({ status }: { status: Status }) {
  if (status === "idle") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="journey-agent-status-ring" cx="10" cy="10" r="5" />
      </svg>
    );
  }
  if (status === "working") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="journey-agent-status-dot" cx="10" cy="10" r="5" />
      </svg>
    );
  }
  if (status === "finishing") {
    /* A thick band with a hollow centre: the same register as Working, a different topology. */
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="journey-agent-status-annulus" cx="10" cy="10" r="5" />
      </svg>
    );
  }
  if (status === "finished") {
    /* CR106: a filled disc with the check knocked out of it. The shape, not only the colour,
       separates completion from Working and Finishing — which matters because the accent the
       Navigator chooses can itself be green. */
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="journey-agent-status-disc" cx="10" cy="10" r="9" />
        <path className="journey-agent-status-check" d="m5.75 10.4 2.7 2.7 5.8-5.8" />
      </svg>
    );
  }
  if (status === "interrupted") {
    /* A single bar: stopped, and stopped on purpose. Not a cross, because nothing went wrong. */
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle className="journey-agent-status-disc" cx="10" cy="10" r="9" />
        <path className="journey-agent-status-bar" d="M6.2 10h7.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle className="journey-agent-status-disc" cx="10" cy="10" r="9" />
      <path className="journey-agent-status-cross" d="m6.9 6.9 6.2 6.2M13.1 6.9l-6.2 6.2" />
    </svg>
  );
}

export function JourneyAgentStatusIndicator({ journeyName, status, placement }: JourneyAgentStatusIndicatorProps) {
  const copy = statusCopy[status];
  const label = journeyAgentStatusLabel(status);
  return (
    <span
      className={`journey-agent-status ${status} placement-${placement}`}
      role="status"
      aria-label={`${journeyName} ${copy.label}`}
      title={copy.title}
    >
      <StatusGlyph status={status} />
      {placement === "header" ? <span className="journey-agent-status-label" aria-hidden="true">{label}</span> : null}
    </span>
  );
}
