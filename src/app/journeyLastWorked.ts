const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function relativeLastWorkedLabel(lastWorkedAt: string | undefined, nowMs: number): string {
  if (!lastWorkedAt) return "No recorded work";
  const workedAtMs = Date.parse(lastWorkedAt);
  if (!Number.isFinite(workedAtMs)) return "No recorded work";
  const elapsedMs = Math.max(0, nowMs - workedAtMs);
  if (elapsedMs < MINUTE_MS) return "just now";
  if (elapsedMs < HOUR_MS) return unitLabel(Math.floor(elapsedMs / MINUTE_MS), "minute");
  if (elapsedMs < DAY_MS) return unitLabel(Math.floor(elapsedMs / HOUR_MS), "hour");
  if (elapsedMs < MONTH_MS) return unitLabel(Math.floor(elapsedMs / DAY_MS), "day");
  if (elapsedMs < YEAR_MS) return unitLabel(Math.floor(elapsedMs / MONTH_MS), "month");
  return unitLabel(Math.floor(elapsedMs / YEAR_MS), "year");
}

export function recordJourneyLastWorked(
  current: Record<string, string>,
  journeyId: string,
  admittedAt: string,
): Record<string, string> {
  if (!journeyId.trim() || !Number.isFinite(Date.parse(admittedAt))) return current;
  return { ...current, [journeyId]: admittedAt };
}

function unitLabel(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}
