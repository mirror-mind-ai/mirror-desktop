import { describe, expect, it } from "vitest";
import { unavailableModelReason } from "../domain/modelAvailability";

const catalog = [
  { provider: "anthropic", model: "claude-opus-4-7", available: true },
  { provider: "claude-bridge", model: "claude-opus-5", available: false },
];

describe("model availability", () => {
  it("names the reason for a catalog model the invocation cannot resolve", () => {
    const reason = unavailableModelReason(catalog, { provider: "claude-bridge", model: "claude-opus-5" });
    expect(reason).toContain("claude-bridge/claude-opus-5");
    expect(reason).toContain("Pi extension that Mirror Desktop could not load");
  });

  it("keeps available models untouched", () => {
    expect(unavailableModelReason(catalog, { provider: "anthropic", model: "claude-opus-4-7" })).toBeUndefined();
  });

  it("passes models unknown to the catalog through to Pi", () => {
    expect(unavailableModelReason(catalog, { provider: "openrouter", model: "~custom/alias" })).toBeUndefined();
    expect(unavailableModelReason([], { provider: "claude-bridge", model: "claude-opus-5" })).toBeUndefined();
  });
});
