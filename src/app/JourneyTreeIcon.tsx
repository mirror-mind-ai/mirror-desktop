import type { JourneyRuntimeOwnerPhase } from "./journeyRuntimeState";

type JourneyTreeIconProps = {
  runtimePhase?: JourneyRuntimeOwnerPhase;
};

export function JourneyTreeIcon({ runtimePhase }: JourneyTreeIconProps) {
  return (
    <svg
      className="journey-tree-glyph"
      data-journey-icon="true"
      data-runtime-phase={runtimePhase}
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
    >
      <path className="journey-tree-orbit" d="M15.7 6.2A6.5 6.5 0 1 1 10 3.5" />
      <path className="journey-tree-route" d="M10 3.5h4.1v4.1" />
      <path className="journey-tree-core" d="m10 7 3 3-3 3-3-3z" />
      <circle className="journey-tree-waypoint" cx="15.7" cy="6.2" r="1.35" />
      {runtimePhase ? (
        <circle className="journey-tree-activity-signal" cx="15.7" cy="6.2" r="2.8" />
      ) : null}
    </svg>
  );
}
