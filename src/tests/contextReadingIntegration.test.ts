import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";

describe("context reading integration", () => {
  // CR079: the window is known from the live catalog long before anything measures the
  // Conversation, so it must reach the footer independently of the token count.
  it("hands the footer the window and the approximation separately from the usage", () => {
    expect(appSource).toContain("contextWindow={displayContextWindow}");
    expect(appSource).toContain("contextApproximate={!contextMeasuredBySelectedModel}");
    // The cached-reading shortcut runs before inspection, so it must not relabel an estimate
    // as a measurement while it waits.
    expect(appSource).toContain('setPiContextState(cachedUsageIsEstimated ? "estimated" : "available")');
  });

  // Nothing rescheduled a read after the bounded retry gave up, which is why the reading
  // could stay absent indefinitely unless a turn happened to run.
  it("reschedules a bounded re-read while the reading has not settled", () => {
    expect(appSource).toContain("contextReadingNeedsRefresh(piContextState)");
    expect(appSource).toContain("CONTEXT_REFRESH_DELAYS_MS[contextRefreshAttempt]");
    expect(appSource).toContain("setContextRefreshEpoch((epoch) => epoch + 1)");
    // The attempt budget has to reset per Conversation, or a second Journey inherits an
    // exhausted one and never re-reads at all.
    expect(appSource).toContain("setContextRefreshAttempt(0)");
  });

  // The stale snapshot must never outrank the live catalog: it lists none of the models in
  // daily use, so a match there would be an accident rather than an authority.
  it("lets the live catalog lead and the static snapshot only follow", () => {
    const derivation = appSource.slice(
      appSource.indexOf("const configuredContextWindow"),
      appSource.indexOf("const displayContextWindow"),
    );
    expect(derivation).toContain("piModelCatalog.find(");
    expect(derivation.indexOf("piModelCatalog.find(")).toBeLessThan(derivation.indexOf("configuredModelContextWindow("));
    expect(derivation).toContain("?? configuredModelContextWindow(");
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
