import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/journeyConversationStorage.ts?raw";

describe("Pi-backed Conversation restore integration", () => {
  it("hydrates every inactive ready Conversation from exact Pi inspection without silent fallback", () => {
    expect(appSource).toContain("inspectDedicatedPiTranscript(");
    expect(appSource).toContain("projectPiBackedConversationSurface(restoredConversation, inspection)");
    expect(appSource).toContain("&& !restoreDecision.runtimeConversation");
    expect(appSource).not.toContain("loadDedicatedPiTranscript(");
    expect(appSource).not.toContain(".catch(() => [])");
    expect(appSource).toContain("const metadataBase = durableMetadata ?? baseConversation;");
    expect(appSource).toContain("baseConversation = projectPiBackedConversationSurface(metadataBase, inspection);");
    expect(appSource).toContain("Live invocation stopped because the Pi transcript could not be inspected");
  });

  it("preserves the exact in-memory runtime overlay while native streaming is active", () => {
    expect(appSource).toContain("restoreDecision.runtimeConversation ??");
    expect(appSource).toContain("&& !restoreDecision.runtimeConversation");
  });

  it("loads complete projection metadata without treating a current Segment as transcript", () => {
    const restorePath = appSource.slice(
      appSource.indexOf("async function restoreConversation()"),
      appSource.indexOf("void restoreConversation();"),
    );
    expect(restorePath).not.toContain("loadConversationSegments(");
    expect(storageSource).not.toContain("loadCurrentConversationSegmentProjection");
    expect(storageSource).not.toContain("partitionConversationBySegments");
    expect(storageSource).not.toContain("publishConversationSegmentProjections");
    expect(appSource).not.toContain("loadCompleteConversationSegmentHistory");
    expect(storageSource).toContain('invoke<string | null>("load_dedicated_journey_conversation"');
  });
});
