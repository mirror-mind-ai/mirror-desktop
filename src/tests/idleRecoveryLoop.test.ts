import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

function sourceBetween(start: string, end: string): string {
  const from = appSource.indexOf(start);
  const to = appSource.indexOf(end, from);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return appSource.slice(from, to);
}

/**
 * CR115: automatic post-terminal recovery must not be able to trigger itself.
 *
 * The automatic recovery effect watches `piInvocationOccupancy.status`. While recovery ended by
 * reconciling occupancy, every pass walked that status through `reconciling` and back to `known`,
 * re-entering recovery with all its guards satisfied. An idle Journey never settled: controls
 * gated on occupancy flickered, and each pass re-rendered the root between keystrokes.
 */
describe("CR115 — idle post-terminal recovery loop", () => {
  it("does not reconcile occupancy after converging, so recovery cannot re-trigger itself", () => {
    const recovery = sourceBetween(
      "async function recoverPostTerminalPersistence",
      "function publishSteeringConversation",
    );

    expect(recovery).toContain("turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, convergenceDeps)");
    expect(recovery).not.toContain("reconcilePiInvocationOccupancy()");
  });

  it("keeps the trigger watching occupancy, which is only legitimate without the self-trigger", () => {
    const automaticRecovery = sourceBetween(
      "void listMirrorAppendOutbox(conversation.journeyId).then((items) => {",
      "checkedMirrorTurnRef.current.clear();",
    );

    expect(automaticRecovery).toContain("await recoverPostTerminalPersistence(conversation.journeyId)");
    expect(automaticRecovery).toContain('piInvocationOccupancy.status === "known"');
  });

  it("leaves every reconcile that answers a real native change in place", () => {
    // Lease release is the one native mutation convergence performs, and it reconciles itself.
    expect(appSource).toContain("cleanupLease: (authority) => releaseDurablePiInvocationLease(authority)");
    const leaseRelease = sourceBetween(
      "async function releaseDurablePiInvocationLease",
      "useEffect(() => {",
    );
    expect(leaseRelease).toContain("applyPiInvocationInspection(current, requestId, inspection)");

    // A finished run and a rejected reservation still reconcile, because occupancy really moved.
    const generation = sourceBetween("async function generatePacket", "async function startSelectedJourney");
    expect(generation).toContain("await reconcilePiInvocationOccupancy()");
    expect(generation).toContain("const inspection = await reconcilePiInvocationOccupancy()");
  });
});
