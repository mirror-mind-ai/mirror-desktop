import { describe, expect, it } from "vitest";
import { draftAfterAdmission, draftAfterUnansweredCancel } from "../domain/composerHandoff";
import appSource from "../app/App.tsx?raw";

// CR181: the stored copy of a sent message is kept until the agent has it, for a crash before
// admission. Clearing it then must not take what the person typed while the turn was starting.
// CR183: a turn cancelled before any answer gives its message back.

describe("CR181 · when the agent has the message", () => {
  it("the stored copy of the sent message goes", () => {
    expect(draftAfterAdmission("Plan the chapter", "Plan the chapter")).toBe("");
    // The sent message is the draft trimmed.
    expect(draftAfterAdmission("  Plan the chapter\n", "Plan the chapter")).toBe("");
  });

  it("what the person typed since stays", () => {
    expect(draftAfterAdmission("and then the index", "Plan the chapter")).toBe("and then the index");
    expect(draftAfterAdmission(undefined, "Plan the chapter")).toBe("");
  });

  it("the visible composer is not touched at admission", () => {
    const admission = appSource.slice(appSource.indexOf("agentStartApplied = true;"), appSource.indexOf('"pre_frontier"'));
    expect(admission).toContain("draftAfterAdmission(composerDraftsRef.current[ownerDraftKey], content)");
    expect(admission).not.toContain('persistOwnerComposerDraft("", true)');
    expect(admission).not.toContain("setVisibleComposerDraft");
  });
});

describe("CR183 · a turn cancelled before any answer", () => {
  it("gives its message back to an empty composer", () => {
    expect(draftAfterUnansweredCancel("", "Plan the chapter")).toBe("Plan the chapter");
    expect(draftAfterUnansweredCancel("  \n", "Plan the chapter")).toBe("Plan the chapter");
  });

  it("keeps it once if the composer still holds it", () => {
    expect(draftAfterUnansweredCancel("Plan the chapter", "Plan the chapter")).toBe("Plan the chapter");
  });

  it("puts it before what the person typed since, losing neither", () => {
    expect(draftAfterUnansweredCancel("and then the index", "Plan the chapter")).toBe("Plan the chapter\n\nand then the index");
  });

  it("is wired into the cancelled path, for an answer with neither prose nor work", () => {
    const cancelled = appSource.slice(appSource.indexOf("} else if (runWasCancelled || runFailed) {"), appSource.indexOf("// CR159 reopened"));
    // CR193: the decision itself moved to `cancelledBeforeAnyAnswer`, tested there.
    expect(cancelled).toContain("const unanswered = cancelledBeforeAnyAnswer({");
    expect(cancelled).toContain("persistOwnerComposerDraft(draftAfterUnansweredCancel(currentOwnerDraft(), content), true);");
    expect(cancelled).toContain("Message returned to the composer: the turn was cancelled before any answer.");
  });
});
