import { describe, expect, it } from "vitest";
import { createConvergentTurnWorld } from "./fixtures/convergentTurnWorld";

// CR064 contract. `it.fails` marks defects reproduced against the current
// architecture; CR065–CR067 must flip each one to `it` as they turn green.

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

  it("surfaces genuine delivery debt after an append failure", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(false);
    expect(world.stores.outbox).toHaveLength(1);
    expect(view.syncNoticeVisible).toBe(true);
    expect(view.pendingRepairTurnId).toBe("turn-run-1");
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

  it.fails("clears the notice when repair converges while a successor turn is active", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(true);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.pendingRepairTurnId).toBeUndefined();
    expect(view.availability.condition).toBe("ready");
    expect(view.assistantContentByTurn["turn-run-2"]).toBe("answer 2");
  });

  it.fails("keeps the conversation clean after restart when repair raced a successor", async () => {
    const world = createConvergentTurnWorld();
    world.beginTurn("run-1", "question 1");
    world.streamAssistant("answer 1");
    await world.settleTerminal({ failAppend: true });
    world.beginTurn("run-2", "question 2");
    world.streamAssistant("answer 2");
    await world.repairDeliveryDebt();
    await world.settleTerminal();
    world.restart();
    const view = world.presentation();
    expect(world.durableEvidenceSettled()).toBe(true);
    expect(view.syncNoticeVisible).toBe(false);
    expect(view.availability.condition).toBe("ready");
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
    const view = world.presentation();
    expect(view.assistantContentByTurn["turn-run-2"]).toBe("answer 2");
    const mirrorMessages = world.stores.mirror.get("mirror-convergent-journey") ?? [];
    expect(mirrorMessages.filter((message) => message.id === "assistant-run-2")).toHaveLength(1);
    expect(mirrorMessages.filter((message) => message.id === "assistant-run-1")).toHaveLength(1);
  });
});
