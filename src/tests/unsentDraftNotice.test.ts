import { describe, expect, it } from "vitest";
import { clearUnsentDraft, recordUnsentDraft } from "../app/unsentDraftNotice";

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

  it("clears only the admitted Journey and is a no-op when absent", () => {
    const notices = recordUnsentDraft(recordUnsentDraft({}, "journey-a", "x"), "journey-b", "y");
    const cleared = clearUnsentDraft(notices, "journey-a");
    expect(cleared["journey-a"]).toBeUndefined();
    expect(cleared["journey-b"]).toBe("y");
    expect(clearUnsentDraft(cleared, "journey-a")).toBe(cleared);
  });
});
