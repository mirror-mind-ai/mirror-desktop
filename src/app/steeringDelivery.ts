import type { JourneyConversation } from "../domain/journeyConversation";
import type { RunAuthority } from "../domain/runAuthority";
import { transitionSteering } from "../domain/steeringState";

/**
 * CR187: how often a correction that arrived before its invocation could take it asks again, and
 * for how long. The Composer offers Steering as soon as the turn is live in the renderer, which is
 * before the native invocation exists and well before it has written the turn's prompt to Pi.
 */
export const STEERING_READINESS_POLL_MS = 250;
export const STEERING_READINESS_DEADLINE_MS = 120_000;

export type SteeringDeliveryOutcome =
  | { kind: "admitted"; status: "pending" | "accepted" }
  | { kind: "run_ended" }
  | { kind: "rejected"; reason: string };

export type SteeringDeliveryPorts = {
  steer: () => Promise<{ status: "pending" | "accepted" | "waiting" }>;
  runStillLive: () => boolean;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

/**
 * Asks the native invocation to take one correction until it can. `waiting` means nothing was
 * written to Pi, so asking again cannot deliver it twice. A run that ends first leaves the
 * correction pending: the settlement owns it from there and records it as unconsumed.
 */
export async function deliverSteeringWhenReady(ports: SteeringDeliveryPorts): Promise<SteeringDeliveryOutcome> {
  const startedAt = ports.now();
  for (;;) {
    let status: "pending" | "accepted" | "waiting";
    try {
      ({ status } = await ports.steer());
    } catch (error) {
      return { kind: "rejected", reason: error instanceof Error ? error.message : String(error) };
    }
    if (status !== "waiting") return { kind: "admitted", status };
    if (!ports.runStillLive()) return { kind: "run_ended" };
    if (ports.now() - startedAt >= STEERING_READINESS_DEADLINE_MS) {
      return {
        kind: "rejected",
        reason: `The Pi invocation was not ready to take the correction within ${STEERING_READINESS_DEADLINE_MS / 1000} s.`,
      };
    }
    await ports.sleep(STEERING_READINESS_POLL_MS);
  }
}

/**
 * The conversation a delivery outcome produces, applied to the freshest conversation of the run
 * rather than the one staged before the wait, so the turn's streamed messages are not replaced by
 * an older copy. `undefined` means there is nothing to write: the correction is still Pi's to
 * report, or the settlement already decided it while the delivery waited.
 */
export function settleSteeringDelivery(
  conversation: JourneyConversation,
  authority: RunAuthority,
  requestId: string,
  outcome: SteeringDeliveryOutcome,
  now: Date = new Date(),
): JourneyConversation | undefined {
  const evidence = conversation.steeringEvidence?.find((item) => item.requestId === requestId);
  if (evidence?.status !== "pending") return undefined;
  if (outcome.kind === "admitted") {
    return outcome.status === "accepted"
      ? transitionSteering(conversation, authority, requestId, "accepted", now)
      : undefined;
  }
  if (outcome.kind === "run_ended") return undefined;
  return transitionSteering(conversation, authority, requestId, "rejected", now, { rejectionReason: outcome.reason });
}
