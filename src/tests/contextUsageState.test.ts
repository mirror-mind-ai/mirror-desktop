import { describe, expect, it, vi } from "vitest";
import {
  contextStateForInspection,
  contextStateForLiveUsage,
  hasMatchingContextStats,
  readContextStatsWithBoundedRetry,
} from "../app/contextUsageState";

const identity = {
  piSessionId: "nautilus-mirror-desktop-thread-1",
  generation: 2,
};

const stats = {
  piSessionId: identity.piSessionId,
  generation: identity.generation,
  providerModel: "openai-codex/gpt-5.4",
  capturedAt: "2026-09-10T12:00:00.000Z",
  usage: { tokens: 42000, contextWindow: 1050000, percent: 4 },
};

describe("context usage authority and recovery", () => {
  it("accepts persisted usage only for the complete session, generation, and model key", () => {
    expect(hasMatchingContextStats(stats, identity, "openai-codex/gpt-5.4")).toBe(true);
    expect(hasMatchingContextStats(stats, identity, "openai-codex/gpt-5.4-mini")).toBe(false);
    expect(hasMatchingContextStats(stats, { ...identity, generation: 3 }, "openai-codex/gpt-5.4")).toBe(false);
  });

  it("makes live usage immediately visible and preserves honest compaction unknown state", () => {
    expect(contextStateForLiveUsage({ tokens: 43000, contextWindow: 1050000, percent: 4.1 })).toBe("available");
    expect(contextStateForLiveUsage({ tokens: null, contextWindow: null, percent: null })).toBe("unknown_after_compaction");
  });

  it("keeps inspection outcomes distinguishable", () => {
    expect(contextStateForInspection({ status: "missing", reason: "session_file_missing" }, "openai-codex/gpt-5.4")).toBe("session_missing");
    expect(contextStateForInspection({ status: "waiting", reason: "first_usage_pending" }, "openai-codex/gpt-5.4")).toBe("waiting");
    expect(contextStateForInspection({ status: "waiting", reason: "post_compaction_usage_pending" }, "openai-codex/gpt-5.4")).toBe("unknown_after_compaction");
    expect(contextStateForInspection({
      status: "available",
      snapshot: { tokens: 100, providerModel: "other/model" },
    }, "openai-codex/gpt-5.4")).toBe("model_mismatch");
    expect(contextStateForInspection({ status: "available" }, "openai-codex/gpt-5.4")).toBe("inspection_failed");
  });

  it("retries a present file with pending usage but stops at the bounded attempt limit", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ status: "waiting", reason: "first_usage_pending" })
      .mockResolvedValueOnce({
        status: "available",
        snapshot: { tokens: 43000, providerModel: "openai-codex/gpt-5.4" },
      });
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await readContextStatsWithBoundedRetry(read, sleep, [0, 25, 75]);

    expect(result.status).toBe("available");
    expect(read).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("does not retry missing files or post-compaction unknown usage", async () => {
    const missing = vi.fn().mockResolvedValue({ status: "missing", reason: "session_file_missing" });
    const compacted = vi.fn().mockResolvedValue({ status: "waiting", reason: "post_compaction_usage_pending" });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await readContextStatsWithBoundedRetry(missing, sleep, [0, 25, 75]);
    await readContextStatsWithBoundedRetry(compacted, sleep, [0, 25, 75]);

    expect(missing).toHaveBeenCalledTimes(1);
    expect(compacted).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
