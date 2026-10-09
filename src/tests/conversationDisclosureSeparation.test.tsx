import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { loadNautilusJourneyThread } from "../app/journeyThreadStorage";
import appSource from "../app/App.tsx?raw";

function mirrorEntry(conversationId: string, title: string) {
  return {
    kind: "mirror_history" as const,
    conversationId,
    title,
    updatedAt: "2026-10-08T09:00:00.000Z",
    messageCount: 3,
    availability: "available_in_mirror" as const,
  };
}

function group(props: {
  journeyId: string;
  journeyName: string;
  entries: ReturnType<typeof mirrorEntry>[];
  selected?: { kind: "mirror_history"; journeyId: string; conversationId: string };
  status?: "loading" | "ready" | "error";
}) {
  return renderToStaticMarkup(<FocusedConversationSidebar
    journeyId={props.journeyId}
    journeyName={props.journeyName}
    selected={props.selected}
    entries={props.entries}
    status={props.status ?? "ready"}
    hiddenConversations={{}}
    onHideConversation={vi.fn()}
    onRevealConversation={vi.fn()}
    onRevealAllConversations={vi.fn()}
    onCreateConversation={vi.fn()}
    onSelectEntry={vi.fn()}
    onContinueMirror={vi.fn()}
    onOpenMirrorTerminal={vi.fn()}
    onRenameConversation={vi.fn()}
    onDeleteDesktop={vi.fn()}
  />);
}

describe("CR133: several disclosures stay open at once", () => {
  it("renders each Journey's group from its own catalog", () => {
    const first = group({ journeyId: "journey-a", journeyName: "Journey A", entries: [mirrorEntry("mirror-a", "Conversation A")] });
    const second = group({ journeyId: "journey-b", journeyName: "Journey B", entries: [mirrorEntry("mirror-b", "Conversation B")] });

    expect(first).toContain("Conversation A");
    expect(first).not.toContain("Conversation B");
    expect(second).toContain("Conversation B");
    expect(second).not.toContain("Conversation A");
    expect(first).toContain('aria-label="Journey A conversations"');
    expect(second).toContain('aria-label="Journey B conversations"');
  });

  // Only the Journey the Navigator is working in has a selected entry. A group that is
  // merely visible must not claim to be where the work is.
  it("shows a selected entry only in the Journey that owns the selection", () => {
    const owning = group({
      journeyId: "journey-a",
      journeyName: "Journey A",
      entries: [mirrorEntry("mirror-a", "Conversation A")],
      selected: { kind: "mirror_history", journeyId: "journey-a", conversationId: "mirror-a" },
    });
    const looking = group({ journeyId: "journey-b", journeyName: "Journey B", entries: [mirrorEntry("mirror-b", "Conversation B")] });

    expect(owning).toContain('aria-current="page"');
    expect(looking).not.toContain('aria-current="page"');
    expect(looking).not.toContain("selected");
  });

  it("marks only the loading group as busy", () => {
    expect(group({ journeyId: "journey-a", journeyName: "Journey A", entries: [], status: "loading" }))
      .toContain("focused-conversation-sidebar is-loading");
    expect(group({ journeyId: "journey-b", journeyName: "Journey B", entries: [mirrorEntry("mirror-b", "Conversation B")] }))
      .not.toContain("is-loading");
  });
});

describe("CR133: revealing a Journey does not start it", () => {
  beforeEach(() => invoke.mockReset());

  it("reads a Journey's thread without provisioning it, and reports absence as absence", async () => {
    invoke.mockResolvedValue(null);
    await expect(loadNautilusJourneyThread("journey-not-started")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("load_journey_thread", { journeyId: "journey-not-started" });
  });

  it("loads the catalog through read-only commands only", () => {
    const expandPath = appSource.slice(
      appSource.indexOf("async function expandJourneyConversations("),
      appSource.indexOf("function requestBlankDesktopConversation("),
    );
    // Comments are stripped first: this guard is about what the code calls, not about the
    // words used to explain it.
    const code = expandPath.replace(/\/\/.*$/gm, "");
    for (const mutating of [/\bstart\w*\(/i, /\brestart\w*\(/i, /\bprovision\w*\(/i, /\bensure\w*\(/i, /\bactivate\w*\(/i, /\bcreate\w*\(/i, /\bmutate\w*\(/i]) {
      expect(code).not.toMatch(mutating);
    }
    expect(expandPath).toContain("await loadNautilusJourneyThread(ownerJourneyId)");
    expect(expandPath).toContain("await loadDesktopConversationCatalog(ownerJourneyId)");
    expect(expandPath).toContain("await loadMirrorConversationCatalog({");
    // A Journey with no thread file is named, not started.
    expect(expandPath).toContain("Start this Journey before creating additional conversations.");
  });
});

describe("CR133: selection and visibility are separately operable", () => {
  it("keeps Enter and Space on the disclosure from reaching the row that selects", () => {
    const toggle = appSource.slice(
      appSource.indexOf('className="journey-conversation-toggle"'),
      appSource.indexOf('aria-expanded={conversationsExpanded}'),
    );
    expect(toggle).toContain('if (event.key === "Enter" || event.key === " ") event.stopPropagation();');
    expect(toggle).toContain("event.stopPropagation();");
    // The row still selects on Enter and Space; only the disclosure is carved out.
    expect(appSource).toContain('const intent = event.key === "Enter" ? "keyboard-enter" : "keyboard-space";');
    expect(appSource).toContain('dispatchConversationSelection({ type: "select_root", journeyId: journey.id });');
  });

  it("selects a Journey and a conversation in one act when the entry is clicked", () => {
    expect(appSource).toContain("if (!journeyIsSelected) selectJourney(journey.id, \"pointer\");");
    expect(appSource).toContain("dispatchConversationSelection({\n                      type: entry.kind === \"desktop_conversation\" ? \"select_desktop\" : \"select_mirror\",");
  });

  // Equivalence: the navigation presentation must receive the same thread coordinate it did
  // before, now read from the selected Journey's own catalog rather than a global singleton.
  it("derives the selected thread coordinate from the selected Journey's catalog", () => {
    expect(appSource).toContain("const selectedJourneyCatalog = journeyCatalogState(conversationCatalogs, selectedJourney);");
    expect(appSource).toContain("      : selectedJourneyCatalog.rootThreadId,");
    expect(appSource).toContain("const selectedConversationSpace = resolveSelectedConversationSpace(conversationSelection, selectedJourney);");
  });

  it("restores disclosures from the preference file and loads them one at a time", () => {
    expect(appSource).toContain('dispatchConversationExpansion({ type: "restore", journeyIds: sanitizedPreferences.expandedConversationJourneyIds });');
    expect(appSource).toContain("expandedConversationJourneyIds: [...expandedConversationJourneyIds],");
    expect(appSource).toContain("for (const journeyId of restored) {");
    expect(appSource).toContain("await expandJourneyConversations(journeyId);");
  });
});
