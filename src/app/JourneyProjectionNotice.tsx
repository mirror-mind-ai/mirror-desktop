type JourneyProjectionNoticeProps = {
  altitude: "tactical" | "strategic";
  kind: "stale" | "error";
};

export function JourneyProjectionNotice({ altitude, kind }: JourneyProjectionNoticeProps) {
  const label = altitude === "tactical" ? "Tactical" : "Strategic";
  return (
    <p className={`journey-projection-notice notice-${kind}`} role="status">
      {kind === "stale"
        ? `${label} is based on an earlier published source. Explicitly refresh the synthesis when ready.`
        : `${label} could not read a valid published projection.`}
    </p>
  );
}
