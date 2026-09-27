type JourneyItemCopyProps = {
  layout: "card" | "tree";
  journeyName: string;
  description: string;
  lastWorkedLabel?: string;
  agentStatusLabel?: string;
  pinned?: boolean;
};

export function JourneyItemCopy({
  layout,
  journeyName,
  description,
  lastWorkedLabel,
  agentStatusLabel,
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
        <small className={`journey-last-worked${agentStatusLabel ? " agent-status" : ""}`}>
          {agentStatusLabel ?? lastWorkedLabel}
        </small>
      ) : null}
    </>
  );
  return layout === "tree" ? <span className="journey-copy">{content}</span> : content;
}
