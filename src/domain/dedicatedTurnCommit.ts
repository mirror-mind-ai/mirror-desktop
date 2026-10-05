import { markTurnBodyFailed } from "./conversationReconciliation";
import type { JourneyConversation } from "./journeyConversation";

export type DedicatedTurnState =
  | "ready"
  | "provider_running"
  | "projection_pending"
  | "mirror_pending"
  | "failed";

export function classifyDedicatedTurnState(conversation: JourneyConversation, providerRunning = false): DedicatedTurnState {
  if (providerRunning) return "provider_running";
  const turn = [...conversation.reconciliation.turns].reverse().find((candidate) => candidate.origin === "nautilus");
  if (!turn) return "ready";
  if (turn.pi.state === "failed" || turn.harness.state === "failed") return "failed";
  if (turn.pi.state === "committed" && turn.harness.state !== "committed") return "projection_pending";
  if (turn.pi.state === "committed" && turn.harness.state === "committed" && turn.mirror.state !== "committed") return "mirror_pending";
  if (turn.pi.state === "committed" && turn.harness.state === "committed" && turn.mirror.state === "committed") return "ready";
  return "failed";
}

export function dedicatedTurnBlocksNewInvocation(state: DedicatedTurnState): boolean {
  return state === "provider_running" || state === "projection_pending";
}

export function interruptDedicatedTurn(
  conversation: JourneyConversation,
  turnId: string,
  failureCode: string,
  interruptedAt: string,
): JourneyConversation {
  // CR122: a cancelled send owes Mirror nothing. Failing only the Pi body left the Mirror body
  // `pending`, so the ledger reported delivery debt for a turn that never produced an answer, and
  // recovery could never clear it because `pendingMirrorTurnRepair` requires a committed Pi body.
  return {
    ...conversation,
    reconciliation: markTurnBodyFailed(
      markTurnBodyFailed(
        conversation.reconciliation,
        turnId,
        "mirror",
        failureCode,
        interruptedAt,
      ),
      turnId,
      "pi",
      failureCode,
      interruptedAt,
    ),
  };
}
