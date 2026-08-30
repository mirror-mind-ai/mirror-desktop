import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/journeyRegistryStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";


describe("Journey registry refresh boundary", () => {
  it("uses one dedicated model-free Tauri command", () => {
    expect(storageSource).toContain('invoke<string>("refresh_journey_registry")');
    expect(tauriSource).toContain("fn refresh_journey_registry(app: AppHandle)");
    expect(tauriSource).toContain('"export-registry"');
    expect(tauriSource).toContain('"journey"');
    expect(tauriSource).toContain("mirror_administrative_command(\"uv\")");
    expect(tauriSource).toContain("detach_journey_turn_authority");
    expect(tauriSource).toContain("Could not refresh Journeys from Mirror: {detail}");
    expect(tauriSource).toContain("validate_journey_registry_payload");
    const refreshCommand = tauriSource.slice(
      tauriSource.indexOf("fn refresh_journey_registry"),
      tauriSource.indexOf("fn choose_project_directory"),
    );
    expect(refreshCommand).not.toContain("journey_registry_contains_id");
    expect(refreshCommand).not.toContain("--mirror-home");
    expect(tauriSource).toContain("fs::rename(&staged, &target)");
    expect(tauriSource).not.toContain("refresh_journey_registry_provider");
    expect(appSource).toContain("journeyAdministrationError(error)");
    expect(appSource).toContain('setJourneyRegistryRefreshMessage("Journey tree reloaded.")');
    expect(appSource).toContain('journeyRegistryRefreshState !== "succeeded"');
    expect(appSource).toContain("setJourneyRegistryRefreshMessage(undefined)");
    expect(appSource).toContain("window.clearTimeout(timeout)");
    expect(appSource).not.toContain("because the previous Journey is no longer available");
    expect(appSource).toContain("Mirror returned an empty Journey registry.");
  });
});
