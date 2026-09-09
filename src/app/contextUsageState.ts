import type { AuthoritativeContextStats } from "../domain/journeyConversation";
import type { RuntimeContextUsage } from "./runtimeActivityModel";

export type PiContextState =
  | "checking"
  | "waiting"
  | "available"
  | "updating"
  | "not_initialized"
  | "unknown_after_compaction"
  | "session_missing"
  | "model_mismatch"
  | "inspection_failed";

export type PiContextInspectionReason =
  | "session_file_missing"
  | "first_usage_pending"
  | "post_compaction_usage_pending";

export type PiContextInspection = {
  status: "missing" | "waiting" | "available";
  reason?: PiContextInspectionReason;
  snapshot?: { tokens: number; providerModel: string };
};

export function hasMatchingContextStats(
  stats: AuthoritativeContextStats | undefined,
  identity: { piSessionId: string; generation: number },
  providerModel: string,
): stats is AuthoritativeContextStats {
  return Boolean(
    stats
    && stats.piSessionId === identity.piSessionId
    && stats.generation === identity.generation
    && stats.providerModel === providerModel
    && stats.usage.tokens !== null,
  );
}

export function contextStateForLiveUsage(usage: RuntimeContextUsage): PiContextState {
  return usage.tokens === null ? "unknown_after_compaction" : "available";
}

export function contextStateForInspection(
  inspection: PiContextInspection,
  providerModel: string,
): PiContextState {
  if (inspection.status === "missing") return "session_missing";
  if (inspection.status === "waiting") {
    return inspection.reason === "post_compaction_usage_pending"
      ? "unknown_after_compaction"
      : "waiting";
  }
  if (!inspection.snapshot) return "inspection_failed";
  if (inspection.snapshot.providerModel !== providerModel) return "model_mismatch";
  return "available";
}

export async function readContextStatsWithBoundedRetry(
  read: () => Promise<PiContextInspection>,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  delays: readonly number[] = [0, 75, 225],
): Promise<PiContextInspection> {
  let latest: PiContextInspection = { status: "waiting", reason: "first_usage_pending" };
  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    latest = await read();
    if (latest.status !== "waiting" || latest.reason !== "first_usage_pending") return latest;
  }
  return latest;
}
