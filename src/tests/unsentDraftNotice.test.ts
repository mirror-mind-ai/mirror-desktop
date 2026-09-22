import { describe, expect, it } from "vitest";
import { clearUnsentDraft, recordUnsentDraft, resolveUnsentReason } from "../app/unsentDraftNotice";

describe("unsent draft notices", () => {
  it("records the rejection reason per Journey", () => {
    const notices = recordUnsentDraft({}, "journey-a", "No models match pattern");
    expect(notices["journey-a"]).toBe("No models match pattern");
    expect(recordUnsentDraft(notices, "journey-b", "quota")["journey-a"]).toBe("No models match pattern");
  });

  it("replaces an older reason for the same Journey", () => {
    const notices = recordUnsentDraft(
      recordUnsentDraft({}, "journey-a", "older"),
      "journey-a",
      "newer",
    );
    expect(notices["journey-a"]).toBe("newer");
  });

  it("prefers the provider warning over the generic process failure", () => {
    expect(resolveUnsentReason(
      ['Warning: No models match pattern "claude-bridge/claude-opus-5"'],
      "Pi command exited with status exit status: 1",
    )).toBe('Warning: No models match pattern "claude-bridge/claude-opus-5"');
  });

  it("uses the last meaningful warning and ignores blank ones", () => {
    expect(resolveUnsentReason(["first", "second", "   "], "exit 1")).toBe("second");
  });

  it("falls back to the process failure when no warning was emitted", () => {
    expect(resolveUnsentReason([], "Pi command exited with status exit status: 1"))
      .toBe("Pi command exited with status exit status: 1");
  });

  it("clears only the admitted Journey and is a no-op when absent", () => {
    const notices = recordUnsentDraft(recordUnsentDraft({}, "journey-a", "x"), "journey-b", "y");
    const cleared = clearUnsentDraft(notices, "journey-a");
    expect(cleared["journey-a"]).toBeUndefined();
    expect(cleared["journey-b"]).toBe("y");
    expect(clearUnsentDraft(cleared, "journey-a")).toBe(cleared);
  });
});
