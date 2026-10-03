import { describe, expect, it, vi } from "vitest";
import {
  PERSISTENCE_OPERATION_BOUND_MS,
  abandonedOperationReason,
  describeAbandonedOperation,
  isAbandonedOperationReason,
  runBoundedOperation,
  type BoundBudget,
} from "../app/boundedPersistenceOperation";

function manualBound() {
  let expire!: () => void;
  const expiry = new Promise<void>((resolve) => { expire = resolve; });
  const cancel = vi.fn();
  const timer = vi.fn((_boundMs: number): BoundBudget => ({ expiry, cancel }));
  return { timer, expire, cancel };
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
}

/**
 * CR116: a persistence operation that never settles stranded its whole Journey, because every
 * per-Journey queue survives a rejected predecessor by construction and none survives a
 * predecessor that never settles. The bound turns waiting forever into an ordinary failure.
 */
describe("CR116 — bounded persistence operation", () => {
  it("returns the operation's value and cancels the bound", async () => {
    const { timer, cancel } = manualBound();
    await expect(runBoundedOperation(async () => "saved", { label: "pre_frontier", timer }))
      .resolves.toBe("saved");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("propagates an ordinary rejection unchanged, and does not call it an abandonment", async () => {
    const { timer, cancel } = manualBound();
    await expect(runBoundedOperation(async () => { throw new Error("save_failed"); }, {
      label: "pre_frontier", timer,
    })).rejects.toThrow("save_failed");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("abandons the wait when the bound expires, naming the phase and the bound", async () => {
    const { timer, expire } = manualBound();
    const never = deferred<string>();
    const onAbandon = vi.fn();
    const bounded = runBoundedOperation(() => never.promise, {
      label: "pre_frontier", boundMs: 1_000, timer, onAbandon,
    });
    expire();
    await expect(bounded).rejects.toThrow("persistence_operation_abandoned:pre_frontier:1000");
    expect(onAbandon).toHaveBeenCalledWith("persistence_operation_abandoned:pre_frontier:1000");
  });

  it("does not stop the abandoned operation, and swallows its late outcome", async () => {
    const { timer, expire } = manualBound();
    const late = deferred<string>();
    let settled = false;
    const operation = vi.fn(() => late.promise.then((value) => { settled = true; return value; }));
    const bounded = runBoundedOperation(operation, { label: "post_frontier", boundMs: 50, timer });
    expire();
    await expect(bounded).rejects.toThrow(/abandoned/u);

    // The operation keeps running. That is deliberate: the bound stops the wait, not the work.
    late.resolve("landed late");
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  it("does not surface a late rejection from an abandoned operation", async () => {
    // The abandoned operation belongs to nobody once the wait is given up. If the module did not
    // absorb its late rejection, this would escape as an unhandled rejection and fail the run.
    const { timer, expire } = manualBound();
    const late = deferred<string>();
    const bounded = runBoundedOperation(() => late.promise, { label: "interrupted", timer });
    expire();
    await expect(bounded).rejects.toThrow(/abandoned/u);
    late.reject(new Error("died_after_abandonment"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("explains an abandonment in terms of what survived it", () => {
    const explanation = describeAbandonedOperation(abandonedOperationReason("pre_frontier", 120_000));
    expect(explanation).toContain("stopped responding");
    expect(explanation).toContain("preserved in the Pi session");
    expect(describeAbandonedOperation("settlement_pre_frontier_authority_stale")).toBeUndefined();
  });

  it("ignores an expiry that lands after the operation already won", async () => {
    const { timer, expire } = manualBound();
    const onAbandon = vi.fn();
    const bounded = runBoundedOperation(async () => "saved", { label: "pre_frontier", timer, onAbandon });
    await expect(bounded).resolves.toBe("saved");
    expire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onAbandon).not.toHaveBeenCalled();
  });

  it("recognises its own reason and nothing else", () => {
    expect(isAbandonedOperationReason(abandonedOperationReason("pre_frontier", 120_000))).toBe(true);
    expect(isAbandonedOperationReason("settlement_pre_frontier_authority_stale")).toBe(false);
    expect(isAbandonedOperationReason("mirror_append_pi_recovery_active_lease")).toBe(false);
  });

  it("defaults to a bound generous enough for a large Journey's real writes", () => {
    // CR114 measured a 55 MB session and multi-megabyte projections on a real Journey. A bound
    // that fires on ordinary slowness would be a worse defect than the strand it replaces.
    expect(PERSISTENCE_OPERATION_BOUND_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("uses the real timer by default and clears it so no handle leaks", async () => {
    vi.useFakeTimers();
    try {
      const clear = vi.spyOn(globalThis, "clearTimeout");
      await expect(runBoundedOperation(async () => "saved", { label: "pre_frontier" }))
        .resolves.toBe("saved");
      expect(clear).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("abandons through the real timer once the bound elapses", async () => {
    vi.useFakeTimers();
    try {
      const never = deferred<string>();
      const bounded = runBoundedOperation(() => never.promise, { label: "pre_frontier", boundMs: 10 });
      const assertion = expect(bounded).rejects.toThrow(/abandoned:pre_frontier:10/u);
      await vi.advanceTimersByTimeAsync(10);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
