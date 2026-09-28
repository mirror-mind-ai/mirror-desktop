import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("context reading integration", () => {
  // CR079: the window is known from the live catalog long before anything measures the
  // Conversation, so it must reach the footer independently of the token count.
  it("hands the footer the window and the approximation separately from the usage", () => {
    expect(appSource).toContain("contextWindow={displayContextWindow}");
    expect(appSource).toContain("contextApproximate={!contextMeasuredBySelectedModel}");
  });

  it("scopes the cached reading to the Conversation, not to the measuring model", () => {
    expect(appSource).toContain("hasConversationContextStats(");
    // The identity gate itself must not consult the model; only the marker below may.
    const identity = appSource.slice(
      appSource.indexOf("const contextIdentityMatches"),
      appSource.indexOf("const contextMeasuredBySelectedModel"),
    );
    expect(identity).not.toContain("providerModel ===");
    expect(appSource).toContain("const contextMeasuredBySelectedModel");
  });

  // The measurement was previously thrown away whenever another model had produced it,
  // which is exactly the evidence needed to keep a number on screen after an Intent switch.
  it("stores an inspected snapshot even when another model produced it", () => {
    const effect = appSource.slice(
      appSource.indexOf("void readContextStatsWithBoundedRetry"),
      appSource.indexOf("useEffect(() => {", appSource.indexOf("void readContextStatsWithBoundedRetry")),
    );
    expect(effect).not.toContain('if (nextState !== "available" || !snapshot)');
    expect(effect).toContain("if (!snapshot)");
  });
});
