import { JourneyRuntimeIndicator } from "./JourneyRuntimeIndicator";
import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

type JourneyItemCopyProps = {
  layout: "card" | "tree";
  journeyName: string;
  description: string;
  lastWorkedLabel?: string;
  runtimePhase?: JourneyRuntimeOwnerPhase;
};

export function JourneyItemCopy({
  layout,
  journeyName,
  description,
  lastWorkedLabel,
  runtimePhase,
}: JourneyItemCopyProps) {
  const content = (
    <>
      <strong className="journey-name">{journeyName}</strong>
      <small className="journey-context">{description}</small>
      {lastWorkedLabel ? <small className="journey-last-worked">{lastWorkedLabel}</small> : null}
      {runtimePhase ? (
        <JourneyRuntimeIndicator journeyName={journeyName} phase={runtimePhase} />
      ) : null}
    </>
  );
  return layout === "tree" ? <span className="journey-copy">{content}</span> : content;
}
