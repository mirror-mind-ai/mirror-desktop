import { describe, expect, it } from "vitest";
import {
  deriveInactiveNativeAttemptCandidate,
  shouldPresentInactiveNativeAttempt,
} from "../domain/inactiveNativeAttempt";

const authority = {
  journeyId: "journey-one",
  threadId: "thread-one",
  generation: 2,
  piSessionId: "session-two",
};

const inspection = {
  leafEntryId: "user-incomplete",
  incompleteUserEntryId: "user-incomplete",
  entries: [{ entryId: "user-incomplete", role: "user", visibleText: "Continue", stopReason: null }],
};

describe("inactive native attempt presentation", () => {
  it("derives a candidate from an exact visible incomplete Pi user leaf", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, inspection)).toEqual({
      ...authority,
      userEntryId: "user-incomplete",
      leafEntryId: "user-incomplete",
    });
  });

  it("accepts the captured failed-assistant leaf after its incomplete user", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "assistant-error",
      incompleteUserEntryId: "user-incomplete",
      entries: [
        inspection.entries[0],
        { entryId: "assistant-error", role: "assistant", visibleText: "", stopReason: "error" },
      ],
    })).toEqual({
      ...authority,
      userEntryId: "user-incomplete",
      leafEntryId: "assistant-error",
    });
  });

  it("accepts represented tool tails and exact non-role native leaves", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "tool-result",
      incompleteUserEntryId: "user-incomplete",
      entries: [
        inspection.entries[0],
        { entryId: "tool-result", role: "toolResult", visibleText: "result", stopReason: null },
      ],
    })?.leafEntryId).toBe("tool-result");
    expect(deriveInactiveNativeAttemptCandidate(authority, {
      ...inspection,
      leafEntryId: "non-role-compaction-leaf",
    })?.leafEntryId).toBe("non-role-compaction-leaf");
  });

  it("returns no candidate when exact inspection reports no incomplete user", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "assistant-complete",
      incompleteUserEntryId: null,
      entries: [{ entryId: "assistant-complete", role: "assistant", visibleText: "Done", stopReason: "stop" }],
    })).toBeUndefined();
  });

  it("rejects missing, non-user, empty, out-of-order, or contradicted evidence", () => {
    for (const invalid of [
      { ...inspection, leafEntryId: null },
      { ...inspection, entries: [{ ...inspection.entries[0], role: "assistant" }] },
      { ...inspection, entries: [{ ...inspection.entries[0], visibleText: "  " }] },
      { ...inspection, entries: [] },
      {
        ...inspection,
        leafEntryId: "leaf-before-user",
        entries: [
          { entryId: "leaf-before-user", role: "assistant", visibleText: "error", stopReason: "error" },
          inspection.entries[0],
        ],
      },
      {
        ...inspection,
        leafEntryId: "assistant-complete",
        entries: [
          inspection.entries[0],
          { entryId: "assistant-complete", role: "assistant", visibleText: "Done", stopReason: "stop" },
        ],
      },
    ]) {
      expect(() => deriveInactiveNativeAttemptCandidate(authority, invalid))
        .toThrow("inactive_native_attempt_evidence_invalid");
    }
  });

  it("shows only under exact inactive authority and never changes admission itself", () => {
    const candidate = deriveInactiveNativeAttemptCandidate(authority, inspection);
    const ready = {
      ...authority,
      candidate,
      occupancyKnown: true,
      exactNativeLeaseActive: false,
      selectedRuntimeBusy: false,
      isStreaming: false,
    };
    expect(shouldPresentInactiveNativeAttempt(ready)).toBe(true);
    expect(shouldPresentInactiveNativeAttempt({ ...ready, threadId: "replacement" })).toBe(false);
    expect(shouldPresentInactiveNativeAttempt({ ...ready, occupancyKnown: false })).toBe(false);
    expect(shouldPresentInactiveNativeAttempt({ ...ready, exactNativeLeaseActive: true })).toBe(false);
    expect(shouldPresentInactiveNativeAttempt({ ...ready, selectedRuntimeBusy: true })).toBe(false);
    expect(shouldPresentInactiveNativeAttempt({ ...ready, isStreaming: true })).toBe(false);
  });
});
