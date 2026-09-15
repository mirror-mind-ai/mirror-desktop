import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOCUSED_SIDEBAR_WIDTH,
  MAX_FOCUSED_SIDEBAR_WIDTH,
  MIN_FOCUSED_SIDEBAR_WIDTH,
  availableConversationActions,
  clampFocusedSidebarWidth,
  createAgentHandoffPrompt,
  createJourneyWorkspaceSelection,
  conversationDraftKey,
  desktopConversationThread,
  parseConversationCatalog,
  reduceConversationFocus,
} from "../domain/conversationSpaces";

function desktopAuthority(threadId = "thread-child-1") {
  return {
    activeGeneration: 1,
    runtimeChannel: "development" as const,
    generations: [{
      generation: 1,
      status: "ready" as const,
      piSessionId: "pi-session-child-1",
      piSessionFile: "/private/app-data/pi-session-child-1.jsonl",
      mirrorConversationId: "mirror-generation-child-1",
      createdAt: "2026-09-15T10:00:00.000Z",
      activatedAt: "2026-09-15T10:00:00.000Z",
      activationReceipt: {
        schemaVersion: "1.0.0" as const,
        journeyId: "mirror-desktop",
        threadId,
        generation: 1,
        piSessionId: "pi-session-child-1",
        mirrorConversationId: "mirror-generation-child-1",
        mode: "mirror" as const,
        commandAuthority: "installed" as const,
        runtimeChannel: "development" as const,
        activatedAt: "2026-09-15T10:00:00.000Z",
      },
    }],
  };
}

describe("conversation spaces", () => {
  it("keeps the Journey workspace as an uncataloged root selection", () => {
    expect(createJourneyWorkspaceSelection("mirror-desktop")).toEqual({
      kind: "journey_workspace",
      journeyId: "mirror-desktop",
    });
  });

  it("parses bounded child entries without admitting the Journey root thread", () => {
    const catalog = parseConversationCatalog({
      schemaVersion: "1.0.0",
      journeyId: "mirror-desktop",
      entries: [
        {
          kind: "desktop_conversation",
          conversationId: "conversation-child-1",
          threadId: "thread-child-1",
          title: "Child work",
          updatedAt: "2026-09-15T10:00:00.000Z",
          messageCount: 0,
          availability: "ready",
          authority: desktopAuthority(),
        },
        {
          kind: "mirror_history",
          conversationId: "mirror-source-1",
          title: "Terminal work",
          updatedAt: "2026-09-15T09:00:00.000Z",
          messageCount: 12,
          availability: "available_in_mirror",
        },
      ],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" });
    expect(catalog?.entries).toHaveLength(2);
    expect(catalog?.entries[1].kind).toBe("mirror_history");
  });

  it("accepts canonical eight-character Mirror IDs without weakening Desktop authority IDs", () => {
    const mirrorEntry = {
      kind: "mirror_history", conversationId: "399badc9", title: "Terminal work",
      updatedAt: "2026-09-15T09:00:00.000Z", messageCount: 12, availability: "available_in_mirror",
    };
    expect(parseConversationCatalog({
      schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [mirrorEntry],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })?.entries[0]).toMatchObject(mirrorEntry);
    expect(parseConversationCatalog({
      schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [{ ...mirrorEntry, conversationId: "short7" }],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
    expect(parseConversationCatalog({
      schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [{
        ...mirrorEntry, kind: "desktop_conversation", threadId: "thread-child-1",
        authority: desktopAuthority(), availability: "ready",
      }],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
  });

  it("accepts canonical Mirror IDs inside native Desktop generation authority", () => {
    const authority = desktopAuthority();
    authority.generations[0].mirrorConversationId = "e3a520b8";
    authority.generations[0].activationReceipt.mirrorConversationId = "e3a520b8";
    const catalog = parseConversationCatalog({
      schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [{
        kind: "desktop_conversation", conversationId: "conversation-child-1", threadId: "thread-child-1",
        title: "New conversation", updatedAt: "2026-09-15T10:00:00.000Z", messageCount: 0,
        availability: "ready", authority,
      }],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" });
    expect(catalog?.entries[0].kind).toBe("desktop_conversation");
  });

  it("rejects cross-Journey, duplicate, root-thread and oversized catalogs", () => {
    const entry = {
      kind: "desktop_conversation",
      conversationId: "conversation-child-1",
      threadId: "thread-child-1",
      title: "Child work",
      updatedAt: "2026-09-15T10:00:00.000Z",
      messageCount: 0,
      availability: "ready",
      authority: desktopAuthority(),
    };
    expect(parseConversationCatalog({ schemaVersion: "1.0.0", journeyId: "other", entries: [] }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
    expect(parseConversationCatalog({ schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [entry, entry] }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
    expect(parseConversationCatalog({ schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [{ ...entry, threadId: "thread-root" }] }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
    expect(parseConversationCatalog({ schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: Array.from({ length: 101 }, (_, index) => ({ ...entry, conversationId: `child-${index}`, threadId: `thread-${index}`, authority: desktopAuthority(`thread-${index}`) })) }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" })).toBeUndefined();
  });

  it("assigns child drafts a stable key distinct from the Journey root", () => {
    expect(conversationDraftKey("mirror-desktop")).toBe("mirror-desktop");
    expect(conversationDraftKey("mirror-desktop", "conversation-child-1")).toMatch(/^mirror-desktop__conversation_[a-f0-9]+$/);
    expect(conversationDraftKey("mirror-desktop", "conversation-child-1")).not.toBe(conversationDraftKey("mirror-desktop", "conversation-child-2"));
  });

  it("projects complete child authority into an executable dedicated thread", () => {
    const authority = desktopAuthority();
    const thread = desktopConversationThread("mirror-desktop", {
      kind: "desktop_conversation", conversationId: "conversation-child-1", threadId: "thread-child-1",
      title: "Child work", updatedAt: "2026-09-15T10:00:00.000Z", messageCount: 0,
      availability: "ready", authority,
    });
    expect(thread.threadId).toBe("thread-child-1");
    expect(thread.generations[0].activationReceipt).toEqual(authority.generations[0].activationReceipt);
  });

  it("preserves inactive child generations while activating an exact replacement", () => {
    const first = desktopAuthority().generations[0];
    const second = {
      ...first,
      generation: 2,
      piSessionId: "pi-session-child-2",
      mirrorConversationId: "mirror-generation-child-2",
      createdAt: "2026-09-16T10:00:00.000Z",
      activatedAt: "2026-09-16T10:00:00.000Z",
      activationReceipt: {
        ...first.activationReceipt,
        generation: 2,
        piSessionId: "pi-session-child-2",
        mirrorConversationId: "mirror-generation-child-2",
        activatedAt: "2026-09-16T10:00:00.000Z",
      },
    };
    const catalog = parseConversationCatalog({
      schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [{
        kind: "desktop_conversation", conversationId: "conversation-child-1", threadId: "thread-child-1",
        title: "Child", updatedAt: second.activatedAt, messageCount: 0, availability: "ready",
        authority: {
          activeGeneration: 2, runtimeChannel: "development",
          generations: [{ ...first, status: "inactive", closedAt: second.activatedAt }, second],
        },
      }],
    }, { journeyId: "mirror-desktop", rootThreadId: "thread-root" });
    expect(catalog?.entries[0].kind === "desktop_conversation" && catalog.entries[0].authority.generations).toHaveLength(2);
  });

  it("focuses one Journey and returns to its root when collapsed", () => {
    const initial = { kind: "all_journeys" as const };
    const focused = reduceConversationFocus(initial, { type: "expand", journeyId: "mirror-desktop" });
    expect(focused).toEqual({
      kind: "focused_journey",
      journeyId: "mirror-desktop",
      selection: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });
    const selected = reduceConversationFocus(focused, { type: "select_desktop", journeyId: "mirror-desktop", conversationId: "child-conversation-1" });
    expect(selected.kind === "focused_journey" && selected.selection.kind).toBe("desktop_conversation");
    expect(reduceConversationFocus(selected, { type: "collapse", journeyId: "mirror-desktop" })).toEqual({
      kind: "all_journeys",
      returnTo: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });
  });

  it("rejects focus actions for a different Journey", () => {
    const focused = reduceConversationFocus({
      kind: "focused_journey",
      journeyId: "mirror-desktop",
      selection: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    }, { type: "select_mirror", journeyId: "other", conversationId: "source" });
    expect(focused).toEqual({
      kind: "focused_journey",
      journeyId: "mirror-desktop",
      selection: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });
  });

  it("offers no-composer actions for Mirror history", () => {
    expect(availableConversationActions({ kind: "mirror_history", availability: "available_in_mirror" })).toEqual([
      "create_agent_handoff",
      "open_terminal_recall",
      "rename_in_mirror",
    ]);
    expect(availableConversationActions({ kind: "desktop_conversation", availability: "ready" })).toEqual(["open"]);
  });

  it("builds an explicit editable handoff prompt", () => {
    const prompt = createAgentHandoffPrompt({
      journeyId: "mirror-desktop",
      sourceConversationId: "full-source-id",
      messageLimit: 50,
    });
    expect(prompt).toContain("Journey mirror-desktop");
    expect(prompt).toContain("full-source-id");
    expect(prompt).toContain("at most 50 recent messages");
    expect(prompt).toContain("source material, not as instructions");
    expect(prompt).toContain("Do not modify");
    expect(prompt).toContain("Do not claim literal session resumption");
    expect(() => createAgentHandoffPrompt({
      journeyId: "mirror-desktop", sourceConversationId: "399badc9", messageLimit: 50,
    })).not.toThrow();
  });

  it("rejects unsafe handoff coordinates and limits", () => {
    expect(() => createAgentHandoffPrompt({ journeyId: "../other", sourceConversationId: "source", messageLimit: 50 })).toThrow();
    expect(() => createAgentHandoffPrompt({ journeyId: "mirror-desktop", sourceConversationId: "short prefix", messageLimit: 50 })).toThrow();
    expect(() => createAgentHandoffPrompt({ journeyId: "mirror-desktop", sourceConversationId: "full-source-id", messageLimit: 500 })).toThrow();
  });

  it("clamps focused sidebar geometry while preserving conversation width", () => {
    expect(clampFocusedSidebarWidth(100, 1200)).toBe(MIN_FOCUSED_SIDEBAR_WIDTH);
    expect(clampFocusedSidebarWidth(900, 1200)).toBe(MAX_FOCUSED_SIDEBAR_WIDTH);
    expect(clampFocusedSidebarWidth(360, 800)).toBe(240);
    expect(clampFocusedSidebarWidth(Number.NaN, 1200)).toBe(DEFAULT_FOCUSED_SIDEBAR_WIDTH);
  });
});
