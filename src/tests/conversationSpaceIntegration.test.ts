import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("Journey conversation-space integration", () => {
  it("expands conversations inline beneath their Journey without replacing the Journey list", () => {
    expect(appSource).toContain("expandJourneyConversations");
    expect(appSource).toContain("journey-conversation-toggle");
    expect(appSource).toContain("<FocusedConversationSidebar");
    expect(appSource).toContain("conversationsExpanded ? (");
    expect(appSource).not.toContain("Browse conversations");
    expect(appSource).toContain('type: "collapse"');
    expect(appSource).toContain('conversationCatalogStatus === "loading" ? "conversation-catalog-loading"');
    expect(appSource).toContain('aria-busy={conversationsExpanded && conversationCatalogStatus === "loading"}');
  });

  it("renders Mirror history as a no-composer action surface", () => {
    expect(appSource).toContain("<MirrorHistoryActionSurface");
    expect(appSource).toContain("selectedConversationSpace.kind === \"mirror_history\"");
    expect(appSource).toContain("openMirrorConversationInTerminal");
    expect(appSource).toContain("renameMirrorConversation");
  });

  it("loads child thread authority into the existing transcript and composer lifecycle", () => {
    expect(appSource).toContain("desktopConversationThread(selectedJourney, childEntry)");
    expect(appSource).toContain("classified.thread.threadId");
    expect(appSource).toContain("loadCompleteSegmentHistory");
    expect(appSource).toContain('selectedConversationSpace.kind === "mirror_history"');
    expect(appSource).toContain("conversationRef.current.id === baseConversation.id");
    expect(appSource).toContain("await restartDesktopConversation(");
  });

  it("creates handoff authority before publishing an editable unsent prompt", () => {
    expect(appSource).toContain("await createDesktopConversation(");
    expect(appSource).toContain("createAgentHandoffPrompt");
    expect(appSource).toContain("conversationDraftKey");
  });
});
