import { describe, expect, it } from "vitest";
import {
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
