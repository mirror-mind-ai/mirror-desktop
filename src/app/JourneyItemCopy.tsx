import type { JourneyAgentStatus } from "./journeyAgentStatus";

type JourneyItemCopyProps = {
  layout: "card" | "tree";
  journeyName: string;
  description: string;
  lastWorkedLabel?: string;
  agentStatusLabel?: string;
  /** CR106: lets the label carry the same register as its icon, so Ready reads as completion. */
  agentStatusKind?: JourneyAgentStatus;
  pinned?: boolean;
};

export function JourneyItemCopy({
  layout,
  journeyName,
  description,
  lastWorkedLabel,
  agentStatusLabel,
  agentStatusKind,
  pinned = false,
}: JourneyItemCopyProps) {
  const content = (
    <>
      <strong className="journey-name">
        {journeyName}
        {pinned ? <span className="journey-pinned-marker" aria-label="Pinned" title="Pinned">◆</span> : null}
      </strong>
      <small className="journey-context">{description}</small>
      {agentStatusLabel || lastWorkedLabel ? (
        <small className={`journey-last-worked${agentStatusLabel ? " agent-status" : ""}${agentStatusLabel && agentStatusKind ? ` ${agentStatusKind}` : ""}`}>
          {agentStatusLabel ?? lastWorkedLabel}
        </small>
      ) : null}
    </>
  );
  return layout === "tree" ? <span className="journey-copy">{content}</span> : content;
}
