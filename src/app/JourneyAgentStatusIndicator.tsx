import { journeyAgentStatusLabel, type JourneyAgentStatus as Status } from "./journeyAgentStatus";
import type { JourneyWorkLocus } from "./journeyWorkLocus";

type JourneyAgentStatusIndicatorProps = {
  journeyName: string;
  status: Status;
  placement: "sidebar" | "header";
  /**
   * CR134: whose work this is. Absent renders exactly as before, so a surface that has not been
   * taught the distinction is unaffected.
   */
  locus?: JourneyWorkLocus;
  /**
   * CR134: present only when the owning work lives in a conversation and can be reached. The
   * Journey row is the one carrier no sidebar configuration can remove, so it has to lead
   * somewhere rather than only report.
   */
  onNavigateToOwner?: () => void;
};

const statusCopy: Record<Status, { label: string; title: string }> = {
  idle: { label: "agent is idle", title: "Agent idle" },
  working: { label: "agent is working", title: "Agent working" },
  finishing: { label: "agent is finishing", title: "Agent finishing" },
  finished: { label: "agent finished", title: "Agent finished" },
  interrupted: { label: "agent was interrupted", title: "Agent interrupted" },
  failed: { label: "agent failed", title: "Agent failed" },
};

/** Locus only qualifies live work; the terminal states describe what already happened. */
function locusApplies(status: Status, locus?: JourneyWorkLocus): locus is "inside" {
  return locus === "inside" && (status === "working" || status === "finishing");
}

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
 *
 * CR134 adds one operation rather than new states: when the work belongs to a conversation inside
 * the Journey, the status mark is drawn smaller and enclosed in a containing contour, so it reads
 * as nested. The contour sits at the badge's outer extent, the same spatial register CR102 gave
 * the terminal disc, and its absence is not a claim of ownership — it only means no `inside`
 * claim is being made.
 */
function StatusGlyph({ status, nested }: { status: Status; nested: boolean }) {
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
        {nested ? <circle className="journey-agent-status-container" cx="10" cy="10" r="8.4" /> : null}
        <circle className="journey-agent-status-dot" cx="10" cy="10" r={nested ? "3" : "5"} />
      </svg>
    );
  }
  if (status === "finishing") {
    /* A thick band with a hollow centre: the same register as Working, a different topology. */
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        {nested ? <circle className="journey-agent-status-container" cx="10" cy="10" r="8.4" /> : null}
        <circle
          className={`journey-agent-status-annulus${nested ? " is-nested" : ""}`}
          cx="10"
          cy="10"
          r={nested ? "3.1" : "5"}
        />
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

export function JourneyAgentStatusIndicator({
  journeyName,
  status,
  placement,
  locus,
  onNavigateToOwner,
}: JourneyAgentStatusIndicatorProps) {
  const copy = statusCopy[status];
  const label = journeyAgentStatusLabel(status);
  const nested = locusApplies(status, locus);
  const className = `journey-agent-status ${status} placement-${placement}${nested ? " locus-inside" : ""}`;
  const glyph = <StatusGlyph status={status} nested={nested} />;
  const text = placement === "header"
    ? <span className="journey-agent-status-label" aria-hidden="true">{label}</span>
    : null;

  // Only the sidebar needs the route: in the header the Navigator is already inside the Journey
  // and its conversation list is one surface away.
  if (nested && onNavigateToOwner && placement === "sidebar") {
    return (
      <button
        type="button"
        className={className}
        // A control's accessible name describes what activating it does. The state still reaches
        // assistive technology through the selected workspace's own header indicator.
        aria-label={`Go to the conversation working in ${journeyName}`}
        title={`${copy.title} in a conversation — go to it`}
        onClick={(event) => {
          event.stopPropagation();
          onNavigateToOwner();
        }}
        onKeyDown={(event) => {
          // CR133 found that the row above handles Enter and Space and calls preventDefault,
          // which both selects the Journey and suppresses this control's native activation.
          if (event.key === "Enter" || event.key === " ") event.stopPropagation();
        }}
      >
        {glyph}
        {text}
      </button>
    );
  }

  return (
    <span
      className={className}
      role="status"
      aria-label={`${journeyName} ${copy.label}${nested ? " in a conversation" : ""}`}
      title={nested ? `${copy.title} in a conversation` : copy.title}
    >
      {glyph}
      {text}
    </span>
  );
}
