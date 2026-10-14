import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationEntryContextMenu } from "../app/ConversationEntryContextMenu";
import {
  MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY,
  hideEveryOtherConversation,
  isConversationHidden,
  revealConversation,
  type HiddenConversationsByJourney,
} from "../domain/conversationVisibility";
import type { ConversationCatalogEntry } from "../domain/conversationSpaces";
import appSource from "../app/App.tsx?raw";

type Identity = Pick<ConversationCatalogEntry, "kind" | "conversationId">;

function mirrorId(id: string): Identity {
  return { kind: "mirror_history", conversationId: id };
}

function desktopId(id: string): Identity {
  return { kind: "desktop_conversation", conversationId: id };
}

function mirrorEntry(id: string): ConversationCatalogEntry {
  return {
    kind: "mirror_history",
    conversationId: id,
    title: `Mirror ${id}`,
    updatedAt: "2026-10-01T09:00:00.000Z",
    messageCount: 4,
    availability: "available_in_mirror",
  };
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

// CR152: `revealAllConversations` has been the all-at-once reveal since CR135. This is the
// symmetric act that was missing, so clearing the list down to the one being worked in stops
// being one act repeated for everything else.
describe("CR152: hiding every conversation but one", () => {
  const entries = [desktopId("keep"), desktopId("a"), mirrorId("m1"), mirrorId("m2")];

  it("hides every other entry in one act and keeps the one it came from", () => {
    const result = hideEveryOtherConversation({}, "mirror-desktop", entries, desktopId("keep"));

    expect(result.hiddenCount).toBe(3);
    expect(result.skippedForCap).toBe(0);
    expect(isConversationHidden(result.hidden, "mirror-desktop", desktopId("keep"))).toBe(false);
    for (const entry of [desktopId("a"), mirrorId("m1"), mirrorId("m2")]) {
      expect(isConversationHidden(result.hidden, "mirror-desktop", entry)).toBe(true);
    }
  });

  it("hides both kinds, because the list mixes them and the key already carries the kind", () => {
    const result = hideEveryOtherConversation({}, "mirror-desktop", entries, desktopId("keep"));
    expect(result.hidden["mirror-desktop"]).toEqual([
      "desktop_conversation:a",
      "mirror_history:m1",
      "mirror_history:m2",
    ]);
  });

  it("leaves every other Journey's choices untouched", () => {
    const existing: HiddenConversationsByJourney = { "other-journey": ["desktop_conversation:elsewhere"] };
    const result = hideEveryOtherConversation(existing, "mirror-desktop", entries, desktopId("keep"));

    expect(result.hidden["other-journey"]).toEqual(["desktop_conversation:elsewhere"]);
  });

  it("does not count a conversation that was already hidden", () => {
    const existing: HiddenConversationsByJourney = { "mirror-desktop": ["mirror_history:m1"] };
    const result = hideEveryOtherConversation(existing, "mirror-desktop", entries, desktopId("keep"));

    expect(result.hiddenCount).toBe(2);
    expect(result.hidden["mirror-desktop"]).toHaveLength(3);
  });

  it("reports nothing done when there is nothing else to hide", () => {
    const result = hideEveryOtherConversation({}, "mirror-desktop", [desktopId("keep")], desktopId("keep"));

    expect(result.hiddenCount).toBe(0);
    expect(result.skippedForCap).toBe(0);
    expect(result.hidden).toEqual({});
  });

  it("hides what fits at the cap and says how many it could not", () => {
    // `hideConversation` declines silently at the cap, which is right for one deliberate act and
    // wrong as the basis of a bulk one: it would put some away and abandon the rest with nothing
    // said. The shortfall is returned so the surface can report it rather than the Navigator
    // having to count rows.
    const alreadyHidden = Array.from(
      { length: MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY - 1 },
      (_unused, index) => `mirror_history:filler-${index}`,
    );
    const result = hideEveryOtherConversation(
      { "mirror-desktop": alreadyHidden },
      "mirror-desktop",
      [desktopId("keep"), mirrorId("x1"), mirrorId("x2"), mirrorId("x3")],
      desktopId("keep"),
    );

    expect(result.hiddenCount).toBe(1);
    expect(result.skippedForCap).toBe(2);
    expect(result.hidden["mirror-desktop"]).toHaveLength(MAX_HIDDEN_CONVERSATIONS_PER_JOURNEY);
  });

  it("hides a conversation with live work like any other", () => {
    // Deliberate, and structural rather than casual. Hiding is a render filter: nothing leaves the
    // catalog, CR134's route still resolves a hidden conversation, the Journey row still carries
    // its running work, and CR143 puts the running count on the *closed* hidden control. A refusal
    // here would fail for a reason the Navigator cannot see, guarding something already answered.
    const result = hideEveryOtherConversation({}, "mirror-desktop", entries, desktopId("keep"));
    expect(isConversationHidden(result.hidden, "mirror-desktop", desktopId("a"))).toBe(true);
  });

  it("can be undone one conversation at a time, which is why it records nothing", () => {
    // The concern was that `revealAllConversations` over-reveals, including conversations hidden
    // deliberately long before. True, and it is not the only way back: `revealConversation` is
    // per-entry and the hidden section renders a Reveal control on every row. So no memory of this
    // act is persisted, because the precision it would buy already exists.
    const bulk = hideEveryOtherConversation({}, "mirror-desktop", entries, desktopId("keep"));
    const back = revealConversation(bulk.hidden, "mirror-desktop", mirrorId("m1"));

    expect(isConversationHidden(back, "mirror-desktop", mirrorId("m1"))).toBe(false);
    expect(isConversationHidden(back, "mirror-desktop", mirrorId("m2"))).toBe(true);
  });

  describe("on the surface", () => {
    function menu(otherConversationCount: number) {
      return renderToStaticMarkup(<ConversationEntryContextMenu
        entry={mirrorEntry("m1")}
        x={10}
        y={10}
        returnFocusTo={null}
        onContinue={vi.fn()}
        onOpenTerminal={vi.fn()}
        onRename={vi.fn()}
        onDeleteDesktop={vi.fn()}
        onHide={vi.fn()}
        onReveal={vi.fn()}
        onHideEveryOther={vi.fn()}
        otherConversationCount={otherConversationCount}
        onDismiss={vi.fn()}
      />);
    }

    it("names the number it would hide and that it can be undone", () => {
      const html = menu(12);
      expect(html).toContain("Hide Other 12 (can be revealed)");
      expect(html).toContain("Nothing is deleted, and each one can be revealed.");
    });

    it("is not offered when there is nothing else to hide", () => {
      expect(menu(0)).not.toContain("Hide Other");
    });
  });

  it("acts on the group's own Journey rather than the selected one", () => {
    // CR133 allows several disclosures open at once, and a bulk act landing on the wrong Journey is
    // the worst available version of this feature.
    const source = withoutComments(appSource);
    expect(source).toContain("onHideEveryOtherConversation={(entry) => hideEveryOtherConversationInList(journey.id, entry)}");
    expect(source.match(/hideEveryOtherConversation\(/g) ?? []).toHaveLength(1);
    expect(source).toContain("conversationCatalogs[journeyId]?.entries ?? []");
  });

  it("reports the shortfall to the Navigator rather than swallowing it", () => {
    const source = withoutComments(appSource);
    const wiring = source.indexOf("function hideEveryOtherConversationInList(");
    expect(wiring).toBeGreaterThan(0);
    const body = source.slice(wiring, source.indexOf("\n  }", wiring));
    expect(body).toContain("result.skippedForCap > 0");
    expect(body).toContain("result.hiddenCount");
    expect(body).toContain("Nothing was deleted.");
  });
});
