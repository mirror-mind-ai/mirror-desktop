import { describe, expect, it } from "vitest";
import { createMutationRequest, suggestJourneySlug } from "../domain/journeyMutation";
import type { JourneyRegistry } from "../domain/journeyRegistry";
import appSource from "../app/App.tsx?raw";
import storageSource from "../app/journeyMutationStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

const registry: JourneyRegistry = {
  schemaVersion: "0.2.0", source: "mirror", sourceVersion: "a".repeat(64), syncedAt: "now", roots: [],
};

describe("Journey administration boundary", () => {
  it("builds exact versioned requests and rejects legacy projections", () => {
    expect(createMutationRequest(registry, "move_journey", { journeyId: "one", parentId: null, position: 0 }, "request-001")).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0", requestId: "request-001", expectedSourceVersion: "a".repeat(64),
      operation: "move_journey", payload: { journeyId: "one", parentId: null, position: 0 },
    });
    expect(() => createMutationRequest({ ...registry, schemaVersion: "0.1.0", sourceVersion: undefined }, "clear_project_path", {})).toThrow(/Reload Journeys/);
  });

  it("suggests editable deterministic slugs", () => {
    expect(suggestJourneySlug("Criação de Jornadas! ")).toBe("criacao-de-jornadas");
  });

  it("keeps mutation model-free and publishes only verified Mirror output", () => {
    expect(storageSource).toContain('invoke<string>("mutate_journey_registry"');
    expect(tauriSource).toContain('"memory", "journey", "mutate"');
    expect(tauriSource).toContain("publish_refreshed_journey_registry");
    expect(tauriSource).not.toContain("mutate_journey_registry_provider");
  });

  it("offers root and item-scoped creation with keyboard context parity", () => {
    expect(appSource).toContain("Create Journey…");
    expect(appSource).toContain("openCreateJourney(journeyItemMenu.journeyId)");
    expect(appSource).toContain('journeyListOrder === "tree" && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))');
    expect(appSource).toContain('setJourneyAdminParent(parentId)');
    expect(appSource).toContain('draggable={journeyListOrder === "tree" && !isStreaming}');
  });
});
