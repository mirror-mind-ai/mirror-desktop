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
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="m5.25 10.25 3 3 6.5-6.5" />
        </svg>
      ) : (
        <span className="journey-agent-status-core" aria-hidden="true" />
      )}
      {placement === "header" ? <span className="journey-agent-status-label" aria-hidden="true">{label}</span> : null}
    </span>
  );
}
