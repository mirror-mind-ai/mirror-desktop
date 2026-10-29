import { describe, expect, it } from "vitest";
import { createPersistedJourneyPreferences } from "../domain/journeyPreferencePersistence";
import appSource from "../app/App.tsx?raw";
import importedActivitySource from "../app/ImportedActivity.tsx?raw";
import tauriMainSource from "../../src-tauri/src/main.rs?raw";

describe("Journey management guardrails", () => {
  it("persists only non-secret Journey UI preferences", () => {
    const persisted = createPersistedJourneyPreferences({
      pinnedJourneyIds: ["nautilus"],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: ["amplia"],
      journeyListOrder: "tree",
      expandedConversationJourneyIds: [],
      hiddenConversationIdsByJourneyId: { nautilus: ["desktop_conversation:abc"] },
      sidebarCompact: true,
      hideMirrorHistory: false,
      turnCompletionSound: true,
      turnCompletionToneId: "chime",
      lastWorkedAtByJourneyId: { nautilus: "2026-09-02T15:00:00.000Z" },
      applicationTheme: "tide",
      journeyAppearanceById: { nautilus: { kind: "custom" } },
      voiceLanguage: "auto",
      // CR137: a conversation coordinate is navigation state, and this test is the declaration
      // point for anything the preference file is allowed to carry.
      lastConversationSelectionByJourneyId: {
        nautilus: { kind: "desktop_conversation", conversationId: "desktop-conversation-nautilus-1" },
      },
    });

    expect(Object.keys(persisted.preferences).sort()).toEqual([
      "activeJourneyId",
      "applicationTheme",
      "expandedConversationJourneyIds",
      "hiddenConversationIdsByJourneyId",
      "hideMirrorHistory",
      "journeyAppearanceById",
      "journeyListOrder",
      "lastConversationSelectionByJourneyId",
      "lastWorkedAtByJourneyId",
      "pinnedJourneyIds",
      "recentJourneyIds",
      "sidebarCompact",
      "turnCompletionSound",
      "turnCompletionToneId",
      "voiceLanguage",
    ]);
    expect(JSON.stringify(persisted).toLowerCase()).not.toMatch(/api[_-]?key|token|secret|password|env/);
  });

  it("retires legacy Harness projections without exposing continuity commands", () => {
    expect(tauriMainSource).toContain("fn retire_legacy_parity_state_at");
    expect(tauriMainSource).toContain('join("journey-conversations")');
    expect(tauriMainSource).toContain("superseded_by_dedicated_thread");
    expect(tauriMainSource).not.toContain("fn reload_journey_from_mirror");
    expect(tauriMainSource).not.toContain("fn inspect_external_pi_activity");
  });

  it("keeps imported activity presentation inert", () => {
    expect(importedActivitySource).not.toContain("dangerouslySetInnerHTML");
    expect(importedActivitySource).not.toContain("invoke(");
  });

  it("opens deliberate local references without treating URLs or null paths as files", () => {
    expect(tauriMainSource).toContain('path.starts_with("http://")');
    expect(tauriMainSource).toContain('path.starts_with("https://")');
    expect(tauriMainSource).toContain("path.contains('\\0')");
    expect(tauriMainSource).toContain("let canonical_path = resolved_path");
    expect(tauriMainSource).not.toContain("Local reference is outside the allowed workspace roots.");
  });

  it("does not invoke Pi from Journey selection or restart lifecycle", () => {
    const selectJourney = appSource.slice(appSource.indexOf("function selectJourney"), appSource.indexOf("function togglePinnedJourney"));
    const restartFlow = appSource.slice(appSource.indexOf("function requestConversationRestart"), appSource.indexOf("function applyProviderConfiguration"));

    expect(selectJourney).not.toContain("generatePacket");
    expect(selectJourney).not.toContain("livePiAgentStream");
    expect(restartFlow).not.toContain("generatePacket");
    expect(restartFlow).not.toContain("livePiAgentStream");
    expect(appSource).not.toContain("openMirrorConversationPicker");
  });
});
