import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import notificationSource from "../app/SelfUpdateNotification.tsx?raw";
import {
  UPDATE_RECHECK_INTERVAL_MS,
  UPDATE_RECHECK_ON_RETURN_AFTER_MS,
  startUpdateRechecks,
  stateAfterRecheck,
} from "../app/updateRecheck";

/**
 * CR191 (Navigator, 2026-11-04): the app is used continuously and rarely closed, so a new version
 * must be noticed while it stays open, not only when the window loads.
 */
const HOUR = 60 * 60 * 1000;

// A real wall clock, so a scheduler that forgot the check made at load would be overdue at once.
const LOADED_AT = Date.parse("2026-11-04T09:00:00Z");

function harness() {
  let clock = LOADED_AT;
  let returnListener: (() => void) | undefined;
  const recheck = vi.fn(() => Promise.resolve());
  const stop = startUpdateRechecks({
    recheck,
    now: () => clock,
    onReturn: (listener) => {
      returnListener = listener;
      return () => { returnListener = undefined; };
    },
  });
  return {
    recheck,
    stop,
    advance: async (ms: number) => { clock += ms; await vi.advanceTimersByTimeAsync(ms); },
    jump: (ms: number) => { clock += ms; },
    returnToWindow: async () => { returnListener?.(); await Promise.resolve(); },
    hasReturnListener: () => Boolean(returnListener),
  };
}

describe("CR191 a new version is noticed while the app stays open", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("uses the agreed intervals: every 4 hours, and on return after 1 hour", () => {
    expect(UPDATE_RECHECK_INTERVAL_MS).toBe(4 * HOUR);
    expect(UPDATE_RECHECK_ON_RETURN_AFTER_MS).toBe(1 * HOUR);
  });

  it("asks the channel again every 4 hours while open, counting from the check at load", async () => {
    const h = harness();
    await h.advance(4 * HOUR - 60_000);
    expect(h.recheck).not.toHaveBeenCalled();
    await h.advance(10 * 60_000);
    expect(h.recheck).toHaveBeenCalledTimes(1);
    await h.advance(4 * HOUR);
    expect(h.recheck).toHaveBeenCalledTimes(2);
    h.stop();
  });

  it("asks when the window comes back after more than an hour, and not sooner", async () => {
    const h = harness();
    h.jump(30 * 60_000);
    await h.returnToWindow();
    expect(h.recheck).not.toHaveBeenCalled();
    h.jump(31 * 60_000);
    await h.returnToWindow();
    expect(h.recheck).toHaveBeenCalledTimes(1);
    // The return counts as a check, so the periodic one waits 4 hours from it.
    h.jump(10 * 60_000);
    await h.returnToWindow();
    expect(h.recheck).toHaveBeenCalledTimes(1);
    h.stop();
  });

  it("notices the overdue check after the Mac sleeps, even if no timer fired", async () => {
    const h = harness();
    h.jump(9 * HOUR);
    await h.returnToWindow();
    expect(h.recheck).toHaveBeenCalledTimes(1);
    h.stop();
  });

  it("never runs two checks at once and survives a failed one", async () => {
    let clock = LOADED_AT;
    let returnListener: (() => void) | undefined;
    let fail: (error: Error) => void = () => undefined;
    const recheck = vi.fn(() => new Promise<void>((_, reject) => { fail = reject; }));
    const stop = startUpdateRechecks({ recheck, now: () => clock, onReturn: (listener) => { returnListener = listener; return () => undefined; } });
    clock = LOADED_AT + 2 * HOUR;
    returnListener?.();
    // Still pending two hours later, past the next due time: no second check joins it.
    clock = LOADED_AT + 4 * HOUR;
    returnListener?.();
    expect(recheck).toHaveBeenCalledTimes(1);
    fail(new Error("offline"));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    clock = LOADED_AT + 6 * HOUR;
    returnListener?.();
    expect(recheck).toHaveBeenCalledTimes(2);
    stop();
  });

  it("counts the check made at load, so returning at once asks nothing", async () => {
    const h = harness();
    await h.returnToWindow();
    expect(h.recheck).not.toHaveBeenCalled();
    h.stop();
  });

  it("stops asking once stopped", async () => {
    const h = harness();
    h.stop();
    expect(h.hasReturnListener()).toBe(false);
    await h.advance(12 * HOUR);
    expect(h.recheck).not.toHaveBeenCalled();
  });
});

describe("CR191 what a later check does to the version chip", () => {
  const available = (version: string) => ({ status: "available" as const, version, currentVersion: "0.3.0-alpha.14", update: {} as never });

  it("shows a version that appeared while the app was open", () => {
    expect(stateAfterRecheck({ status: "idle" }, available("0.3.0-alpha.15")))
      .toEqual({ status: "available", update: available("0.3.0-alpha.15") });
  });

  it("moves an open notice to a newer version, and keeps it for the same one", () => {
    const shown = { status: "available" as const, update: available("0.3.0-alpha.15") };
    expect(stateAfterRecheck(shown, available("0.3.0-alpha.16"))).toEqual({ status: "available", update: available("0.3.0-alpha.16") });
    expect(stateAfterRecheck(shown, available("0.3.0-alpha.15"))).toBe(shown);
  });

  it("never disturbs an installation or a message the person is reading", () => {
    const installing = { status: "installing" as const, update: available("0.3.0-alpha.15") };
    const error = { status: "error" as const, message: "Finish the active runtime operation before updating." };
    expect(stateAfterRecheck(installing, available("0.3.0-alpha.16"))).toBe(installing);
    expect(stateAfterRecheck(error, available("0.3.0-alpha.16"))).toBe(error);
  });

  it("keeps a known update when a later check says current", () => {
    const shown = { status: "available" as const, update: available("0.3.0-alpha.15") };
    expect(stateAfterRecheck(shown, { status: "current" })).toBe(shown);
    expect(stateAfterRecheck({ status: "idle" }, { status: "current" })).toEqual({ status: "idle" });
  });

  it("is wired into the chip without a visible checking state", () => {
    expect(notificationSource).toContain("startUpdateRechecks(");
    expect(notificationSource).toContain("setState((current) => stateAfterRecheck(current, result))");
  });
});
