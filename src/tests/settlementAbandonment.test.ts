import { describe, expect, it } from "vitest";
import {
  ABANDON_SETTLEMENT_OFFER_AFTER_MS,
  settlementAbandonmentOffer,
} from "../app/settlementAbandonment";
import { deriveJourneyNavigationPresentation } from "../app/journeyNavigationCoordinator";
import { createSettlementTimingRegistry } from "../app/settlementPhaseTiming";
import {
  createInitialJourneyRuntimeState,
  journeyRuntimeReducer,
  type JourneyRunIdentity,
} from "../app/journeyRuntimeState";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";
import appSource from "../app/App.tsx?raw";
import coordinatorSource from "../app/journeyNavigationCoordinator.ts?raw";

const base = {
  ownerPhase: "finalizing" as const,
  nativeExecutionActive: false,
  occupancyKnown: true,
  finishingSince: 1_000,
  now: 1_000 + ABANDON_SETTLEMENT_OFFER_AFTER_MS + 1,
};

describe("CR132: when stopping the wait is offered", () => {
  it("offers it once a finishing wait passes the threshold", () => {
    const offer = settlementAbandonmentOffer(base);
    expect(offer.offered).toBe(true);
    if (offer.offered) expect(offer.waitedMs).toBe(ABANDON_SETTLEMENT_OFFER_AFTER_MS + 1);
  });

  /**
   * CR132: the running phase keeps the native Cancel, which kills a live child process.
   * Offering this act there would present two different verbs for one state.
   */
  it("never offers it while the run is running or absent", () => {
    expect(settlementAbandonmentOffer({ ...base, ownerPhase: "running" }))
      .toEqual({ offered: false, reason: "not_finishing" });
    expect(settlementAbandonmentOffer({ ...base, ownerPhase: undefined }))
      .toEqual({ offered: false, reason: "not_finishing" });
  });

  /**
   * CR132: the decisive invariant. `derivePiInvocationAdmission` and `hasActiveNativeExecution`
   * share one predicate, so an active lease means both that the composer is blocked by occupancy
   * and that CR115/CR116's repair route must refuse. This act refuses with them rather than
   * reaching past them.
   */
  it("refuses while native execution is active, instead of releasing a lease", () => {
    expect(settlementAbandonmentOffer({ ...base, nativeExecutionActive: true }))
      .toEqual({ offered: false, reason: "native_execution_active" });
  });

  it("refuses while occupancy is unknown, because the answer is not yet established", () => {
    expect(settlementAbandonmentOffer({ ...base, occupancyKnown: false }))
      .toEqual({ offered: false, reason: "occupancy_unknown" });
  });

  it("holds the offer back until the threshold, at the exact boundary", () => {
    const at = { ...base, now: base.finishingSince + ABANDON_SETTLEMENT_OFFER_AFTER_MS };
    expect(settlementAbandonmentOffer(at)).toEqual({ offered: false, reason: "too_soon" });
    expect(settlementAbandonmentOffer({ ...at, now: at.now + 1 }).offered).toBe(true);
  });

  it("refuses when the wait has no known start", () => {
    expect(settlementAbandonmentOffer({ ...base, finishingSince: undefined }))
      .toEqual({ offered: false, reason: "too_soon" });
  });

  /**
   * CR132: the threshold is derived, not chosen. CR119's 3 s phase delay would put the control in
   * front of every healthy settlement; this Journey's median is 4,976 ms and its longest recorded
   * settlement is 41,741 ms, so the offer waits past every settlement that has ever completed.
   */
  it("waits past the longest settlement ever recorded", () => {
    expect(ABANDON_SETTLEMENT_OFFER_AFTER_MS).toBeGreaterThan(41_741);
  });
});

describe("CR132: the lockout this act exists to end", () => {
  const thread = readyThread("mirror-desktop");
  const identity: JourneyRunIdentity = {
    kind: "live",
    authority: createRunAuthority(
      createDedicatedTurnAuthority(thread, "run-1", "turn-run-1", "user-run-1", "assistant-run-1"),
      createDedicatedJourneyConversation({ thread, initialMessages: [] }).liveIdentity,
      thread.generations[0]!,
    ),
  };

  /**
   * The production transition, not a shortcut: `register` leaves the entry streaming, and the
   * `run_status: completed` stream event is what turns streaming off and finalization on. That is
   * exactly the state the Navigator sees as `Finishing`.
   */
  function finalizingState() {
    const registered = journeyRuntimeReducer(createInitialJourneyRuntimeState(), {
      type: "register", identity, assistantMessageId: "assistant-run-1", run: { status: "idle" },
    });
    return journeyRuntimeReducer(registered, {
      type: "stream_event", identity, event: { type: "run_status", status: "completed" },
    });
  }

  it("proves Finishing and a visible Cancel are mutually exclusive", () => {
    const presentation = deriveJourneyNavigationPresentation({
      runtimeState: finalizingState(),
      selectedJourneyId: "mirror-desktop",
    });
    // The lockout: nothing to press, and nothing to send.
    expect(presentation.cancelVisible).toBe(false);
    expect(presentation.sendBlocked).toBe(true);
  });

  it("releases the composer once the finalization flag is cleared", () => {
    const released = journeyRuntimeReducer(finalizingState(), {
      type: "finalization_finished", identity,
    });
    const presentation = deriveJourneyNavigationPresentation({
      runtimeState: released,
      selectedJourneyId: "mirror-desktop",
    });
    expect(presentation.sendBlocked).toBe(false);
  });

  /**
   * CR132: native cancellation must not widen. `cancelExactJourneyRun` throws unless the identity
   * is live and the native command kills a child process, which no longer exists once the run has
   * terminalized, so this guard pins the three conditions that keep it to the running phase.
   */
  it("keeps cancelVisible's derivation untouched", () => {
    expect(coordinatorSource).toContain('selectedRuntime.mode === "live"');
    expect(coordinatorSource).toContain('selectedRuntime.agentRun.status === "running"');
    expect(coordinatorSource).toContain("Boolean(selectedRuntime.identity)");
  });
});

describe("CR132: what the act does in the application", () => {
  it("records the abandoned wait, which a stall never did", () => {
    const end = appSource.indexOf('settlementTimingRegistry.end(journeyId, "failed", ABANDONED_SETTLEMENT_REASON)');
    expect(end).toBeGreaterThan(-1);
    expect(appSource).toContain("ABANDONED_SETTLEMENT_REASON");
  });

  it("releases the composer and asks recovery to finish the durable work", () => {
    const abandon = appSource.indexOf("async function abandonSettlementWait(");
    expect(abandon).toBeGreaterThan(-1);
    const release = appSource.indexOf('type: "finalization_finished", identity: abandoning', abandon);
    expect(release).toBeGreaterThan(abandon);
    const recover = appSource.indexOf("void recoverPostTerminalPersistence(", abandon);
    expect(recover).toBeGreaterThan(abandon);
  });

  /**
   * CR132: the invariant CR119's write-once guard protects, proved by behaviour rather than by
   * counting call sites. Two places may now end a settlement — its own `finally` and the
   * Navigator's act — and they cannot both produce a record for one turn, because `end` deletes
   * the collector. Whichever runs first writes; the other gets `undefined` and writes nothing.
   */
  it("cannot write two records for one turn, whichever ends it first", () => {
    const registry = createSettlementTimingRegistry();
    const authority = {
      journeyId: "mirror-desktop", runId: "run-1", turnId: "turn-1", generation: 1,
    };
    registry.begin(authority);
    const abandoned = registry.end(authority.journeyId, "failed", "settlement_wait_abandoned_by_navigator");
    expect(abandoned?.outcome).toBe("failed");
    expect(abandoned?.failure?.reason).toBe("settlement_wait_abandoned_by_navigator");
    // The hung settlement's own `finally` arriving late finds no collector and writes nothing.
    expect(registry.end(authority.journeyId, "settled")).toBeUndefined();
  });

  /**
   * CR132: it must not write a competing turn record. The hung settlement's own promise may still
   * resolve, and `finalizeInterruptedTurn` would advance the journal to `interrupted` underneath
   * it, turning a late success into a loud failure. Repair stays with the route built for it.
   */
  it("does not route through finalizeInterruptedTurn", () => {
    const abandon = appSource.indexOf("async function abandonSettlementWait(");
    const body = appSource.slice(abandon, abandon + 2_000);
    expect(body).not.toContain("finalizeInterruptedTurn");
    expect(body).not.toContain("releaseDurablePiInvocationLease");
    expect(body).not.toContain("cancelLivePiInvocation");
  });
});
