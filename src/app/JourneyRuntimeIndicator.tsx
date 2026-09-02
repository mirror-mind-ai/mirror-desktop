import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

type JourneyRuntimeIndicatorProps = {
  journeyName: string;
  phase: JourneyRuntimeOwnerPhase;
};

export function JourneyRuntimeIndicator({
  journeyName,
  phase,
}: JourneyRuntimeIndicatorProps) {
  const running = phase === "running";
  return (
    <span
      className={`journey-runtime-state ${phase}`}
      role="status"
      aria-label={`${journeyName} is ${running ? "working" : "recording the completed turn"}`}
    >
      <span className="journey-runtime-dot" aria-hidden="true" />
      {running ? "Working" : "Recording"}
    </span>
  );
}
