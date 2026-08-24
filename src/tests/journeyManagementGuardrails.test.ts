import { describe, expect, it } from "vitest";
import { createPersistedJourneyPreferences } from "../domain/journeyPreferencePersistence";
import appSource from "../app/App.tsx?raw";
import importedActivitySource from "../app/ImportedActivity.tsx?raw";
import tauriMainSource from "../../src-tauri/src/main.rs?raw";
import mirrorImportScriptSource from "../../scripts/export_mirror_bootstrap.py?raw";

describe("Journey management guardrails", () => {
  it("persists only non-secret Journey UI preferences", () => {
    const persisted = createPersistedJourneyPreferences({
      pinnedJourneyIds: ["nautilus"],
      activeJourneyId: "nautilus-harness",
      recentJourneyIds: ["amplia"],
      journeyListOrder: "tree",
    });

    expect(Object.keys(persisted.preferences).sort()).toEqual([
      "activeJourneyId",
      "journeyListOrder",
      "pinnedJourneyIds",
      "recentJourneyIds",
    ]);
    expect(JSON.stringify(persisted).toLowerCase()).not.toMatch(/api[_-]?key|token|secret|password|env/);
  });

  it("keeps Mirror list and reload paths read-only except explicit title generation", () => {
    expect(mirrorImportScriptSource).toContain("read_only = not args.generate_conversation_title");
    expect(mirrorImportScriptSource).toContain("--list-conversations");
    expect(mirrorImportScriptSource).toContain("--conversation-id");
    expect(mirrorImportScriptSource).toContain("--generate-conversation-title");
    expect(mirrorImportScriptSource).toContain('uri = f"file:{args.db}?mode=ro" if read_only else str(args.db)');
  });

  it("keeps Journey reload scoped to a selected conversation without broad registry rewrite", () => {
    const selectedBranch = mirrorImportScriptSource.slice(
      mirrorImportScriptSource.indexOf("if args.conversation_id:"),
      mirrorImportScriptSource.indexOf("if args.journey_id:"),
    );

    expect(selectedBranch).toContain("load_selected_conversation");
    expect(selectedBranch).toContain("write_local_conversations");
    expect(selectedBranch).not.toContain("args.output.write_text");
    expect(selectedBranch).not.toContain("load_journeys");
  });

  it("keeps imported activity presentation inert", () => {
    expect(importedActivitySource).not.toContain("dangerouslySetInnerHTML");
    expect(importedActivitySource).not.toContain("invoke(");
  });

  it("constrains local reference opening to local allowed roots", () => {
    expect(tauriMainSource).toContain('path.starts_with("http://")');
    expect(tauriMainSource).toContain('path.starts_with("https://")');
    expect(tauriMainSource).toContain("path.contains('\\0')");
    expect(tauriMainSource).toContain("canonical_path.starts_with(&base_root)");
    expect(tauriMainSource).toContain("canonical_path.starts_with(&harness_root)");
  });

  it("does not invoke Pi from Journey selection or Mirror reload flows", () => {
    const selectJourney = appSource.slice(appSource.indexOf("function selectJourney"), appSource.indexOf("function togglePinnedJourney"));
    const mirrorPicker = appSource.slice(appSource.indexOf("async function openMirrorConversationPicker"), appSource.indexOf("function clearChatSession"));

    expect(selectJourney).not.toContain("generatePacket");
    expect(selectJourney).not.toContain("livePiAgentStream");
    expect(mirrorPicker).not.toContain("generatePacket");
    expect(mirrorPicker).not.toContain("livePiAgentStream");
  });
});
