import { describe, expect, it } from "vitest";
import storageSource from "../app/journeyRegistryStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";


describe("Journey registry refresh boundary", () => {
  it("uses one dedicated model-free Tauri command", () => {
    expect(storageSource).toContain('invoke<string>("refresh_journey_registry", { activeJourneyId })');
    expect(tauriSource).toContain("fn refresh_journey_registry(app: AppHandle, active_journey_id: String)");
    expect(tauriSource).toContain('["run", "python", "-m", "memory", "journey", "export-registry", "--mirror-home"]');
    expect(tauriSource).toContain("production_mirror_home()");
    expect(tauriSource).toContain("validate_journey_registry_payload");
    expect(tauriSource).toContain("fs::rename(&staged, &target)");
    expect(tauriSource).not.toContain("refresh_journey_registry_provider");
  });
});
