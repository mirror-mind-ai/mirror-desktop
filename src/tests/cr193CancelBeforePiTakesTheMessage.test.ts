import { describe, expect, it } from "vitest";
import { cancelledBeforeAnyAnswer, hasAnswerProse } from "../domain/composerHandoff";
import { withCertifiedPersona } from "../app/conversationPresentation";
import appSource from "../app/App.tsx?raw";

// CR193: CR188 names the persona on the answer as soon as the Mirror delivers its context, before
// Pi has the message. A turn cancelled in that window held only the persona marker, which read as
// an answer, so CR183 never gave the message back.

describe("CR193 · the persona marker is not an answer", () => {
  it("an answer holding only the persona has no prose", () => {
    expect(hasAnswerProse(withCertifiedPersona("", "tech-nerd"))).toBe(false);
    expect(hasAnswerProse("")).toBe(false);
    expect(hasAnswerProse("  \n")).toBe(false);
  });

  it("prose after the persona, or without one, is an answer", () => {
    expect(hasAnswerProse(withCertifiedPersona("Here is the plan.", "tech-nerd"))).toBe(true);
    expect(hasAnswerProse("Here is the plan.")).toBe(true);
  });
});

describe("CR193 · a cancel before Pi takes the message", () => {
  const before = {
    runWasCancelled: true,
    performedWork: false,
    interruptedFragment: "",
    assistantContent: withCertifiedPersona("", "suporte-ao-cliente"),
  };

  it("is unanswered even when the persona was already named", () => {
    expect(cancelledBeforeAnyAnswer(before)).toBe(true);
  });

  it("is answered once there is prose, a fragment or work", () => {
    expect(cancelledBeforeAnyAnswer({ ...before, assistantContent: withCertifiedPersona("Half a", "x") })).toBe(false);
    expect(cancelledBeforeAnyAnswer({ ...before, interruptedFragment: "Half a" })).toBe(false);
    expect(cancelledBeforeAnyAnswer({ ...before, performedWork: true })).toBe(false);
  });

  it("only a cancel gives the message back", () => {
    expect(cancelledBeforeAnyAnswer({ ...before, runWasCancelled: false })).toBe(false);
  });

  it("is what the cancelled path asks, for both the return and the empty answer it drops", () => {
    const cancelled = appSource.slice(appSource.indexOf("} else if (runWasCancelled || runFailed) {"), appSource.indexOf("// CR159 reopened"));
    expect(cancelled).toContain("cancelledBeforeAnyAnswer({");
    expect(cancelled).toContain("hasAnswerProse(message.content)");
    expect(cancelled).not.toContain("message.content.trim()");
  });
});
