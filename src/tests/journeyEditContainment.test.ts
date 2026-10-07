/**
 * CR130: the Edit Journey dialog submitted `update_journey`, an operation Mirror's `journey mutate`
 * contract does not accept, so Save changes could never succeed. These guards pin the containment:
 * the Desktop submits only operations core accepts, the project path is made to work through the two
 * that exist, name and description are shown without being offered as savable, and a form that
 * changed nothing writes nothing.
 *
 * The containment is deliberately not a repair. Mirror core can update a title through
 * `JourneyService.update_identity_fields`, but only via its web server, bypassing the
 * `expectedSourceVersion` digest and the receipt ledger that every Desktop mutation rides. Reaching
 * around the contract would create a second authority over the same rows. The upstream ask is
 * recorded as CR100.
 */
import { describe, expect, it } from "vitest";
import { createMutationRequest, projectPathIntent } from "../domain/journeyMutation";
import type { JourneyRegistry } from "../domain/journeyRegistry";
import mutationSource from "../domain/journeyMutation.ts?raw";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

const registry: JourneyRegistry = {
  schemaVersion: "0.2.0",
  source: "mirror",
  sourceVersion: "b".repeat(64),
  syncedAt: "now",
  roots: [
    { id: "with-path", name: "With Path", projectPath: "/Users/nav/code/with-path" },
    { id: "without-path", name: "Without Path" },
  ],
};

function editBranch(): string {
  const start = appSource.indexOf('} else if (journeyAdminDialog.mode === "edit") {');
  const end = appSource.indexOf('} else if (journeyAdminDialog.mode === "move") {');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return appSource.slice(start, end);
}

describe("CR130 — Edit Journey offers only what Mirror accepts", () => {
  it("names the project path change as the operation it is, not as a payload detail", () => {
    expect(projectPathIntent(registry, "without-path", "/Users/nav/code/new")).toEqual({
      kind: "set",
      projectPath: "/Users/nav/code/new",
    });
    expect(projectPathIntent(registry, "with-path", "/Users/nav/code/moved")).toEqual({
      kind: "set",
      projectPath: "/Users/nav/code/moved",
    });
    expect(projectPathIntent(registry, "with-path", "")).toEqual({ kind: "clear" });
  });

  it("treats an unchanged field as nothing to write, including whitespace and absence", () => {
    expect(projectPathIntent(registry, "with-path", "/Users/nav/code/with-path")).toEqual({ kind: "unchanged" });
    expect(projectPathIntent(registry, "with-path", "  /Users/nav/code/with-path  ")).toEqual({ kind: "unchanged" });
    expect(projectPathIntent(registry, "without-path", "")).toEqual({ kind: "unchanged" });
    expect(projectPathIntent(registry, "without-path", "   ")).toEqual({ kind: "unchanged" });
  });

  it("refuses to decide for a Journey the loaded tree does not contain", () => {
    expect(() => projectPathIntent(registry, "vanished", "/anything")).toThrow(/no longer/i);
  });

  it("builds the two path operations with exactly the payload core's exact() predicate allows", () => {
    expect(createMutationRequest(registry, "set_project_path", { journeyId: "one", projectPath: "/p" }, "set-001")).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0",
      requestId: "set-001",
      expectedSourceVersion: "b".repeat(64),
      operation: "set_project_path",
      payload: { journeyId: "one", projectPath: "/p" },
    });
    expect(createMutationRequest(registry, "clear_project_path", { journeyId: "one" }, "clear-001")).toEqual({
      schemaVersion: "mirror.journey-mutation@1.0",
      requestId: "clear-001",
      expectedSourceVersion: "b".repeat(64),
      operation: "clear_project_path",
      payload: { journeyId: "one" },
    });
  });

  it("removes update_journey from the operation union so it cannot be constructed", () => {
    expect(mutationSource).not.toContain("update_journey");
    expect(appSource).not.toContain("update_journey");
    const union = mutationSource.slice(
      mutationSource.indexOf("export type JourneyMutationOperation"),
      mutationSource.indexOf(";", mutationSource.indexOf("export type JourneyMutationOperation")),
    );
    for (const accepted of ["create_journey", "set_project_path", "clear_project_path", "move_journey", "delete_journey"]) {
      expect(union).toContain(accepted);
    }
  });

  it("dispatches the edit branch through the path intent and writes nothing when unchanged", () => {
    const branch = editBranch();
    expect(branch).toContain("projectPathIntent(");
    expect(branch).toContain('executeJourneyMutation("set_project_path"');
    expect(branch).toContain('executeJourneyMutation("clear_project_path"');
    expect(branch).toContain('"unchanged"');
    expect(branch).toContain("setJourneyAdminDialog(null)");
    expect(branch).not.toContain("journeyAdminName");
    expect(branch).not.toContain("journeyAdminDescription");
  });

  it("shows name and description without offering them as savable, and says why once", () => {
    expect(appSource).toContain("Mirror has no canonical update operation for them yet");
    const editFields = appSource.slice(
      appSource.indexOf('{journeyAdminDialog.mode === "create" || journeyAdminDialog.mode === "edit" ? ('),
      appSource.indexOf('{journeyAdminDialog.mode === "edit" && journeyAdminDialog.journeyId ? ('),
    );
    expect(editFields).toContain('journeyAdminDialog.mode === "create" ? (');
    expect(editFields).toContain("readOnly");
    expect(editFields).toContain("journey-uneditable-canonical");
  });

  it("stops the summary from promising a canonical update it cannot perform", () => {
    expect(appSource).not.toContain("Update canonical name, description and project path");
    expect(appSource).toContain("Update the project path for");
  });

  it("names unsupported_operation at the native boundary instead of leaking the raw code", () => {
    expect(tauriSource).toContain('Some("unsupported_operation")');
    const mapping = tauriSource.slice(
      tauriSource.indexOf('Some("unsupported_operation")'),
      tauriSource.indexOf('Some("unsupported_operation")') + 400,
    );
    expect(mapping).toMatch(/Mirror does not support/i);
  });

  it("leaves the digest-and-receipt contract CR110 verified untouched", () => {
    expect(mutationSource).toContain("expectedSourceVersion");
    expect(mutationSource).toContain("STALE_SOURCE_MESSAGE");
    expect(appSource).toContain("rebaseJourneyAdministrationAfterStaleSource");
  });
});
