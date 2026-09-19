import { afterEach, describe, expect, it, vi } from "vitest";
import { createComposerDraftPersistence } from "../app/composerDraftPersistence";

afterEach(() => {
  vi.useRealTimers();
});

describe("Composer draft persistence coordinator", () => {
  it("coalesces rapid updates into one latest-snapshot save", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const persistence = createComposerDraftPersistence({ save, idleMs: 750 });

    persistence.schedule({ "journey-a": "a" });
    await vi.advanceTimersByTimeAsync(500);
    persistence.schedule({ "journey-a": "ab" });
    await vi.advanceTimersByTimeAsync(749);

    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ "journey-a": "ab" });
  });

  it("flushes the latest pending snapshot immediately and cancels its timer", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const persistence = createComposerDraftPersistence({ save, idleMs: 750 });

    persistence.schedule({ "journey-a": "draft", "journey-b": "other" });
    await persistence.flush();
    await vi.advanceTimersByTimeAsync(750);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ "journey-a": "draft", "journey-b": "other" });
  });

  it("allows a later latest-state save after an earlier failure", async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const save = vi.fn()
      .mockRejectedValueOnce(new Error("disk unavailable"))
      .mockResolvedValueOnce(undefined);
    const persistence = createComposerDraftPersistence({ save, idleMs: 750, onError });

    persistence.schedule({ "journey-a": "first" });
    await vi.advanceTimersByTimeAsync(750);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "disk unavailable" }));

    persistence.schedule({ "journey-a": "latest" });
    await vi.advanceTimersByTimeAsync(750);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ "journey-a": "latest" });
  });

  it("discards a pending timer without publishing when disposed", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const persistence = createComposerDraftPersistence({ save, idleMs: 750 });

    persistence.schedule({ "journey-a": "draft" });
    persistence.dispose();
    await vi.advanceTimersByTimeAsync(750);

    expect(save).not.toHaveBeenCalled();
  });
});
