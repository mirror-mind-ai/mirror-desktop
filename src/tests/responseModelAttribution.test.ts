import { describe, expect, it } from "vitest";
import { projectResponseModelBadges } from "../app/responseModelAttribution";

const opus = { provider: "claude-bridge", model: "claude-opus-5" };
const everyday = { provider: "openai-codex", model: "gpt-5.5" };

function messages(...ids: string[]) {
  return ids.map((id) => ({ id, role: id.startsWith("u") ? "user" as const : "assistant" as const }));
}

describe("response model attribution", () => {
  // CR091, the hybrid the Navigator chose: always present so any answer can be checked,
  // emphasized only where the model actually changed.
  it("emphasizes the first attributed answer and every later change", () => {
    const badges = projectResponseModelBadges({
      messages: messages("u1", "a1", "u2", "a2", "u3", "a3"),
      responseModels: { a1: opus, a2: opus, a3: everyday },
    });
    expect(badges.a1).toEqual({ label: "claude-bridge/claude-opus-5", changed: true });
    expect(badges.a2).toEqual({ label: "claude-bridge/claude-opus-5", changed: false });
    expect(badges.a3).toEqual({ label: "openai-codex/gpt-5.5", changed: true });
  });

  it("compares against the previous attributed answer, skipping unattributed ones", () => {
    const badges = projectResponseModelBadges({
      messages: messages("u1", "a1", "u2", "a2", "u3", "a3"),
      responseModels: { a1: opus, a3: opus },
    });
    expect(badges.a2).toBeUndefined();
    // a3 matches a1, so nothing changed even though an unattributed answer sits between them.
    expect(badges.a3).toEqual({ label: "claude-bridge/claude-opus-5", changed: false });
  });

  it("offers nothing for an answer neither Pi nor the live run attributed", () => {
    expect(projectResponseModelBadges({ messages: messages("u1", "a1") })).toEqual({});
  });

  // A turn that just finished is not in the Pi session the surface last read, so the model
  // captured on the run (CR090) covers it without persisting anything.
  it("falls back to the live run's model for the answer Pi has not recorded yet", () => {
    const badges = projectResponseModelBadges({
      messages: messages("u1", "a1", "u2", "a2"),
      responseModels: { a1: opus },
      liveAttribution: { messageId: "a2", label: "openai-codex/gpt-5.5" },
    });
    expect(badges.a2).toEqual({ label: "openai-codex/gpt-5.5", changed: true });
  });

  it("lets Pi's own record win over the live fallback for the same answer", () => {
    const badges = projectResponseModelBadges({
      messages: messages("u1", "a1"),
      responseModels: { a1: opus },
      liveAttribution: { messageId: "a1", label: "openai-codex/gpt-5.5" },
    });
    expect(badges.a1.label).toBe("claude-bridge/claude-opus-5");
  });

  it("never attributes a user message", () => {
    const badges = projectResponseModelBadges({
      messages: messages("u1", "a1"),
      responseModels: { u1: opus, a1: everyday },
    });
    expect(badges.u1).toBeUndefined();
    expect(badges.a1.label).toBe("openai-codex/gpt-5.5");
  });
});
