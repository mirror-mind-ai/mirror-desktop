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
};

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
      {status === "finished" ? (
        /* CR106: a filled disc with the check knocked out of it. The shape, not only the colour,
           separates completion from Working and Finishing — which matters because the accent the
           Navigator chooses can itself be green. */
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle className="journey-agent-status-disc" cx="10" cy="10" r="9" />
          <path className="journey-agent-status-check" d="m5.75 10.4 2.7 2.7 5.8-5.8" />
        </svg>
      ) : (
        <span className="journey-agent-status-core" aria-hidden="true" />
      )}
      {placement === "header" ? <span className="journey-agent-status-label" aria-hidden="true">{label}</span> : null}
    </span>
  );
}
