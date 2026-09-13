import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TRANSIENT_COMPOSER_NOTICE_MS,
  clearScheduledNotice,
  scheduleTransientComposerNotice,
  terminalStreamWarningNoticeKey,
} from "../app/transientComposerNotice";

afterEach(() => {
  vi.useRealTimers();
});

describe("transient composer notices", () => {
  it("remains readable before eight seconds and dismisses at the boundary", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    scheduleTransientComposerNotice(dismiss);

    vi.advanceTimersByTime(TRANSIENT_COMPOSER_NOTICE_MS - 1);
    expect(dismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("cancels an older timer when a notice is replaced or unmounted", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const replacement = vi.fn();
    const cancelFirst = scheduleTransientComposerNotice(first);
    vi.advanceTimersByTime(4_000);
    cancelFirst();
    scheduleTransientComposerNotice(replacement);

    vi.advanceTimersByTime(4_000);
    expect(first).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4_000);
    expect(replacement).toHaveBeenCalledOnce();
  });

  it("prevents an old callback from clearing replacement text", () => {
    expect(clearScheduledNotice("new message", "old message")).toBe("new message");
    expect(clearScheduledNotice("same message", "same message")).toBeUndefined();
  });

  it("keys terminal warning presentation by Journey, count and final warning", () => {
    expect(terminalStreamWarningNoticeKey("journey-a", "run-1", [])).toBeUndefined();
    expect(terminalStreamWarningNoticeKey("journey-a", "run-1", ["Repeated"])).not.toBe(
      terminalStreamWarningNoticeKey("journey-a", "run-1", ["Repeated", "Repeated"]),
    );
    expect(terminalStreamWarningNoticeKey("journey-a", "run-1", ["Repeated"])).not.toBe(
      terminalStreamWarningNoticeKey("journey-b", "run-1", ["Repeated"]),
    );
    expect(terminalStreamWarningNoticeKey("journey-a", "run-1", ["Repeated"])).not.toBe(
      terminalStreamWarningNoticeKey("journey-a", "run-2", ["Repeated"]),
    );
  });
});
