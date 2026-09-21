export const TRANSIENT_COMPOSER_NOTICE_MS = 8_000;

export function scheduleTransientComposerNotice(
  onDismiss: () => void,
  duration = TRANSIENT_COMPOSER_NOTICE_MS,
): () => void {
  const timeout = setTimeout(onDismiss, duration);
  return () => clearTimeout(timeout);
}

export function clearScheduledNotice(current: string | undefined, scheduled: string): string | undefined {
  return current === scheduled ? undefined : current;
}

import type { AgentRunStatus } from "../agent/agentRun";

export function terminalStreamWarningNoticeKey(
  journeyId: string,
  runId: string | undefined,
  warnings: string[],
  runStatus: AgentRunStatus,
): string | undefined {
  if (runStatus !== "failed") return undefined;
  const finalWarning = warnings.at(-1);
  return finalWarning ? JSON.stringify([journeyId, runId ?? null, warnings.length, finalWarning]) : undefined;
}
