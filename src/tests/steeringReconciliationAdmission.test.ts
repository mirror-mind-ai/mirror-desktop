import { describe, expect, it } from "vitest";
import {
  RECONCILABLE_STEERING_STATUSES,
  STEERING_STATUSES,
  appendPendingSteering,
  hasReconcilableSteering,
  markSteeringDeliveredByQueueDeparture,
  reconcileSteeringUserEntries,
  settleUnconsumedSteering,
  transitionSteering,
} from "../domain/steeringState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { stageCorrelatedTurn } from "../domain/threeBodyTurnCommit";
import { readyThread } from "./fixtures/readyThread";
import type { JourneyConversation, SteeringStatus } from "../domain/journeyConversation";
import appSource from "../app/App.tsx?raw";
import steeringStateSource from "../domain/steeringState.ts?raw";
import persistedSource from "../domain/persistedJourneyConversation.ts?raw";
import {
  createPersistedJourneyConversation,
  parsePersistedJourneyConversation,
} from "../domain/persistedJourneyConversation";

function fixture() {
  const thread = readyThread("journey-one");
  const base = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-1", "turn-1", "user-1", "assistant-1");
  const conversation = stageCorrelatedTurn(
    base,
    correlation,
    { id: "user-1", role: "user", content: "Start", createdAt: "2026-09-14T09:59:00Z" },
    { id: "assistant-1", role: "assistant", content: "", createdAt: "2026-09-14T09:59:00Z" },
  );
  const authority = createRunAuthority(correlation, base.liveIdentity, thread.generations[0]);
  return { conversation, authority };
}

/** A correction of this run carried to the given status, by the ordinary route to it. */
function corrected(status: SteeringStatus) {
  const { conversation, authority } = fixture();
  const staged = appendPendingSteering(conversation, authority, "Focus here", new Date("2026-09-14T10:00:00Z"));
  const requestId = staged.evidence.requestId;
  let current: JourneyConversation = staged.conversation;
  if (status === "pending") return { current, authority, requestId };

  current = transitionSteering(current, authority, requestId, "accepted");
  if (status === "accepted") return { current, authority, requestId };
  if (status === "rejected") {
    return { current: transitionSteering(staged.conversation, authority, requestId, "rejected"), authority, requestId };
  }

  current = markSteeringDeliveredByQueueDeparture(current, authority, []);
  if (status === "delivered") return { current, authority, requestId };
  if (status === "terminally_unconsumed") {
    return { current: settleUnconsumedSteering(current, authority, "cancelled"), authority, requestId };
  }

  current = reconcileSteeringUserEntries(current, authority, [
    { userEntryId: "steer-1", userText: "Focus here", recordedAt: "2026-09-14T10:00:06Z" },
  ]);
  return { current, authority, requestId };
}

/**
 * CR117 reopened. The status vocabulary gained `delivered`, and the reconciler was taught to accept
 * it, but the two App guards that decide whether the reconciler is *called* were left on the old
 * list. A correction that reached `delivered` — the path CR117 was built to produce — was therefore
 * never reconciled and never acquired `piUserEntryId`. The rule now lives in one place so the guard
 * cannot drift from the reconciler again.
 */
describe("CR117 — which corrections still await Pi entry evidence", () => {
  it("admits every status the reconciler can still act on", () => {
    expect([...RECONCILABLE_STEERING_STATUSES].sort()).toEqual(
      ["accepted", "delivered", "pending", "terminally_unconsumed"],
    );
  });

  it("opens the guard for a delivered correction — the regression", () => {
    const { current, authority } = corrected("delivered");
    expect(hasReconcilableSteering(current, authority.runId)).toBe(true);
  });

  it.each(["pending", "accepted", "delivered", "terminally_unconsumed"] as const)(
    "opens the guard for %s",
    (status) => {
      const { current, authority } = corrected(status);
      expect(hasReconcilableSteering(current, authority.runId)).toBe(true);
    },
  );

  it.each(["applied", "rejected"] as const)("keeps the guard shut for %s", (status) => {
    const { current, authority } = corrected(status);
    expect(hasReconcilableSteering(current, authority.runId)).toBe(false);
  });

  it("a delivered correction that opens the guard does reach applied", () => {
    const { current, authority, requestId } = corrected("delivered");
    expect(hasReconcilableSteering(current, authority.runId)).toBe(true);

    const settled = reconcileSteeringUserEntries(current, authority, [
      { userEntryId: "steer-1", userText: "Focus here", recordedAt: "2026-09-14T10:00:06Z" },
    ]);
    const evidence = settled.steeringEvidence?.find((item) => item.requestId === requestId);
    expect(evidence?.status).toBe("applied");
    expect(evidence?.piUserEntryId).toBe("steer-1");
  });

  it("scopes to one run when a run is named, and spans the conversation when none is", () => {
    const { current, authority } = corrected("delivered");
    expect(hasReconcilableSteering(current, "run-other")).toBe(false);
    expect(hasReconcilableSteering(current)).toBe(true);
  });

  it("is false for a conversation that was never corrected", () => {
    const { conversation } = fixture();
    expect(hasReconcilableSteering(conversation)).toBe(false);
    expect(hasReconcilableSteering(conversation, "run-1")).toBe(false);
  });
});

describe("CR117 — persistence follows the vocabulary instead of restating it", () => {
  it("round-trips every status the vocabulary defines", () => {
    // Any status that can be reached must survive a save and load; this used to be a hand-written
    // allowlist that a new status could be omitted from.
    for (const status of ["pending", "accepted", "delivered", "terminally_unconsumed", "applied"] as const) {
      const { current, requestId } = corrected(status);
      const restored = parsePersistedJourneyConversation(createPersistedJourneyConversation(current));
      expect(restored?.conversation.steeringEvidence?.find((item) => item.requestId === requestId)?.status)
        .toBe(status);
    }
  });

  it("derives the accepted set from the transition table, so a new status cannot be forgotten", () => {
    expect([...STEERING_STATUSES].sort()).toEqual(
      ["accepted", "applied", "delivered", "pending", "rejected", "terminally_unconsumed"],
    );
    expect(persistedSource).toContain("new Set<string>(STEERING_STATUSES)");
  });
});

describe("CR117 — the guards cannot drift from the reconciler again", () => {
  it("leaves no inline status list in the reconciler to fall out of step", () => {
    expect(steeringStateSource).not.toContain('["pending", "accepted", "delivered", "terminally_unconsumed"]');
    expect(steeringStateSource).toContain("RECONCILABLE_STEERING_STATUSES");
  });

  it("gates both App reconciliation paths on the shared predicate", () => {
    expect(appSource).toContain("hasReconcilableSteering");
    // Neither guard may re-state the statuses by hand.
    expect(appSource).not.toContain('item.status === "pending" || item.status === "accepted"');
  });
});
