export type JourneyRunTerminal = "completed" | "cancelled" | "failed";

export function captureJourneyRunTerminal(
  current: JourneyRunTerminal | undefined,
  candidate: JourneyRunTerminal,
): JourneyRunTerminal {
  return current ?? candidate;
}
