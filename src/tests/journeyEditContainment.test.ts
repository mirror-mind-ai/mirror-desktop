/**
 * CR130 kept Edit Journey to what Mirror accepted: no released Mirror could change a Journey's name
 * or description, so the form showed them read-only and saved only the project path. The rule
 * stands — offer only what Mirror accepts — and on the 0.3 line Mirror accepts more: core's
 * `updateJourney` (CV24.DS8, CV-010.DS-005 slice 4b) edits name, description and status. These
 * guards pin the form to that: each field is sent only when it changed, the Journey's `updatedAt`
 * travels with an edit so core can refuse a stale one, the slug stays read-only and says why, and a
 * Save that changed nothing writes nothing.
 */
import { describe, expect, it } from "vitest";
import { createMutationRequest, identityEditIntent, projectPathIntent } from "../domain/journeyMutation";
import type { JourneyRegistry } from "../domain/journeyRegistry";
import mutationSource from "../domain/journeyMutation.ts?raw";
import appSource from "../app/App.tsx?raw";
import bridgeSource from "../../src-tauri/src/mirror_host_bridge.rs?raw";

const registry: JourneyRegistry = {
  schemaVersion: "0.1.0",
  source: "mirror",
  syncedAt: "now",
  roots: [
    { id: "with-path", name: "With Path", description: "A Journey with a project folder.", status: "active", updatedAt: "2026-10-30T10:00:00.000000", projectPath: "/Users/nav/code/with-path" },
    { id: "without-path", name: "Without Path", updatedAt: "2026-10-30T11:00:00.000000" },
    { id: "hand-written", name: "Hand Written", status: "🚧 em curso", updatedAt: "2026-10-30T12:00:00.000000" },
    { id: "unstamped", name: "Unstamped" },
  ],
};

const fields = { name: "With Path", description: "A Journey with a project folder.", status: "active" };

function editBranch(): string {
  const start = appSource.indexOf('} else if (journeyAdminDialog.mode === "edit") {');
  const end = appSource.indexOf('} else if (journeyAdminDialog.mode === "move") {');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return appSource.slice(start, end);
}

describe("Slice 4b — Edit Journey saves what Mirror accepts", () => {
  it("sends only the fields that changed, with the Journey's updatedAt", () => {
    expect(identityEditIntent(registry, "with-path", { ...fields, name: "  Renamed  " })).toEqual({
      kind: "update",
      payload: { journeyId: "with-path", expectedUpdatedAt: "2026-10-30T10:00:00.000000", name: "Renamed" },
    });
    expect(identityEditIntent(registry, "with-path", { name: "Renamed", description: "A narrower purpose, said again.", status: "paused" })).toEqual({
      kind: "update",
      payload: { journeyId: "with-path", expectedUpdatedAt: "2026-10-30T10:00:00.000000", name: "Renamed", description: "A narrower purpose, said again.", status: "paused" },
    });
  });

  it("treats unchanged fields as nothing to write, including whitespace and absence", () => {
    expect(identityEditIntent(registry, "with-path", fields)).toEqual({ kind: "unchanged" });
    expect(identityEditIntent(registry, "with-path", { name: " With Path ", description: " A Journey with a project folder. ", status: "active" })).toEqual({ kind: "unchanged" });
    expect(identityEditIntent(registry, "without-path", { name: "Without Path", description: "", status: "" })).toEqual({ kind: "unchanged" });
  });

  it("leaves a status Mirror does not know as it is unless another is chosen", () => {
    expect(identityEditIntent(registry, "hand-written", { name: "Hand Written", description: "", status: "🚧 em curso" })).toEqual({ kind: "unchanged" });
    expect(identityEditIntent(registry, "hand-written", { name: "Hand Written", description: "", status: "archived" })).toEqual({ kind: "unchanged" });
    expect(identityEditIntent(registry, "hand-written", { name: "Hand Written", description: "", status: "completed" })).toMatchObject({
      kind: "update", payload: { status: "completed" },
    });
  });

  it("refuses to decide for a Journey the tree does not hold or did not stamp", () => {
    expect(() => identityEditIntent(registry, "vanished", fields)).toThrow(/no longer/i);
    expect(() => identityEditIntent(registry, "unstamped", { name: "Other", description: "", status: "" })).toThrow(/Reload Journeys/);
  });

  it("names the project path change as the operation it is, and an unchanged path as nothing", () => {
    expect(projectPathIntent(registry, "without-path", "/Users/nav/code/new")).toEqual({ kind: "set", projectPath: "/Users/nav/code/new" });
    expect(projectPathIntent(registry, "with-path", "")).toEqual({ kind: "clear" });
    expect(projectPathIntent(registry, "with-path", "  /Users/nav/code/with-path  ")).toEqual({ kind: "unchanged" });
    expect(projectPathIntent(registry, "without-path", "   ")).toEqual({ kind: "unchanged" });
    expect(() => projectPathIntent(registry, "vanished", "/anything")).toThrow(/no longer/i);
  });

  it("builds an edit request with no whole-tree version", () => {
    const request = createMutationRequest(registry, "update_journey", { journeyId: "with-path", expectedUpdatedAt: "t", name: "N" }, "edit-001");
    expect(request).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0",
      requestId: "edit-001",
      operation: "update_journey",
      payload: { journeyId: "with-path", expectedUpdatedAt: "t", name: "N" },
    });
    expect(mutationSource).not.toContain("expectedSourceVersion:");
  });

  it("sends the identity first, the path second, and nothing when neither changed", () => {
    const branch = editBranch();
    const identity = branch.indexOf('executeJourneyMutation("update_journey", identity.payload, intent.kind === "unchanged")');
    expect(identity).toBeGreaterThan(-1);
    expect(branch).toContain('if (!accepted || intent.kind === "unchanged") return;');
    expect(branch.indexOf('executeJourneyMutation("set_project_path"')).toBeGreaterThan(identity);
    expect(branch.indexOf('executeJourneyMutation("clear_project_path"')).toBeGreaterThan(identity);
    expect(branch).toContain('if (intent.kind === "unchanged") {');
    expect(branch).toContain("setJourneyAdminDialog(null)");
  });

  it("makes name, description and status editable, and keeps the slug read-only with the reason", () => {
    const editFields = appSource.slice(
      appSource.indexOf('{journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "edit" ? ('),
      appSource.indexOf('{journeyAdminDialog.mode === "edit" && journeyAdminDialog.journeyId ? ('),
    );
    expect(editFields).toContain("<label>Name<input value={journeyAdminName} onChange={(event) => setJourneyAdminName(event.target.value)} required maxLength={160} /></label>");
    expect(editFields).toContain("onChange={(event) => setJourneyAdminDescription(event.target.value)} required minLength={20} maxLength={4000}");
    expect(editFields).toContain("<label>Status<select value={journeyAdminStatus}");
    expect(editFields).toContain('<label>Slug<input value={journeyAdminSlug} readOnly aria-describedby="journey-uneditable-canonical" /></label>');
    expect(editFields).toContain("Its Conversations, memories and tasks are kept under it, so it cannot be changed here.");
    expect(appSource).not.toContain("Mirror has no canonical update operation");
  });

  it("answers a stale edit with the message the form reloads the tree on", () => {
    expect(bridgeSource).toContain('"journey_changed" => JOURNEY_STALE_MESSAGE');
  });
});
