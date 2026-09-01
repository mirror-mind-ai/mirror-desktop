import type { JourneyRunIdentity } from "./journeyRuntimeState";

export async function cancelExactJourneyRun(
  identity: JourneyRunIdentity,
  dependencies: {
    cancelInvocation: (journeyId: string, runId: string) => Promise<void>;
  },
): Promise<void> {
  if (identity.kind !== "live") {
    throw new Error("Only live Pi invocations have native cancellation authority.");
  }
  const { journeyId, runId } = identity.authority;
  await dependencies.cancelInvocation(journeyId, runId);
}
