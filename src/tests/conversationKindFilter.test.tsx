import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { applyConversationKindFilter } from "../domain/conversationKindFilter";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  parsePersistedJourneyPreferences,
} from "../domain/journeyPreferencePersistence";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import sidebarSource from "../app/FocusedConversationSidebar.tsx?raw";

function mirror(id: string, title = `Mirror ${id}`): ConversationCatalogEntry {
  return {
    kind: "mirror_history",
    conversationId: id,
    title,
    updatedAt: "2026-10-01T09:00:00.000Z",
    messageCount: 0,
    availability: "available_in_mirror",
  };
}

function desktop(id: string, title = `Desktop ${id}`): ConversationCatalogEntry {
  return {
    kind: "desktop_conversation",
    conversationId: id,
    threadId: `thread-${id}`,
    title,
    updatedAt: "2026-10-02T09:00:00.000Z",
    messageCount: 3,
    availability: "ready",
    authority: {
      activeGeneration: 1,
      runtimeChannel: "development",
      generations: [{
        generation: 1,
        status: "ready",
        piSessionId: `pi-${id}`,
        piSessionFile: `/app/pi-${id}.jsonl`,
        mirrorConversationId: `mirror-${id}`,
        createdAt: "2026-10-02T09:00:00.000Z",
        activatedAt: "2026-10-02T09:00:00.000Z",
        activationReceipt: {
          schemaVersion: "1.0.0",
          journeyId: "mirror-desktop",
          threadId: `thread-${id}`,
          generation: 1,
          piSessionId: `pi-${id}`,
          mirrorConversationId: `mirror-${id}`,
          mode: "mirror",
          commandAuthority: "installed",
          runtimeChannel: "development",
          activatedAt: "2026-10-02T09:00:00.000Z",
        },
      }],
    },
  };
}

function sidebar(props: {
  entries: ConversationCatalogEntry[];
  hideMirrorHistory: boolean;
  selected?: Parameters<typeof FocusedConversationSidebar>[0]["selected"];
}) {
  return renderToStaticMarkup(<FocusedConversationSidebar
    journeyId="mirror-desktop"
    journeyName="Mirror Desktop"
    entries={props.entries}
    status="ready"
    selected={props.selected}
    hiddenConversations={{}}
    hideMirrorHistory={props.hideMirrorHistory}
    onToggleMirrorHistoryFilter={vi.fn()}
    onCreateConversation={vi.fn()}
    onSelectEntry={vi.fn()}
    onContinueMirror={vi.fn()}
    onOpenMirrorTerminal={vi.fn()}
    onRenameConversation={vi.fn()}
    onDeleteDesktop={vi.fn()}
    onHideConversation={vi.fn()}
    onRevealConversation={vi.fn()}
    onRevealAllConversations={vi.fn()}
    onHideEveryOtherConversation={vi.fn()}
  />);
}

// CR153: measured before built. Running the same script the application runs found 41, 45 and 57
// `mirror_history` entries in three Journeys against four Desktop conversations, and roughly half
// of the Mirror ones were untitled with zero messages. The list is a single recency-interleaved
// union showing six rows at a time, so the conversations being worked in compete for those six
// slots against conversations that contain nothing.
describe("CR153: showing only Desktop conversations", () => {
  it("removes Mirror history and keeps every Desktop conversation", () => {
    const result = applyConversationKindFilter({
      entries: [desktop("a"), mirror("m1"), desktop("b"), mirror("m2")],
      hideMirrorHistory: true,
    });

    expect(result.entries.map((entry) => entry.conversationId)).toEqual(["a", "b"]);
    expect(result.filtered).toBe(2);
  });

  it("changes nothing at all while it is off", () => {
    const entries = [desktop("a"), mirror("m1")];
    const result = applyConversationKindFilter({ entries, hideMirrorHistory: false });

    expect(result.entries).toEqual(entries);
    expect(result.filtered).toBe(0);
  });

  it("filters a Mirror conversation that arrives after the choice was made", () => {
    // This is the whole difference between a filter and a bulk hide, and the reason CR153 refused
    // to be implemented as one. A bulk hide only ever knew about the entries that existed when it
    // ran, so tomorrow's arrival would appear and the Navigator would have to act again — which is
    // the behaviour they asked to be rid of.
    const before = applyConversationKindFilter({ entries: [desktop("a")], hideMirrorHistory: true });
    expect(before.filtered).toBe(0);

    const after = applyConversationKindFilter({
      entries: [desktop("a"), mirror("arrived-later")],
      hideMirrorHistory: true,
    });
    expect(after.entries.map((entry) => entry.conversationId)).toEqual(["a"]);
    expect(after.filtered).toBe(1);
  });

  it("never removes the conversation being worked in, even when it is Mirror history", () => {
    // `partitionConversationVisibility` records why: a list that omits the conversation the
    // transcript is showing is CR137's two-surfaces-disagree defect, made guaranteed rather than
    // incidental. A filter reaches it more easily than hiding does, because the Navigator never
    // named this entry — they named its kind.
    const result = applyConversationKindFilter({
      entries: [desktop("a"), mirror("m1"), mirror("m2")],
      hideMirrorHistory: true,
      selected: { kind: "mirror_history", journeyId: "mirror-desktop", conversationId: "m1" },
    });

    expect(result.entries.map((entry) => entry.conversationId)).toEqual(["a", "m1"]);
    expect(result.shownBecauseSelected).toBe("mirror_history:m1");
    expect(result.filtered).toBe(1);
  });

  it("leaves the Journey workspace selection alone, because it is never a catalog entry", () => {
    const result = applyConversationKindFilter({
      entries: [desktop("a"), mirror("m1")],
      hideMirrorHistory: true,
      selected: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });

    expect(result.entries.map((entry) => entry.conversationId)).toEqual(["a"]);
    expect(result.shownBecauseSelected).toBeUndefined();
  });

  describe("on the surface", () => {
    it("lists no Mirror row and says how many it removed", () => {
      const html = sidebar({ entries: [desktop("a"), mirror("m1"), mirror("m2")], hideMirrorHistory: true });

      expect(html).toContain("Desktop a");
      expect(html).not.toContain("Mirror m1");
      expect(html).not.toContain("Mirror m2");
      expect(html).toContain("2 Mirror conversations hidden by this filter.");
      expect(html).toContain("Show them");
    });

    it("says it in the singular when it removed one", () => {
      const html = sidebar({ entries: [desktop("a"), mirror("m1")], hideMirrorHistory: true });
      expect(html).toContain("1 Mirror conversation hidden by this filter.");
    });

    it("keeps the heading on the factual total rather than on what survived", () => {
      // CR135 pinned this and CR153 must not quietly edit it. A filter that also changed the
      // heading would make the Navigator believe conversations stopped existing rather than
      // stopped being shown, and would merge two counts that CR143 requires to stay apart.
      const html = sidebar({ entries: [desktop("a"), mirror("m1"), mirror("m2")], hideMirrorHistory: true });
      expect(html).toContain("3 conversations");
    });

    it("offers the toggle in both states and says what each one does", () => {
      const off = sidebar({ entries: [desktop("a"), mirror("m1")], hideMirrorHistory: false });
      expect(off).toContain('aria-pressed="false"');
      expect(off).toContain("Show only Desktop conversations, hiding Mirror history");
      expect(off).not.toContain("hidden by this filter");

      const on = sidebar({ entries: [desktop("a"), mirror("m1")], hideMirrorHistory: true });
      expect(on).toContain('aria-pressed="true"');
      expect(on).toContain("Show Mirror history in the conversation list again");
    });

    it("says nothing when the filter is on and there was nothing of that kind", () => {
      const html = sidebar({ entries: [desktop("a")], hideMirrorHistory: true });
      expect(html).toContain('aria-pressed="true"');
      expect(html).not.toContain("hidden by this filter");
    });

    it("marks a selected Mirror conversation as filtered out rather than as hidden", () => {
      // Two different statements. One was a choice about this conversation, the other about its
      // kind, and the way back is a different control for each.
      const html = sidebar({
        entries: [desktop("a"), mirror("m1")],
        hideMirrorHistory: true,
        selected: { kind: "mirror_history", journeyId: "mirror-desktop", conversationId: "m1" },
      });
      expect(html).toContain("Filtered out");
      expect(html).not.toContain("· Hidden");
    });
  });

  it("runs before the hidden partition, so a kind is not concealed in two places at once", () => {
    const source = sidebarSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    const filter = source.indexOf("applyConversationKindFilter({");
    const partition = source.indexOf("partitionConversationVisibility({");
    expect(filter).toBeGreaterThan(0);
    expect(partition).toBeGreaterThan(0);
    expect(filter).toBeLessThan(partition);
    expect(source).toContain("entries: kindFilter.entries,");
  });

  it("survives a relaunch, and a bad value costs nothing else", () => {
    const persisted = createPersistedJourneyPreferences({
      ...defaultJourneyPreferenceState,
      pinnedJourneyIds: ["mirror-desktop"],
      hideMirrorHistory: true,
    });
    expect(parsePersistedJourneyPreferences(persisted)?.preferences.hideMirrorHistory).toBe(true);

    // CR133's departure, inherited: a view preference must never be able to reset the pins.
    const damaged = parsePersistedJourneyPreferences({
      ...persisted,
      preferences: { ...persisted.preferences, hideMirrorHistory: "yes please" },
    });
    expect(damaged?.preferences.hideMirrorHistory).toBe(false);
    expect(damaged?.preferences.pinnedJourneyIds).toEqual(["mirror-desktop"]);
  });

  it("defaults to showing everything", () => {
    expect(defaultJourneyPreferenceState.hideMirrorHistory).toBe(false);
  });
});
