import { describe, expect, it } from "vitest";
import { createConvergentTurnWorld } from "./fixtures/convergentTurnWorld";

// CR064 contract: the RS020 acceptance gate for frictionless multi-turn conversation.

async function runCleanTurn(
  world: ReturnType<typeof createConvergentTurnWorld>,
  index: number,
): Promise<void> {
  const runId = `run-${index}`;
  world.beginTurn(runId, `question ${index}`);
  world.streamAssistant(`answer ${index}`);
  await world.settleTerminal();
}

function expectFrictionless(
  world: ReturnType<typeof createConvergentTurnWorld>,
  turnCount: number,
): void {
  const view = world.presentation();
  expect(world.durableEvidenceSettled()).toBe(true);
  expect(view.syncNoticeVisible).toBe(false);
  expect(view.pendingRepairTurnId).toBeUndefined();
  expect(view.availability.canSend).toBe(true);
  expect(view.availability.condition).toBe("ready");
  for (let index = 1; index <= turnCount; index += 1) {
    expect(view.assistantContentByTurn[`turn-run-${index}`]).toBe(`answer ${index}`);
  }
}

describe("CR064 multi-turn happy-path contract", () => {
  it("keeps five consecutive turns frictionless", async () => {
    const world = createConvergentTurnWorld();
    for (let index = 1; index <= 5; index += 1) {
      await runCleanTurn(world, index);
      expectFrictionless(world, index);
    }
  });

  it("keeps the conversation frictionless across navigation away and back", async () => {
    const world = createConvergentTurnWorld();
    await runCleanTurn(world, 1);
    await runCleanTurn(world, 2);
    world.navigateAway();
    world.navigateBack();
    expectFrictionless(world, 2);
    await runCleanTurn(world, 3);
    expectFrictionless(world, 3);
  });

  it("rehydrates a frictionless conversation after restart", async () => {
    const world = createConvergentTurnWorld();
    await runCleanTurn(world, 1);
    await runCleanTurn(world, 2);
    world.restart();
    expectFrictionless(world, 2);
  });

  // CR086: a single failed attempt is ordinary self-repair and stays internal.
  it("keeps a first append failure internal while automatic repair is still possible", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(false);
    expect(world.stores.outbox).toHaveLength(1);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.pendingRepairTurnId).toBe("turn-run-1");
  });

  it("never shows the notice for a transient failure that self-repairs", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    expect(world.presentation().syncNoticeVisible).toBe(false);
    await world.repairDeliveryDebt();
    expect(world.presentation().syncNoticeVisible).toBe(false);
    expectFrictionless(world, 1);
  });

  it("surfaces genuine delivery debt once failure persists through a second attempt", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    await expect(world.repairDeliveryDebt({ failAppend: true })).rejects.toThrow();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(false);
    expect(world.stores.outbox).toHaveLength(1);
    expect(view.syncNoticeVisible).toBe(true);
    expect(view.syncNoticeReason).toContain("mirror_append_failed");
    expect(view.pendingRepairTurnId).toBe("turn-run-1");
    expect(view.availability.condition).toBe("sync_pending");
    expect(view.availability.canSend).toBe(true);
  });

  it("surfaces a single failure that persists past the bounded window", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    expect(world.presentation().syncNoticeVisible).toBe(false);
    world.advanceClock(10_000);
    expect(world.presentation().syncNoticeVisible).toBe(true);
  });

  it("does not re-show a resolved transient failure after navigating away and back", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    await world.repairDeliveryDebt();
    world.navigateAway();
    world.advanceClock(60_000);
    world.navigateBack();
    expectFrictionless(world, 1);
  });

  it("clears the notice after repair completes while the conversation is idle", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    await world.repairDeliveryDebt();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(true);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.availability.canSend).toBe(true);
  });

  it("defers repair during an active successor and converges after it settles", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    await world.repairDeliveryDebt();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(true);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.pendingRepairTurnId).toBeUndefined();
    expect(view.availability.condition).toBe("ready");
    expect(view.assistantContentByTurn["turn-run-2"]).toBe("answer 2");
  });

  it("keeps a deferred repair attempt free of failure evidence", async () => {
    const world = createConvergentTurnWorld();
    await runCleanTurn(world, 1);
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    expectFrictionless(world, 2);
  });

  it("keeps the conversation clean after restart when repair raced a successor", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    await world.repairDeliveryDebt();
    world.restart();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(true);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.availability.condition).toBe("ready");
  });

  it("keeps ordinary settlement debt internal without a user-facing notice", async () => {
    const world = createConvergentTurnWorld();
    await runCleanTurn(world, 1);
    const record = world.stores.journal[0];
    record.phase = "outbox_enqueued";
    const view = world.presentation();
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.availability.canSend).toBe(true);
    record.phase = "settled";
  });

  it("treats a vanished outbox item with a settled journal as already converged", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.primeStaleReconcileSnapshot();
    world.completeDeliveryOutOfBand();
    await world.repairDeliveryDebt();
    expectFrictionless(world, 1);
  });

  it("performs zero writes when converging an already synchronized conversation", async () => {
    const world = createConvergentTurnWorld();
    await runCleanTurn(world, 1);
    await runCleanTurn(world, 2);
    const journalBefore = JSON.stringify(world.stores.journal);
    const mirrorBefore = JSON.stringify([...world.stores.mirror.entries()]);
    const projectionBefore = world.stores.projections.get(1);
    const baseBefore = world.base;
    await world.repairDeliveryDebt();
    expect(JSON.stringify(world.stores.journal)).toBe(journalBefore);
    expect(JSON.stringify([...world.stores.mirror.entries()])).toBe(mirrorBefore);
    expect(world.stores.projections.get(1)).toBe(projectionBefore);
    expect(world.base).toBe(baseBefore);
    expect(world.stores.outbox).toHaveLength(0);
    expectFrictionless(world, 2);
  });

  it("never lets an older run's convergence alter the successor's content", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    await world.repairDeliveryDebt();
    const view = world.presentation();
    expect(view.assistantContentByTurn["turn-run-2"]).toBe("answer 2");
    const mirrorMessages = world.stores.mirror.get("mirror-convergent-journey") ?? [];
    expect(mirrorMessages.filter((message) => message.id === "assistant-run-2")).toHaveLength(1);
    expect(mirrorMessages.filter((message) => message.id === "assistant-run-1")).toHaveLength(1);
  });
});
