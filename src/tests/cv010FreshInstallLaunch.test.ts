import { describe, expect, it } from "vitest";
import { conversationDraftKey, visibleComposerDraftKey } from "../domain/conversationSpaces";
import appSource from "../app/App.tsx?raw";
import discoverySource from "../app/MirrorDiscoveryCard.tsx?raw";

// CV-010.DS-005 phase 0, found on the first launch of Mirror Desktop TS Dev (2026-10-28).
// A fresh install has no selected Journey. The effect that restores the visible Composer draft
// asked conversationDraftKey("") for a key, which throws, and an exception inside an effect
// unmounts the whole tree: a black window before the first-run screen could render. The line
// had been there since alpha.8 and no existing install ever reached it with no Journey selected.
describe("a fresh install with no selected Journey", () => {
  it("has no visible Composer draft rather than an invalid Journey", () => {
    expect(visibleComposerDraftKey("")).toBeUndefined();
    expect(visibleComposerDraftKey("", "conversation-one")).toBeUndefined();
    expect(() => conversationDraftKey("")).toThrow(/Journey ID is invalid/);
  });

  it("keys a selected Journey's draft exactly as before", () => {
    expect(visibleComposerDraftKey("mirror-desktop")).toBe(conversationDraftKey("mirror-desktop"));
    expect(visibleComposerDraftKey("mirror-desktop", "conversation-one"))
      .toBe(conversationDraftKey("mirror-desktop", "conversation-one"));
  });

  it("still refuses a Journey ID that is present but malformed", () => {
    expect(() => visibleComposerDraftKey("../escape")).toThrow(/Journey ID is invalid/);
  });

  it("restores the visible draft through the key that tolerates no Journey", () => {
    const effect = appSource.indexOf("const conversationId = selectedConversationSpace.kind === \"desktop_conversation\"");
    expect(effect).toBeGreaterThan(0);
    const body = appSource.slice(effect, appSource.indexOf("}, [", effect));
    expect(body).toContain("visibleComposerDraftKey(selectedJourney, conversationId)");
    expect(body).not.toContain("conversationDraftKey(selectedJourney");
  });

  it("names this line on the first-run screens", () => {
    for (const source of [appSource, discoverySource]) {
      expect(source).not.toMatch(/<p className="eyebrow">Mirror Desktop(?! TS)/);
    }
  });
});
