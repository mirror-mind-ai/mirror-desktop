import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { ConversationEntryContextMenu } from "../app/ConversationEntryContextMenu";
import type { ConversationCatalogEntry, ConversationSpaceSelection } from "../domain/conversationSpaces";

function desktop(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "desktop_conversation",
    conversationId,
    threadId: `desktop-thread-${conversationId}`,
    title: `Desktop ${conversationId}`,
    updatedAt: "2026-10-09T10:00:00.000Z",
    messageCount: 3,
    availability: "ready",
    authority: { activeGeneration: 1, runtimeChannel: "development", generations: [] },
  };
}

function mirror(conversationId: string): ConversationCatalogEntry {
  return {
    kind: "mirror_history",
    conversationId,
    title: `Mirror ${conversationId}`,
    updatedAt: "2026-10-08T10:00:00.000Z",
    messageCount: 9,
    availability: "available_in_mirror",
  };
}

function sidebar(options: {
  entries: ConversationCatalogEntry[];
  hidden?: Record<string, string[]>;
  selected?: ConversationSpaceSelection;
}) {
  return renderToStaticMarkup(<FocusedConversationSidebar
    journeyId="mirror-desktop"
    journeyName="Mirror Desktop"
    selected={options.selected ?? { kind: "journey_workspace", journeyId: "mirror-desktop" }}
    entries={options.entries}
    status="ready"
    hiddenConversations={options.hidden ?? {}}
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

describe("CR135: the working set is the Navigator's", () => {
  it("renders every entry when nothing is hidden", () => {
    const html = sidebar({ entries: [desktop("one"), mirror("two")] });
    expect(html).toContain("Desktop one");
    expect(html).toContain("Mirror two");
    expect(html).not.toContain("hidden</span>");
  });

  it("takes a hidden conversation out of the list and offers it back with a count", () => {
    const html = sidebar({
      entries: [desktop("one"), mirror("two")],
      hidden: { "mirror-desktop": ["mirror_history:two"] },
    });
    expect(html).toContain("Desktop one");
    expect(html).not.toContain("Mirror two");
    expect(html).toContain("1 hidden");
    expect(html).toContain('aria-label="1 hidden conversations in Mirror Desktop"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("says nothing was deleted without making the Navigator open anything first", () => {
    // Written first against the opened section, which static markup cannot reach. The failure
    // was the useful part: the doubt — did I delete it? — arrives before the section is opened,
    // so the closed control had to carry the reassurance as well.
    const html = sidebar({
      entries: [desktop("one"), mirror("two")],
      hidden: { "mirror-desktop": ["mirror_history:two"] },
    });
    expect(html).toContain("Hidden only from this list. Nothing was deleted.");
  });

  it("offers no hidden control when another Journey's choice is the only one recorded", () => {
    const html = sidebar({
      entries: [desktop("one")],
      hidden: { "builder-mode-evolution": ["desktop_conversation:one"] },
    });
    expect(html).toContain("Desktop one");
    expect(html).not.toContain("hidden</span>");
  });
});

describe("CR135: two surfaces never disagree about where the Navigator is", () => {
  it("still renders a hidden conversation while it is the selected one, and marks it", () => {
    const html = sidebar({
      entries: [desktop("one"), mirror("two")],
      hidden: { "mirror-desktop": ["mirror_history:two"] },
      selected: { kind: "mirror_history", journeyId: "mirror-desktop", conversationId: "two" },
    });
    expect(html).toContain("Mirror two");
    expect(html).toContain("is-hidden");
    expect(html).toContain("· Hidden");
    // Nothing is left in the hidden partition, so no count contradicts the visible list.
    expect(html).not.toContain("1 hidden");
  });
});

describe("CR135: provenance survives hiding", () => {
  it("keeps Desktop and Mirror distinguishable among hidden entries", () => {
    const html = sidebar({
      entries: [desktop("one"), mirror("two"), desktop("three")],
      hidden: { "mirror-desktop": ["mirror_history:two", "desktop_conversation:three"] },
    });
    expect(html).toContain("2 hidden");
    // The glyphs that carry provenance are the entry's own, so hiding cannot flatten an
    // imported Mirror record into a Desktop one.
    expect(html).toContain("◆");
  });
});

describe("CR135: hiding is offered for both kinds and is never deletion", () => {
  function menu(entry: ConversationCatalogEntry, hidden?: boolean) {
    return renderToStaticMarkup(<ConversationEntryContextMenu
      entry={entry}
      x={10}
      y={10}
      hidden={hidden}
      returnFocusTo={null}
      onContinue={vi.fn()}
      onOpenTerminal={vi.fn()}
      onRename={vi.fn()}
      onDeleteDesktop={vi.fn()}
      onHide={vi.fn()}
      onReveal={vi.fn()}
      onDismiss={vi.fn()}
    />);
  }

  it("names reversibility in the label, next to the item it must not be confused with", () => {
    const html = menu(desktop("one"));
    expect(html).toContain("Hide from List (can be revealed)");
    expect(html).toContain("Delete Conversation");
    expect(html).toContain('role="separator"');
  });

  it("offers reveal instead once the conversation is hidden", () => {
    const html = menu(desktop("one"), true);
    expect(html).toContain("Reveal in List");
    expect(html).not.toContain("Hide from List");
  });

  it("offers hiding for an imported Mirror record too", () => {
    expect(menu(mirror("two"))).toContain("Hide from List (can be revealed)");
  });

  it("offers hiding for an entry that needs attention, which has no other actions", () => {
    const broken: ConversationCatalogEntry = { ...desktop("broken"), availability: "needs_attention" };
    expect(menu(broken)).toContain("Hide from List (can be revealed)");
  });
});
