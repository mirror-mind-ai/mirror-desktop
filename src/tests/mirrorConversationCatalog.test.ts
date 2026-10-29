import { describe, expect, it } from "vitest";
import nativeSource from "../../src-tauri/src/main.rs?raw";
import bridgeSource from "../../src-tauri/src/mirror_host_bridge.rs?raw";
import stableConfig from "../../src-tauri/tauri.conf.json";

// CV-010.DS-005 slice 2d-2: the catalog script and its MemoryClient services retired with the Python
// core on the 0.3 line (they remain on release/0.2). The catalog is answered by the Mirror host, in
// the shape the script printed, with the exact-id and Journey checks the script made.
describe("Mirror conversation catalog on the 0.3 line", () => {
  it("is answered by the Mirror host with the script's exact-id and Journey checks", () => {
    expect(nativeSource).toContain("mirror_host_bridge::conversation_catalog(app, operation, journey_id, additional_args)");
    for (const method of ["listJourneyConversations", "inspectConversation", "renameConversation", "rebindConversationJourney"]) {
      expect(bridgeSource).toContain(`"${method}"`);
    }
    expect(bridgeSource).toContain('found.get("journeyId").and_then(Value::as_str) != Some(journey_id)');
    expect(bridgeSource).toContain("filter(|id| is_mirror_identifier(id))");
    expect(bridgeSource).toContain('"delete" => Err(not_carried("Deleting Conversations"))');
  });

  it("is no longer packaged, and runs no Python", () => {
    expect(JSON.stringify(stableConfig.bundle)).not.toContain(".py");
    expect(nativeSource).not.toContain("mirror_conversation_catalog.py");
    expect(nativeSource).not.toContain('"python"');
  });
});
