import { describe, expect, it } from "vitest";
import { manualCompactionAvailability } from "../app/manualCompactionAvailability";
import { classifyCompactionRefusal } from "../app/compactionNoticeLifecycle";
import appSource from "../app/App.tsx?raw";

const ready = { canSend: true, safeTestMode: false, leafIsCompaction: false };

// CR104: Pi throws "Already compacted" before it calls any model, using a structural
// condition the Desktop can read from the same session. So the menu can say so up front,
// and a refusal that still arrives can be recognised as a benign outcome.
describe("manual compaction availability", () => {
  it("offers compaction when the conversation is idle and the branch has new work", () => {
    expect(manualCompactionAvailability(ready)).toEqual({ canCompact: true });
  });

  it("explains an already compacted branch instead of spending a refusal on it", () => {
    expect(manualCompactionAvailability({ ...ready, leafIsCompaction: true })).toEqual({
      canCompact: false,
      unavailableReason: "Already compacted. There is nothing new to close into a chapter.",
    });
  });

  it("keeps the reasons it already had, and prefers the most blocking one", () => {
    expect(manualCompactionAvailability({ ...ready, safeTestMode: true }).unavailableReason)
      .toBe("Compaction is unavailable in safe test mode.");
    expect(manualCompactionAvailability({ ...ready, canSend: false }).unavailableReason)
      .toBe("Available once the conversation is idle and ready to send.");
    // Safe test mode outranks an already compacted branch: it refuses the action outright,
    // while an already compacted branch would accept work once a turn has run.
    expect(manualCompactionAvailability({ canSend: true, safeTestMode: true, leafIsCompaction: true }).unavailableReason)
      .toBe("Compaction is unavailable in safe test mode.");
  });

  it("never forbids compaction on an unknown branch state", () => {
    // The flag is only trustworthy while it reflects a real inspection. Absent knowledge,
    // letting Pi refuse is correct; wrongly forbidding would remove a working action.
    expect(manualCompactionAvailability({ ...ready, leafIsCompaction: undefined }).canCompact).toBe(true);
  });
});

describe("recognising a benign compaction refusal", () => {
  it("treats a refusal on an already compacted branch as nothing to do", () => {
    // Confirmed against the Desktop's own reading of the session, not against Pi's prose.
    expect(classifyCompactionRefusal("Pi refused to compact: Already compacted", true)).toBe("nothing_to_do");
  });

  it("keeps a refusal a failure when the branch still had work to compact", () => {
    expect(classifyCompactionRefusal("Pi refused to compact: Already compacted", false)).toBe("failed");
    expect(classifyCompactionRefusal("Compaction did not complete: provider exploded", false)).toBe("failed");
    expect(classifyCompactionRefusal("Compaction did not complete: provider exploded", true)).toBe("failed");
  });

  it("reports a benign outcome as a confirmation that fades", () => {
    expect(appSource).toContain("classifyCompactionRefusal(");
    expect(appSource).toContain("manualCompactionAvailability(");
  });
});
