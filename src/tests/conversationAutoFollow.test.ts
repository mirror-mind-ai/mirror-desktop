import { describe, expect, it } from "vitest";
import {
  deriveConversationRecenterState,
  isConversationNearBottom,
  nextConversationAutoFollow,
} from "../app/conversationAutoFollow";

const viewport = (distanceFromBottom: number) => ({
  scrollTop: 1000 - distanceFromBottom,
  clientHeight: 500,
  scrollHeight: 1500,
});

describe("conversation auto-follow", () => {
  it("treats the bottom tolerance as following the latest content", () => {
    expect(isConversationNearBottom(viewport(0))).toBe(true);
    expect(isConversationNearBottom(viewport(48))).toBe(true);
    expect(isConversationNearBottom(viewport(49))).toBe(false);
  });

  it("suspends on user departure and resumes when the user returns", () => {
    expect(nextConversationAutoFollow(true, { type: "scroll", metrics: viewport(120) })).toBe(false);
    expect(nextConversationAutoFollow(false, { type: "scroll", metrics: viewport(10) })).toBe(true);
  });

  it("preserves user intent across content updates", () => {
    expect(nextConversationAutoFollow(false, { type: "content_updated" })).toBe(false);
    expect(nextConversationAutoFollow(true, { type: "content_updated" })).toBe(true);
  });

  it("follows after explicit bottom actions and Journey changes", () => {
    expect(nextConversationAutoFollow(false, { type: "explicit_bottom" })).toBe(true);
    expect(nextConversationAutoFollow(false, { type: "journey_changed" })).toBe(true);
  });
});

// CR092: the recenter control floats over the Conversation instead of sitting in the header, so
// presence is the signal. It exists only while the surface is readable and away from its end;
// CR084's emphasis state existed to substitute for a presence the header could not offer.
describe("conversation recenter control", () => {
  const state = (overrides: Partial<Parameters<typeof deriveConversationRecenterState>[0]> = {}) =>
    deriveConversationRecenterState({
      surfaceReady: true,
      messageCount: 3,
      awayFromEnd: false,
      ...overrides,
    });

  it("stays absent while the latest turn is already in view", () => {
    expect(state()).toEqual({ visible: false });
  });

  it("appears once the reader has left the end", () => {
    expect(state({ awayFromEnd: true })).toEqual({ visible: true });
  });

  it("offers nothing without a readable Conversation", () => {
    expect(state({ messageCount: 0, awayFromEnd: true })).toEqual({ visible: false });
    expect(state({ surfaceReady: false, awayFromEnd: true })).toEqual({ visible: false });
  });

  it("retires the emphasis state, since presence is now the signal", () => {
    expect(state({ awayFromEnd: true })).not.toHaveProperty("emphasized");
    expect(state()).not.toHaveProperty("available");
  });
});
