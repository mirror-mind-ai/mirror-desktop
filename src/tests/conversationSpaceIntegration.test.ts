import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("Journey conversation-space integration", () => {
  it("keeps the root workspace selected until explicit expansion", () => {
    expect(appSource).toContain("expandSelectedJourneyConversations");
    expect(appSource).toContain("Browse conversations");
    expect(appSource).toContain("<FocusedConversationSidebar");
    expect(appSource).toContain('type: "select_root"');
    expect(appSource).toContain('type: "collapse"');
  });

  it("renders Mirror history as a no-composer action surface", () => {
    expect(appSource).toContain("<MirrorHistoryActionSurface");
    expect(appSource).toContain("selectedConversationSpace.kind === \"mirror_history\"");
    expect(appSource).toContain("openMirrorConversationInTerminal");
    expect(appSource).toContain("renameMirrorConversation");
  });

  it("loads child thread authority into the existing transcript and composer lifecycle", () => {
    expect(appSource).toContain("desktopConversationThread(selectedJourney, childEntry)");
    expect(appSource).toContain("childEntry?.threadId");
    expect(appSource).toContain('selectedConversationSpace.kind === "mirror_history"');
    expect(appSource).toContain("conversationRef.current.id === baseConversation.id");
  });

  it("creates handoff authority before publishing an editable unsent prompt", () => {
    expect(appSource).toContain("await createDesktopConversation(");
    expect(appSource).toContain("createAgentHandoffPrompt");
    expect(appSource).toContain("conversationDraftKey");
  });
});
