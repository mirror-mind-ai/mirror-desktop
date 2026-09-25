import { describe, expect, it } from "vitest";
import { deriveModelSelectionScope, unavailableModelReason } from "../domain/modelAvailability";

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

// CR090: choosing a model while a turn is alive is a preference for the next turn, and the
// interface has to say so rather than pretending the live turn changed.
describe("model selection scope", () => {
  it("applies now when no turn is running", () => {
    expect(deriveModelSelectionScope({ selectedProviderModel: "a/b" })).toBe("applies_now");
  });

  it("applies now when the running turn already uses the selection", () => {
    expect(deriveModelSelectionScope({
      liveRunProviderModel: "a/b",
      selectedProviderModel: "a/b",
    })).toBe("applies_now");
  });

  it("applies to the next message when the running turn uses a different model", () => {
    expect(deriveModelSelectionScope({
      liveRunProviderModel: "a/b",
      selectedProviderModel: "c/d",
    })).toBe("applies_to_next_message");
  });
});
