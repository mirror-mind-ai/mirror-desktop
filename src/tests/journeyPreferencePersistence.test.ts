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
    expect(
      parsePersistedJourneyPreferences({
        schemaVersion: "0.1.0",
        preferences: {
          pinnedJourneyIds: [],
          recentJourneyIds: [],
          journeyListOrder: "tree",
        },
        savedAt: "2026-08-23T10:00:00.000Z",
      })?.preferences.journeyListOrder,
    ).toBe("tree");
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
        },
        fixtureJourneyRegistry,
      ),
    ).toEqual({
      pinnedJourneyIds: ["nautilus"],
      activeJourneyId: defaultJourneyPreferenceState.activeJourneyId,
      recentJourneyIds: ["amplia", "mirror-dev"],
      journeyListOrder: "tree",
    });
  });
});
