import { describe, expect, it } from "vitest";
import { createMutationRequest, replacementJourneyAfterDeletion, suggestJourneySlug } from "../domain/journeyMutation";
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

  it("builds a delete request from exact registry authority", () => {
    expect(createMutationRequest(registry, "delete_journey", { journeyId: "empty-leaf" }, "delete-request-001")).toMatchObject({
      operation: "delete_journey", expectedSourceVersion: "a".repeat(64), payload: { journeyId: "empty-leaf" },
    });
  });

  it("chooses a deterministic replacement when deleting the active Journey", () => {
    const nested: JourneyRegistry = {
      ...registry,
      roots: [{ id: "root", name: "Root", children: [{ id: "active", name: "Active", parentId: "root" }] }, { id: "other", name: "Other" }],
    };
    expect(replacementJourneyAfterDeletion(nested, "active")).toBe("root");
    expect(replacementJourneyAfterDeletion(nested, "root")).toBe("active");
    expect(replacementJourneyAfterDeletion({ ...registry, roots: [{ id: "only", name: "Only" }] }, "only")).toBeUndefined();
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

  it("offers guarded destructive deletion for leaves and replaces active selection safely", () => {
    expect(appSource).toContain("Delete Journey…");
    expect(appSource).toContain('role={journeyAdminDialog.mode === "delete" ? "alertdialog" : "dialog"}');
    expect(appSource).toContain('(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0');
    expect(appSource).not.toContain('journeyItemMenu.journeyId === selectedJourney ? "The active Journey cannot be deleted."');
    expect(appSource).toContain('executeJourneyMutation("delete_journey"');
    expect(appSource).toContain('replacementJourneyAfterDeletion(journeyRegistry, deletedJourneyId)');
    expect(tauriSource).toContain('replacement_journey_id');
    expect(tauriSource).toContain('dedicated-journey-conversations');
    expect(tauriSource).toContain('journey_not_empty:');
  });
});
