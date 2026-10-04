import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

/**
 * CR046 settled that Conversation Segments are presentation pagination: they may select what is
 * rendered, but they cannot define counts, completion, admission, settlement or delivery. CR114
 * makes the loaded working set smaller than the generation for the first time, so that boundary
 * stops being theoretical — these are the places where a bounded surface must not be mistaken for
 * the Conversation.
 */
describe("authority does not depend on what is loaded", () => {
  function body(name: string): string {
    const start = appSource.indexOf(`async function ${name}(`);
    expect(start).toBeGreaterThan(-1);
    return appSource.slice(start, appSource.indexOf("\n  }", start));
  }

  it("settles a turn from durable metadata rather than from the surface", () => {
    const settlement = body("loadActiveSettlementEvidence");
    expect(settlement).toContain("loadDedicatedJourneyConversation(");
    expect(settlement).not.toContain("conversationRef.current");
    expect(settlement).not.toContain("loadedHistoryScopeRef");
  });

  it("recovers delivery from durable metadata for the exact coordinates", () => {
    const deps = appSource.slice(
      appSource.indexOf("const convergenceDeps = {"),
      appSource.indexOf("async function refreshTurnJournalEvidence"),
    );
    expect(deps).toContain("loadProjectionByCoords");
    expect(deps).toContain("loadDedicatedJourneyConversation(");
    expect(deps).not.toContain("loadedHistoryScopeRef");
  });

  it("verifies terminal evidence against the complete branch, never a window", () => {
    // A run's terminal evidence is proved by the leaf advancing past the pre-invocation leaf, so
    // this reading must keep seeing the whole branch regardless of what the Navigator has open.
    const deps = appSource.slice(
      appSource.indexOf("const convergenceDeps = {"),
      appSource.indexOf("async function refreshTurnJournalEvidence"),
    );
    const inspect = deps.slice(deps.indexOf("inspectTranscript:"));
    expect(inspect).toContain("inspectDedicatedPiTranscript(journeyId, threadId, generation, piSessionId, piSessionFile, true)");
    expect(inspect).not.toContain("current_segment");
  });

  it("counts the Conversation from the published Segment total, not from loaded messages", () => {
    const lifecycle = body("saveProjectedTurnLifecycle");
    expect(lifecycle).toContain("let catalogMessageCount = projection.messages.length;");
    // CR119 times the publish; the count still comes from its result and nothing else.
    expect(lifecycle).toContain('catalogMessageCount = await timed("publish_segments", () => publishConversationSegmentProjections(');
    expect(lifecycle).not.toContain("conversationRef.current");
  });

  it("keeps the Segment receipt as the authority for the Conversation total", () => {
    expect(tauriSource).toContain('"historicalMessageCount": historical_message_count');
    expect(tauriSource).toContain('"totalMessageCount": total_message_count');
    expect(tauriSource).toContain("Ok(total_message_count)");
  });

  it("admits a turn from the staged send base, which is reprojected at the loaded extent", () => {
    // Admission stages onto the same extent the Navigator is looking at. What makes that safe is
    // that the staging base is rebuilt from Pi and from durable metadata on every Send, not that
    // it happens to be complete.
    expect(appSource).toContain("const durableMetadata = await loadDedicatedJourneyConversation(");
    expect(appSource).toContain("const metadataBase = durableMetadata ?? baseConversation;");
    expect(appSource).toContain("baseConversation = projectPiBackedConversationSurface(metadataBase, inspection);");
  });

  it("writes durable history through the seam that preserves what the window omitted", () => {
    expect(appSource).not.toContain("JSON.stringify(createPersistedJourneyConversation(");
    const storage = appSource.includes("preserveDurableConversationHistory");
    // The seam belongs to the storage module, so App must not reimplement or bypass it.
    expect(storage).toBe(false);
  });
});
