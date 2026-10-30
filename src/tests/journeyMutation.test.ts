import { describe, expect, it } from "vitest";
import { appendJourneyPosition, createMutationRequest, journeyAdministrationError, replacementJourneyAfterDeletion, suggestJourneySlug } from "../domain/journeyMutation";
import type { JourneyRegistry } from "../domain/journeyRegistry";
import appSource from "../app/App.tsx?raw";
import itemMenuSource from "../app/JourneyItemContextMenu.tsx?raw";
import storageSource from "../app/journeyMutationStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

// The 0.3 tree: no whole-tree `sourceVersion`, which only Python's retired `journey mutate` read.
const registry: JourneyRegistry = {
  schemaVersion: "0.1.0", source: "mirror", syncedAt: "now", roots: [],
};

describe("Journey administration boundary", () => {
  // Slice 4b: a request is built from Mirror's tree, never from a fixture, and carries no
  // whole-tree version; an edit carries its Journey's `updatedAt` in its payload instead.
  it("builds exact requests from Mirror's tree and refuses a fixture", () => {
    expect(createMutationRequest(registry, "move_journey", { journeyId: "one", parentId: null, position: 0 }, "request-001")).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0", requestId: "request-001",
      operation: "move_journey", payload: { journeyId: "one", parentId: null, position: 0 },
    });
    expect(() => createMutationRequest({ ...registry, source: "fixture" }, "clear_project_path", {})).toThrow(/Reload Journeys/);
  });

  /**
   * Re-aimed by CR130. This asserted that the Desktop builds a canonical metadata update carrying a
   * name and description. It was written to prove the payload excluded mutable identity fields, but
   * what it pinned was a request Mirror rejects with `unsupported_operation` and always did. The
   * surviving intent — that a canonical path change carries exactly the journey it names and nothing
   * else — is asserted against the operation core actually accepts.
   */
  it("builds one exact canonical path update without mutable identity fields", () => {
    expect(createMutationRequest(registry, "set_project_path", {
      journeyId: "one",
      projectPath: "/Users/nav/code/one",
    }, "update-request-001")).toMatchObject({
      operation: "set_project_path",
      payload: {
        journeyId: "one",
        projectPath: "/Users/nav/code/one",
      },
    });
  });

  it("builds a delete request from exact registry authority", () => {
    expect(createMutationRequest(registry, "delete_journey", { journeyId: "empty-leaf" }, "delete-request-001")).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0", requestId: "delete-request-001", operation: "delete_journey", payload: { journeyId: "empty-leaf" },
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

  it("appends new Journeys without asking for a zero-based sibling position", () => {
    const nested: JourneyRegistry = {
      ...registry,
      roots: [
        { id: "vida-tecnica", name: "Vida Técnica", children: [{ id: "existing", name: "Existing", parentId: "vida-tecnica" }] },
        { id: "other", name: "Other" },
      ],
    };
    expect(appendJourneyPosition(nested, "vida-tecnica")).toBe(1);
    expect(appendJourneyPosition(nested, "")).toBe(2);
    expect(() => appendJourneyPosition(nested, "missing")).toThrow(/parent/i);
    expect(appSource).toContain('position: appendJourneyPosition(journeyRegistry, journeyAdminParent)');
    expect(appSource).toContain('journeyAdminDialog.mode === "move" ? (');
  });

  it("preserves native administration errors for the Navigator", () => {
    expect(journeyAdministrationError("Mirror rejected the Journey mutation.")).toBe("Mirror rejected the Journey mutation.");
    expect(journeyAdministrationError(new Error("Reload Journeys."))).toBe("Reload Journeys.");
  });

  it("keeps mutation model-free and publishes only verified Mirror output", () => {
    expect(storageSource).toContain('invoke<string>("mutate_journey_registry"');
    // Slice 4b: `journey mutate` retired with the Python core (phase 2, decision 3); the 0.3 line
    // administers Journeys through the Mirror host's core calls and publishes the tree they answer.
    const mutationCommand = tauriSource.slice(
      tauriSource.indexOf("fn mutate_journey_registry"),
      tauriSource.indexOf("fn load_journey_registry"),
    );
    expect(mutationCommand).toContain("mirror_host_bridge::journey_call(&request)?");
    expect(mutationCommand).toContain("mirror_host_bridge::request_journey(&app, method, call)?");
    expect(mutationCommand).toContain("publish_refreshed_journey_registry(&state_dir, &registry)?");
    expect(mutationCommand).not.toMatch(/"mutate"|"uv"|not_carried/);
    expect(tauriSource).toContain("publish_refreshed_journey_registry");
    expect(tauriSource).not.toContain("mutate_journey_registry_provider");
  });

  it("offers root and item-scoped creation with keyboard context parity", () => {
    expect(appSource).toContain("Create Journey…");
    expect(appSource).toContain("onCreate={openCreateJourney}");
    expect(appSource).toContain('event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")');
    expect(appSource).toContain('setJourneyAdminParent(parentId)');
    expect(appSource).toContain('draggable={journeyListOrder === "tree" && !runtimeBusy}');
  });

  it("offers one prefilled Edit Journey form while keeping identity and hierarchy immutable", () => {
    expect(itemMenuSource).toContain("Edit Journey…");
    expect(appSource).toContain("onEdit={openEditJourney}");
    expect(appSource).toContain('journeyAdminDialog.mode === "edit"');
    // Re-aimed by CR130, then by slice 4b: the form submits the operations core accepts, now the
    // identity edit too, and names the one field it cannot change instead of offering it.
    expect(appSource).toContain('executeJourneyMutation("update_journey"');
    expect(appSource).toContain('executeJourneyMutation("set_project_path"');
    expect(appSource).toContain('executeJourneyMutation("clear_project_path"');
    expect(appSource).toContain("The slug is this Journey's id in Mirror.");
  });

  it("extends Edit Journey with device-local appearance without adding canonical fields", () => {
    expect(appSource).toContain("Journey appearance");
    expect(appSource).toContain("Applied immediately on this device");
    expect(appSource).toContain("journeySystemIcons.map");
    expect(appSource).toContain("chooseJourneyCustomAppearance");
    expect(appSource).toContain("Canonical Mirror metadata remains unchanged");
    // Re-aimed by CR130: same intent, same region, anchored on the submission that replaced the one
    // Mirror refused. Device-local appearance must never enter a canonical payload.
    const canonicalPayload = appSource.slice(
      appSource.indexOf('} else if (journeyAdminDialog.mode === "edit") {'),
      appSource.indexOf('} else if (journeyAdminDialog.mode === "move")'),
    );
    expect(canonicalPayload).not.toContain("journeyAppearanceById");
  });

  it("keeps mutation failures inside the open administration form", () => {
    const mutationFlow = appSource.slice(
      appSource.indexOf("async function executeJourneyMutation"),
      appSource.indexOf("async function submitJourneyAdministration"),
    );
    expect(mutationFlow).toContain("setJourneyAdminMessage(message)");
    expect(mutationFlow).not.toContain('setJourneyRegistryRefreshState("failed")');
    expect(mutationFlow).not.toContain("setJourneyRegistryRefreshMessage(message)");
  });

  it("offers guarded destructive deletion for leaves and replaces active selection safely", () => {
    expect(itemMenuSource).toContain("Delete Journey…");
    expect(appSource).toContain('role={journeyAdminDialog.mode === "delete" ? "alertdialog" : "dialog"}');
    expect(appSource).toContain('deleteDisabled={(findJourneyById(journeyRegistry, journeyItemMenu.journeyId)?.children?.length ?? 0) > 0}');
    expect(appSource).not.toContain('journeyItemMenu.journeyId === selectedJourney ? "The active Journey cannot be deleted."');
    expect(appSource).toContain('executeJourneyMutation("delete_journey"');
    expect(appSource).toContain('replacementJourneyAfterDeletion(journeyRegistry, deletedJourneyId)');
    expect(tauriSource).toContain('replacement_journey_id');
    expect(tauriSource).toContain('dedicated-journey-conversations');
  });
});
