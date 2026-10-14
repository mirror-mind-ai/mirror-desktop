import { describe, expect, it } from "vitest";
import {
  createPersistedJourneyPreferences,
  defaultJourneyPreferenceState,
  mergeJourneyPreferenceState,
  parsePersistedJourneyPreferences,
  sanitizeJourneyPreferenceState,
} from "../domain/journeyPreferencePersistence";
import { fixtureJourneyRegistry } from "../fixtures/journeyRegistry";

describe("Journey preference persistence", () => {
  it("wraps non-secret Journey preferences in a versioned payload", () => {
    expect(
      createPersistedJourneyPreferences(
        {
          pinnedJourneyIds: ["nautilus"],
          activeJourneyId: "nautilus-harness",
          recentJourneyIds: ["amplia"],
          journeyListOrder: "tree",
          expandedConversationJourneyIds: [],
          hiddenConversationIdsByJourneyId: { nautilus: ["desktop_conversation:one"] },
          sidebarCompact: true,
          hideMirrorHistory: false,
          lastWorkedAtByJourneyId: { nautilus: "2026-08-23T09:00:00.000Z" },
          applicationTheme: "violet",
          journeyAppearanceById: { nautilus: { kind: "system", icon: "book" } },
          voiceLanguage: "auto",
          turnCompletionSound: true,
          turnCompletionToneId: "chime",
          lastConversationSelectionByJourneyId: {
            nautilus: { kind: "desktop_conversation", conversationId: "desktop-conversation-nautilus-1" },
          },
        },
        new Date("2026-08-23T10:00:00.000Z"),
      ),
    ).toEqual({
      schemaVersion: "0.1.0",
      preferences: {
        pinnedJourneyIds: ["nautilus"],
        activeJourneyId: "nautilus-harness",
        recentJourneyIds: ["amplia"],
        journeyListOrder: "tree",
        sidebarCompact: true,
        hideMirrorHistory: false,
        lastWorkedAtByJourneyId: { nautilus: "2026-08-23T09:00:00.000Z" },
        applicationTheme: "violet",
        journeyAppearanceById: { nautilus: { kind: "system", icon: "book" } },
        voiceLanguage: "auto",
        turnCompletionSound: true,
        turnCompletionToneId: "chime",
        expandedConversationJourneyIds: [],
        hiddenConversationIdsByJourneyId: { nautilus: ["desktop_conversation:one"] },
        lastConversationSelectionByJourneyId: {
          nautilus: { kind: "desktop_conversation", conversationId: "desktop-conversation-nautilus-1" },
        },
      },
      savedAt: "2026-08-23T10:00:00.000Z",
    });
  });

  it("migrates the removed A-Z order to Recent while preserving current orders", () => {
    expect(
      parsePersistedJourneyPreferences({
        schemaVersion: "0.1.0",
        preferences: {
          pinnedJourneyIds: ["nautilus"],
          activeJourneyId: "nautilus-harness",
          recentJourneyIds: ["amplia"],
          journeyListOrder: "name",
        },
        savedAt: "2026-08-23T10:00:00.000Z",
      })?.preferences.journeyListOrder,
    ).toBe("recent");
    const legacyPreferences = parsePersistedJourneyPreferences({
      schemaVersion: "0.1.0",
      preferences: {
        pinnedJourneyIds: [],
        recentJourneyIds: [],
        journeyListOrder: "tree",
      },
      savedAt: "2026-08-23T10:00:00.000Z",
    })?.preferences;
    expect(legacyPreferences?.journeyListOrder).toBe("tree");
    expect(legacyPreferences?.sidebarCompact).toBe(false);
    expect(legacyPreferences?.lastWorkedAtByJourneyId).toEqual({});
    expect(legacyPreferences?.applicationTheme).toBe("channel");
    expect(legacyPreferences?.journeyAppearanceById).toEqual({});
  });

  it("rejects malformed or unsupported preferences", () => {
    expect(parsePersistedJourneyPreferences({ schemaVersion: "9.9.9" })).toBeUndefined();
    expect(
      parsePersistedJourneyPreferences({
        schemaVersion: "0.1.0",
        preferences: {
          pinnedJourneyIds: ["nautilus"],
          recentJourneyIds: [],
          journeyListOrder: "unknown",
        },
        savedAt: "2026-08-23T10:00:00.000Z",
      }),
    ).toBeUndefined();
  });

  it("merges missing persisted preferences with safe defaults", () => {
    expect(mergeJourneyPreferenceState(undefined)).toEqual(defaultJourneyPreferenceState);
  });

  it("removes duplicate or missing Journey ids during sanitization", () => {
    expect(
      sanitizeJourneyPreferenceState(
        {
          pinnedJourneyIds: ["nautilus", "missing", "nautilus"],
          activeJourneyId: "missing",
          recentJourneyIds: ["amplia", "missing", "amplia", "mirror-dev"],
          journeyListOrder: "tree",
          expandedConversationJourneyIds: [],
          hiddenConversationIdsByJourneyId: {
            amplia: ["mirror_history:keep"],
            missing: ["desktop_conversation:gone"],
          },
          sidebarCompact: true,
          hideMirrorHistory: false,
          turnCompletionSound: true,
          turnCompletionToneId: "chime",
          lastWorkedAtByJourneyId: {
            amplia: "2026-08-23T09:00:00.000Z",
            missing: "2026-08-23T08:00:00.000Z",
          },
          applicationTheme: "ember",
          journeyAppearanceById: {
            amplia: { kind: "system", icon: "book" },
            missing: { kind: "custom" },
          },
          voiceLanguage: "pt",
          lastConversationSelectionByJourneyId: {
            amplia: { kind: "desktop_conversation", conversationId: "desktop-conversation-amplia-1" },
            missing: { kind: "mirror_history", conversationId: "mirror-gone" },
          },
        },
        fixtureJourneyRegistry,
      ),
    ).toEqual({
      pinnedJourneyIds: ["nautilus"],
      activeJourneyId: defaultJourneyPreferenceState.activeJourneyId,
      recentJourneyIds: ["amplia", "mirror-dev"],
      journeyListOrder: "tree",
      sidebarCompact: true,
      hideMirrorHistory: false,
      // CR151: survives sanitization for the same reason as the line above — it names a behaviour,
      // not a Journey, so pruning a departed Journey has nothing to prune here.
      turnCompletionSound: true,
      turnCompletionToneId: "chime",
      lastWorkedAtByJourneyId: { amplia: "2026-08-23T09:00:00.000Z" },
      applicationTheme: "ember",
      journeyAppearanceById: { amplia: { kind: "system", icon: "book" } },
      // Sanitization prunes missing Journeys; it must not reset unrelated settings.
      voiceLanguage: "pt",
      expandedConversationJourneyIds: [],
      // CR135: a departed Journey loses its hidden set, and a surviving one keeps its own.
      hiddenConversationIdsByJourneyId: { amplia: ["mirror_history:keep"] },
      // CR137, the same rule for where the Navigator last stood: a Journey that no longer exists
      // cannot be returned to, and pruning it must not disturb the Journey that does.
      lastConversationSelectionByJourneyId: {
        amplia: { kind: "desktop_conversation", conversationId: "desktop-conversation-amplia-1" },
      },
    });
  });
});
