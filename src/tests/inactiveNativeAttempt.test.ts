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
  entries: [{ entryId: "user-incomplete", role: "user", visibleText: "Continue" }],
};

describe("inactive native attempt presentation", () => {
  it("derives a candidate only from an exact visible incomplete Pi user leaf", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, inspection)).toEqual({
      ...authority,
      userEntryId: "user-incomplete",
    });
  });

  it("returns no candidate for a complete native transcript", () => {
    expect(deriveInactiveNativeAttemptCandidate(authority, {
      leafEntryId: "assistant-complete",
      incompleteUserEntryId: null,
      entries: [{ entryId: "assistant-complete", role: "assistant", visibleText: "Done" }],
    })).toBeUndefined();
  });

  it("rejects mismatched, non-user, empty, or absent incomplete evidence", () => {
    for (const invalid of [
      { ...inspection, leafEntryId: "another-entry" },
      { ...inspection, entries: [{ ...inspection.entries[0], role: "assistant" }] },
      { ...inspection, entries: [{ ...inspection.entries[0], visibleText: "  " }] },
      { ...inspection, entries: [] },
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
