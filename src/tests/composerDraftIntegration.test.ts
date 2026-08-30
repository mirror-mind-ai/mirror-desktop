import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("Composer draft integration", () => {
  it("loads, restores, updates, and clears Journey-owned drafts", () => {
    expect(appSource).toContain("loadComposerDrafts()");
    expect(appSource).toContain('setDraft(composerDrafts[journeyId] ?? "")');
    expect(appSource).toContain("setJourneyComposerDraft(selectedJourney, event.target.value)");
    expect(appSource).toContain('setJourneyComposerDraft(baseConversation.journeyId, "")');
    expect(appSource).toContain("maxLength={COMPOSER_DRAFT_MAX_CHARS}");
  });

  it("keeps pending attachments outside the draft storage boundary", () => {
    expect(appSource).toContain("saveComposerDrafts(composerDrafts)");
    expect(appSource).not.toMatch(/saveComposerDrafts\([^)]*pendingFileAttachments/);
  });
});
