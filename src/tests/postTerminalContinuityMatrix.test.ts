import { describe, expect, it } from "vitest";
import {
  applyPiInvocationInspection,
  beginPiInvocationReconciliation,
  createUnknownPiInvocationOccupancy,
  derivePiInvocationAdmission,
  hasBlockingPiInvocationOccupancy,
  releaseAndReinspectPiInvocationLease,
  type PiInvocationRegistryInspection,
} from "../app/piInvocationOccupancy";
import {
  projectJourneySettlementErrors,
  updateExactSettlementError,
} from "../app/settlementDiagnostics";
import { decideConversationAvailability } from "../domain/conversationAvailability";
import { projectPiBackedConversationSurface } from "../domain/piBackedConversationSurface";
import {
  POST_TERMINAL_FRONTIERS,
  POST_TERMINAL_OUTCOMES,
  activeLease,
  frontierSurfacesMirrorDebt,
  knownOccupancy,
  piBackedRehearsalFixture,
  rehearsalAuthority,
  terminalLease,
} from "./fixtures/postTerminalContinuity";

const coordinates = POST_TERMINAL_OUTCOMES.flatMap((outcome) => (
  POST_TERMINAL_FRONTIERS.map((frontier) => [outcome, frontier] as const)
));

function availability(nativeAdmission: "allowed" | "inspection_unknown" | "same_journey_occupied" | "global_capacity_reached", mirrorSynchronizationPending = false) {
  return decideConversationAvailability({
    runtimeBindingReady: true,
    conversationAuthorityReady: true,
    sameConversationExecutionActive: false,
    nativeAdmission,
    recoveryInspectionActive: false,
    mirrorSynchronizationPending,
  });
}

describe("RS019 composed post-terminal continuity matrix", () => {
  it.each(coordinates)("keeps %s/%s debt non-blocking after exact native terminalization", (outcome, frontier) => {
    const old = rehearsalAuthority("journey-a", `old-${outcome}-${frontier}`);
    const occupancy = knownOccupancy([terminalLease(old, outcome)]);
    const admission = derivePiInvocationAdmission(occupancy, old.journeyId);
    const providerCalls = 1;

    expect(hasBlockingPiInvocationOccupancy(occupancy)).toBe(false);
    expect(admission).toEqual({ allowed: true, reason: null });
    expect(availability(
      admission.allowed ? "allowed" : admission.reason,
      frontierSurfacesMirrorDebt(frontier),
    )).toMatchObject({
      condition: frontierSurfacesMirrorDebt(frontier) ? "sync_pending" : "ready",
      canDraft: true,
      canSend: true,
    });

    const successor = activeLease(rehearsalAuthority("journey-a", `successor-${outcome}-${frontier}`));
    const withSuccessor = knownOccupancy([successor]);
    expect(derivePiInvocationAdmission(withSuccessor, "journey-a")).toEqual({
      allowed: false,
      reason: "same_journey_occupied",
    });
    expect(providerCalls).toBe(1);
  });

  it("keeps exact old and successor debt independent through late completion", () => {
    const old = { journeyId: "journey-a", runId: "run-old", turnId: "turn-old" };
    const successor = { journeyId: "journey-a", runId: "run-successor", turnId: "turn-successor" };
    let errors = updateExactSettlementError({}, old, "Old delivery unavailable");
    errors = updateExactSettlementError(errors, successor, "Successor delivery unavailable");

    expect(projectJourneySettlementErrors({}, errors)).toEqual({
      "journey-a": "2 Mirror settlement operations need attention.",
    });

    errors = updateExactSettlementError(errors, old, undefined);
    expect(projectJourneySettlementErrors({}, errors)).toEqual({
      "journey-a": "Successor delivery unavailable",
    });
    expect(Object.values(errors)).toEqual([{ ...successor, message: "Successor delivery unavailable" }]);
  });

  it("preserves a replacement run when late old cleanup releases and reinspects exact authority", async () => {
    const old = rehearsalAuthority("journey-a", "run-old");
    const successor = rehearsalAuthority("journey-a", "run-successor");
    const fresh: PiInvocationRegistryInspection = {
      schemaVersion: "0.1.0",
      limit: 2,
      processCapacityInUse: 1,
      entries: [activeLease(successor)],
    };

    const inspection = await releaseAndReinspectPiInvocationLease(old, {
      releaseLease: async (journeyId, runId) => ({ journeyId, runId, status: "already_released" }),
      inspectRegistry: async () => fresh,
    });
    const reconciled = applyPiInvocationInspection(
      beginPiInvocationReconciliation(createUnknownPiInvocationOccupancy(), 8),
      8,
      inspection,
    );

    expect(reconciled.entries).toEqual([activeLease(successor)]);
    expect(derivePiInvocationAdmission(reconciled, "journey-a")).toEqual({
      allowed: false,
      reason: "same_journey_occupied",
    });
  });

  it("counts only active execution across Journeys and still fails closed at real global capacity", () => {
    const mixed = knownOccupancy([
      terminalLease(rehearsalAuthority("journey-a", "run-a"), "completed"),
      terminalLease(rehearsalAuthority("journey-b", "run-b"), "process_died"),
      activeLease(rehearsalAuthority("journey-c", "run-c")),
    ], 4);
    expect(mixed.processCapacityInUse).toBe(1);
    expect(derivePiInvocationAdmission(mixed, "journey-d")).toEqual({ allowed: true, reason: null });
    expect(derivePiInvocationAdmission(mixed, "journey-c")).toEqual({
      allowed: false,
      reason: "same_journey_occupied",
    });

    const full = knownOccupancy(["a", "b", "c", "d"].map((suffix) => (
      activeLease(rehearsalAuthority(`journey-${suffix}`, `run-${suffix}`))
    )), 4);
    expect(derivePiInvocationAdmission(full, "journey-e")).toEqual({
      allowed: false,
      reason: "global_capacity_reached",
    });
  });

  it("reconstructs old and successor turns from Pi evidence after relaunch without provider work", () => {
    const { metadata, inspection } = piBackedRehearsalFixture();
    const providerCalls = 0;
    const firstProjection = projectPiBackedConversationSurface(metadata, inspection);
    const relaunchedProjection = projectPiBackedConversationSurface({
      ...metadata,
      messages: [{ id: "new-ghost", role: "assistant", content: "stale", createdAt: metadata.createdAt }],
    }, inspection);

    expect(relaunchedProjection.messages).toEqual(firstProjection.messages);
    expect(relaunchedProjection.messages.map((message) => message.content)).toEqual([
      "Fixture A",
      "Fixture A complete",
      "Fixture B",
      "Fixture B complete",
    ]);
    expect(availability("allowed")).toMatchObject({ condition: "ready", canSend: true });
    expect(providerCalls).toBe(0);
  });

  it("retains fail-closed behavior for unknown native authority", () => {
    const unknown = createUnknownPiInvocationOccupancy();
    expect(derivePiInvocationAdmission(unknown, "journey-a")).toEqual({
      allowed: false,
      reason: "inspection_unknown",
    });
    expect(availability("inspection_unknown")).toMatchObject({
      condition: "native_authority_unknown",
      canSend: false,
    });
  });
});
