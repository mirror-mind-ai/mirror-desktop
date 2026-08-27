import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import conversationStorageSource from "../app/journeyConversationStorage.ts?raw";
import threadStorageSource from "../app/journeyThreadStorage.ts?raw";
import piProcessSource from "../agent/piProcessStream.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";
import bootstrapSource from "../../scripts/export_mirror_bootstrap.py?raw";

const obsoleteSymbols = [
  "openMirrorConversationPicker",
  "reloadJourneyFromMirror",
  "inspectExternalPiActivity",
  "reconcileMirrorConversation",
  "projectExternalPiInspection",
  "projectMirrorConversationInspection",
];

const obsoleteCommands = [
  "reload_journey_from_mirror",
  "reconcile_mirror_conversation",
  "inspect_external_pi_activity",
  "hydrate_pi_session_from_local_conversation",
  "reset_pi_session",
  "save_journey_conversation",
  "load_journey_conversation",
];

describe("legacy parity removal", () => {
  it("removes obsolete continuity surfaces rather than hiding them", () => {
    for (const symbol of obsoleteSymbols) expect(appSource).not.toContain(symbol);
    expect(appSource).not.toContain("Select Mirror conversation");
    expect(appSource).not.toContain("ConversationAuthorityNotice");
    expect(appSource).toContain("Recording the completed turn");
    expect(appSource).not.toContain("active Pi/Mirror pair settles");
  });

  it("removes obsolete TypeScript persistence and process APIs", () => {
    expect(conversationStorageSource).not.toContain("saveJourneyConversation");
    expect(conversationStorageSource).not.toContain("listMirrorConversations");
    expect(piProcessSource).not.toContain("inspectExternalPiActivity");
    expect(piProcessSource).not.toContain("hydrateJourneyPiSession");
  });

  it("unregisters and deletes obsolete native commands", () => {
    for (const command of obsoleteCommands) expect(tauriSource).not.toMatch(new RegExp(`\\bfn ${command}\\(`));
    expect(tauriSource).toContain("retire_legacy_parity_state");
  });

  it("keeps bootstrap registry-only and invokes bounded retirement", () => {
    expect(bootstrapSource).not.toContain("conversationsByJourneyId");
    expect(bootstrapSource).not.toContain("write_local_conversations");
    expect(threadStorageSource).toContain('invoke<LegacyParityRetirementSummary>("retire_legacy_parity_state")');
    expect(appSource).toContain("retireLegacyParityState()");
  });
});
