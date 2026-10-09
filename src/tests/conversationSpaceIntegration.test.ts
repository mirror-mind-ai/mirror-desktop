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
    expect(appSource).toContain("await waitForCatalogLoadingFeedbackPaint()");
    expect(appSource).toContain("window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))");
    // Re-aimed by CR133: loading feedback belongs to the group that is loading. A
    // shell-wide busy cursor would deny the Navigator the very thing this CR delivers.
    expect(appSource).toContain("const journeyCatalog = journeyCatalogState(conversationCatalogs, journey.id);");
    expect(appSource).toContain('aria-busy={conversationsExpanded && journeyCatalog.status === "loading"}');
    expect(appSource).not.toContain("conversation-catalog-loading");
  });

  it("renders Mirror history as a no-composer action surface", () => {
    expect(appSource).toContain("<MirrorHistoryActionSurface");
    expect(appSource).toContain("selectedConversationSpace.kind === \"mirror_history\"");
    expect(appSource).toContain("openMirrorConversationInTerminal");
    expect(appSource).toContain("renameMirrorConversation");
  });

  it("renames Mirror and Desktop Conversations through one application-owned dialog", () => {
    expect(appSource).toContain('"Rename Mirror Conversation" : "Rename Desktop Conversation"');
    expect(appSource).toContain("requestConversationRename");
    expect(appSource).toContain("confirmMirrorConversationRename");
    expect(appSource).toContain("suggestSelectedConversationTitle");
    expect(appSource).not.toContain("window.prompt(");
  });

  it("confirms Desktop child deletion in an application-owned alert dialog", () => {
    expect(appSource).toContain('aria-label="Delete Desktop Conversation"');
    expect(appSource).toContain("confirmDesktopConversationDeletion");
    expect(appSource).toContain("requestDesktopConversationDeletion");
    expect(appSource).not.toContain("window.confirm(");
  });

  // Re-aimed by CR133. This test used to pin the mechanism of the reported defect: going to
  // another Journey collapsed the open disclosure and discarded its catalog. It now pins the
  // opposite, so the behaviour cannot come back.
  it("keeps every other Journey's disclosure and catalog when the selected Journey changes", () => {
    const switchPath = appSource.slice(
      appSource.indexOf("function selectJourney("),
      appSource.indexOf("function openJourneyTreeMenu("),
    );
    expect(switchPath).not.toContain('type: "collapse"');
    expect(switchPath).not.toContain("setConversationCatalog");
    expect(switchPath).not.toContain("setConversationCatalogs");
    expect(switchPath).not.toContain("RootThreadId");

    // Disclosure is structural visibility: it must not select, and must not start anything.
    const expandPath = appSource.slice(
      appSource.indexOf("async function expandJourneyConversations("),
      appSource.indexOf("function requestBlankDesktopConversation("),
    );
    expect(expandPath).not.toContain("selectJourney(");
    expect(expandPath).not.toContain("journey_selected");
    expect(expandPath).toContain("dispatchConversationExpansion({ type: \"expand\", journeyId: ownerJourneyId })");
    expect(expandPath).toContain("await loadNautilusJourneyThread(ownerJourneyId)");
    // The abort guard is the disclosure's own, never the selection's.
    expect(expandPath).toContain("!expandedConversationJourneyIdsRef.current.has(ownerJourneyId)");
    expect(expandPath).not.toContain("selectedJourneyRef.current !== ownerJourneyId");
  });

  it("loads child thread authority into the existing transcript and composer lifecycle", () => {
    expect(appSource).toContain("desktopConversationThread(selectedJourney, childEntry)");
    expect(appSource).toContain("classified.thread.threadId");
    expect(appSource).toContain("loadCompleteSegmentHistory");
    expect(appSource).not.toContain("loadCompleteConversationSegmentHistory");
    expect(appSource).toContain("inspectDedicatedPiTranscript(");
    expect(appSource).toContain("projectPiBackedConversationSurface(restoredConversation, inspection)");
    expect(appSource).not.toContain("!latestRestoredNautilusTurn && !childEntry");
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
