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
import { journeyWorkspace, workspaceOfAuthority } from "../app/journeyWorkspaceKey";
import {
  projectJourneySettlementErrors,
  updateExactSettlementError,
} from "../app/settlementDiagnostics";
import {
  decideConversationAvailability,
  type NativeConversationAdmission,
} from "../domain/conversationAvailability";
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

// CR138 widened this matrix to the workspace-grained refusal so a reason the admission type can
// produce cannot silently escape it. CR140 re-aims it: `same_journey_occupied` is gone, because
// the native grain is the workspace and nothing can produce it, and `journey_share_exceeded`
// takes its place in the matrix.
function availability(nativeAdmission: NativeConversationAdmission, mirrorSynchronizationPending = false) {
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
    const admission = derivePiInvocationAdmission(occupancy, workspaceOfAuthority(old));
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
    // CR140 reclassification, pinned rather than absorbed: this asks about the *same* workspace
    // the successor runs in, so the refusal sharpens from the Journey to the workspace. The
    // verdict this matrix exists to protect — a successor's lease refuses a new turn here — is
    // unchanged.
    expect(derivePiInvocationAdmission(withSuccessor, journeyWorkspace("journey-a", "thread-journey-a"))).toEqual({
      allowed: false,
      reason: "same_workspace_occupied",
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
      journeyWorkspaceShare: 3,
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
    expect(derivePiInvocationAdmission(reconciled, journeyWorkspace("journey-a", "thread-journey-a"))).toEqual({
      allowed: false,
      reason: "same_workspace_occupied",
    });
  });

  it("counts only active execution across Journeys and still fails closed at real global capacity", () => {
    const mixed = knownOccupancy([
      terminalLease(rehearsalAuthority("journey-a", "run-a"), "completed"),
      terminalLease(rehearsalAuthority("journey-b", "run-b"), "process_died"),
      activeLease(rehearsalAuthority("journey-c", "run-c")),
    ], 4);
    expect(mixed.processCapacityInUse).toBe(1);
    expect(derivePiInvocationAdmission(mixed, journeyWorkspace("journey-d", "thread-journey-d"))).toEqual({ allowed: true, reason: null });
    expect(derivePiInvocationAdmission(mixed, journeyWorkspace("journey-c", "thread-journey-c"))).toEqual({
      allowed: false,
      reason: "same_workspace_occupied",
    });
    // CR140, after the field attempt: a sibling is refused again, because the Pi event transport
    // carries one route per Journey. The reason is the Journey's, and it is a sentence rather than
    // an exception thrown after Send. At the grain CR141 unlocks, the same state admits it.
    expect(derivePiInvocationAdmission(mixed, journeyWorkspace("journey-c", "thread-sibling")))
      .toEqual({ allowed: false, reason: "same_journey_occupied" });
    expect(derivePiInvocationAdmission(mixed, journeyWorkspace("journey-c", "thread-sibling"), "workspace"))
      .toEqual({ allowed: true, reason: null });

    const full = knownOccupancy(["a", "b", "c", "d"].map((suffix) => (
      activeLease(rehearsalAuthority(`journey-${suffix}`, `run-${suffix}`))
    )), 4);
    expect(derivePiInvocationAdmission(full, journeyWorkspace("journey-e", "thread-journey-e"))).toEqual({
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
    expect(derivePiInvocationAdmission(unknown, journeyWorkspace("journey-a", "thread-journey-a"))).toEqual({
      allowed: false,
      reason: "inspection_unknown",
    });
    expect(availability("inspection_unknown")).toMatchObject({
      condition: "native_authority_unknown",
      canSend: false,
    });
  });
});
