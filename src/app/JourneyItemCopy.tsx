import { JourneyRuntimeIndicator } from "./JourneyRuntimeIndicator";
import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

type JourneyItemCopyProps = {
  journeyName: string;
  description: string;
  runtimePhase?: JourneyRuntimeOwnerPhase;
};

export function JourneyItemCopy({
  journeyName,
  description,
  runtimePhase,
}: JourneyItemCopyProps) {
  return (
    <span className="journey-copy">
      <strong className="journey-name">{journeyName}</strong>
      <small className="journey-context">{description}</small>
      {runtimePhase ? (
        <JourneyRuntimeIndicator journeyName={journeyName} phase={runtimePhase} />
      ) : null}
    </span>
  );
}
