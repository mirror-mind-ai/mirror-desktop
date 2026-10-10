import { describe, expect, it } from "vitest";
import {
  ABANDON_SETTLEMENT_OFFER_AFTER_MS,
  settlementAbandonmentOffer,
} from "../app/settlementAbandonment";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  hasActiveNativeExecution,
  hasActiveNativeExecutionInJourney,
  type PiInvocationLeaseInspection,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import { journeyWorkspace } from "../app/journeyWorkspaceKey";

function running(threadId: string, runId: string): PiInvocationLeaseInspection {
  return {
    authority: {
      schemaVersion: "0.1.0",
      journeyId: "mirror-desktop",
      runId,
      turnId: `turn-${runId}`,
      threadId,
      generation: 1,
      piSessionId: `pi-${runId}`,
      mirrorConversationId: `mc-${runId}`,
      harnessUserMessageId: `u-${runId}`,
      harnessAssistantMessageId: `a-${runId}`,
    },
    leasePhase: "running",
    processCapacityState: "running",
    cancellationState: "none",
    terminalState: "open",
  };
}

/** A sibling conversation is genuinely executing; the workspace being abandoned is not. */
const siblingExecuting = applyPiInvocationInspection(
  beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 1),
  1,
  {
    schemaVersion: "0.1.0",
    limit: 4,
    journeyWorkspaceShare: 3,
    processCapacityInUse: 1,
    entries: [running("thread-sibling", "run-sibling")],
  } as PiInvocationRegistryInspection,
);

const abandoning = journeyWorkspace("mirror-desktop", "thread-abandoning");

const waited = {
  ownerPhase: "finalizing" as const,
  occupancyKnown: true,
  finishingSince: 1_000,
  now: 1_000 + ABANDON_SETTLEMENT_OFFER_AFTER_MS + 1,
};

/**
 * CR132's load-bearing condition is that `derivePiInvocationAdmission` and
 * `hasActiveNativeExecution` share one predicate, so an active lease means both that occupancy
 * blocks the composer and that repair must refuse. RS024 requires that property to be re-derived
 * behaviourally at the workspace grain rather than argued, because the two predicates now take a
 * workspace and could disagree about which one they were asked about.
 */
describe("CR138: CR132's shared predicate still agrees, at the workspace grain", () => {
  it("does not withhold the exit from one workspace because a sibling is executing", () => {
    expect(hasActiveNativeExecution(siblingExecuting, abandoning)).toBe(false);
    const offer = settlementAbandonmentOffer({
      ...waited,
      nativeExecutionActive: hasActiveNativeExecution(siblingExecuting, abandoning),
    });
    expect(offer.offered).toBe(true);
  });

  it("still withholds the exit from the workspace that is itself executing", () => {
    const executing = journeyWorkspace("mirror-desktop", "thread-sibling");
    expect(hasActiveNativeExecution(siblingExecuting, executing)).toBe(true);
    expect(settlementAbandonmentOffer({
      ...waited,
      nativeExecutionActive: hasActiveNativeExecution(siblingExecuting, executing),
    })).toEqual({ offered: false, reason: "native_execution_active" });
  });

  it("agrees with admission about the workspace it was asked about", () => {
    const executing = journeyWorkspace("mirror-desktop", "thread-sibling");
    // CR140, after the field attempt: the default grain is the transport's, which is the Journey,
    // so the workspace question is asked explicitly here. This suite is about the *predicate*
    // agreeing at the workspace grain, which is what CR132's exit depends on.
    expect(derivePiInvocationAdmission(siblingExecuting, executing, "workspace").allowed)
      .toBe(!hasActiveNativeExecution(siblingExecuting, executing));
    expect(derivePiInvocationAdmission(siblingExecuting, abandoning, "workspace").allowed)
      .toBe(!hasActiveNativeExecution(siblingExecuting, abandoning));
  });

  /**
   * The Journey aggregate is the predicate that would withhold the exit wrongly. Keeping it in the
   * suite records why the caller must not use it here.
   */
  it("shows the Journey aggregate would have withheld it, which is why the caller uses the workspace form", () => {
    expect(hasActiveNativeExecutionInJourney(siblingExecuting, "mirror-desktop")).toBe(true);
    expect(settlementAbandonmentOffer({
      ...waited,
      nativeExecutionActive: hasActiveNativeExecutionInJourney(siblingExecuting, "mirror-desktop"),
    })).toEqual({ offered: false, reason: "native_execution_active" });
  });

  it("keeps refusing on unknown occupancy regardless of grain", () => {
    expect(settlementAbandonmentOffer({ ...waited, occupancyKnown: false, nativeExecutionActive: false }))
      .toEqual({ offered: false, reason: "occupancy_unknown" });
  });
});
