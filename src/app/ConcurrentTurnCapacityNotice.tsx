import type { PiInvocationCapacityPresentation } from "./piInvocationOccupancy";

type ConcurrentTurnCapacityNoticeProps = {
  presentation: PiInvocationCapacityPresentation;
};

export function ConcurrentTurnCapacityNotice({
  presentation,
}: ConcurrentTurnCapacityNoticeProps) {
  return (
    <section className="dedicated-turn-notice" role="status" aria-live="polite">
      <strong>{presentation.label}</strong>
      <p>{presentation.available === 0
        ? "No concurrent turns are available until an admitted Journey finishes recording."
        : `${presentation.available} available concurrent turn${presentation.available === 1 ? "" : "s"}.`}</p>
    </section>
  );
}
