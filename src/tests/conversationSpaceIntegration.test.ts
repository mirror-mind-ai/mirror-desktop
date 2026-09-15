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
    expect(appSource).toContain("selectedConversationSpace.kind !== \"journey_workspace\"");
    expect(appSource).toContain("openMirrorConversationInTerminal");
    expect(appSource).toContain("renameMirrorConversation");
  });

  it("creates handoff authority before publishing an editable unsent prompt", () => {
    expect(appSource).toContain("await createDesktopConversation(");
    expect(appSource).toContain("createAgentHandoffPrompt");
    expect(appSource).toContain("handoffDraftByConversationId");
  });
});
