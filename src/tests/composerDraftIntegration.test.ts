import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import desktopCapabilitySource from "../../src-tauri/capabilities/default.json?raw";

describe("Composer draft integration", () => {
  it("loads, restores, updates, and clears Journey-owned drafts", () => {
    expect(appSource).toContain("loadComposerDrafts()");
    expect(appSource).toContain('setDraft(composerDrafts[journeyId] ?? "")');
    expect(appSource).toContain("setJourneyComposerDraft(selectedJourney, event.target.value)");
    expect(appSource).toContain('setJourneyComposerDraft(baseConversation.journeyId, "", true)');
    expect(appSource).toContain("maxLength={COMPOSER_DRAFT_MAX_CHARS}");
  });

  it("coalesces durable writes and flushes semantic composer boundaries", () => {
    expect(appSource).toContain("createComposerDraftPersistence({");
    expect(appSource).toContain("idleMs: 750");
    expect(appSource).toContain("composerDraftPersistence.schedule(next)");
    expect(appSource).toContain("flushComposerDrafts");
    expect(appSource).toContain("onBlur={flushComposerDrafts}");
    expect(appSource).toContain("onCloseRequested");
    expect(appSource).toContain("closeAfterDraftFlush");
    expect(appSource).toContain("await composerDraftPersistence.flush()");
    expect(appSource).toContain("await appWindow.destroy()");
    expect(appSource).not.toContain("await appWindow.close()");
    expect(desktopCapabilitySource).toContain('"core:window:allow-close"');
    expect(desktopCapabilitySource).toContain('"core:window:allow-destroy"');
    expect(appSource).not.toContain("saveComposerDrafts(composerDrafts)");
  });

  it("guards app close while agents are active and exposes explicit confirmation", () => {
    expect(appSource).toContain("hasActiveOrFinalizingJourneyRuntime(journeyRuntimeStateRef.current)");
    expect(appSource).toContain("setCloseConfirmationOpen(true)");
    expect(appSource).toContain("Close while agents are working?");
    expect(appSource).toContain("Close anyway");
    expect(appSource).toContain("agent operations");
  });

  it("keeps pending attachments outside the draft storage boundary", () => {
    expect(appSource).not.toMatch(/saveComposerDrafts\([^)]*pendingFileAttachments/);
    expect(appSource).not.toMatch(/composerDraftPersistence\.schedule\([^)]*pendingFileAttachments/);
  });
});
