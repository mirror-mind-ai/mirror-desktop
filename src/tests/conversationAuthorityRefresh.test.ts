import { describe, expect, it, vi } from "vitest";
import { createConversationAuthorityRefreshCoordinator } from "../app/conversationAuthorityRefresh";

describe("conversation authority refresh coordinator", () => {
  it("makes a send preflight await the focus-triggered inspection already in progress", async () => {
    let finishInspection: (() => void) | undefined;
    const inspect = vi.fn(() => new Promise<void>((resolve) => {
      finishInspection = resolve;
    }));
    const coordinator = createConversationAuthorityRefreshCoordinator(inspect);

    const focusRefresh = coordinator.refresh();
    const sendPreflight = coordinator.refresh();

    expect(inspect).toHaveBeenCalledTimes(1);
    expect(coordinator.checking()).toBe(true);

    finishInspection?.();
    await Promise.all([focusRefresh, sendPreflight]);

    expect(coordinator.checking()).toBe(false);
  });

  it("starts a later inspection after the previous single flight settles", async () => {
    const inspect = vi.fn(async () => undefined);
    const coordinator = createConversationAuthorityRefreshCoordinator(inspect);

    await coordinator.refresh();
    await coordinator.refresh();

    expect(inspect).toHaveBeenCalledTimes(2);
  });
});
