import { describe, expect, it } from "vitest";
import { STALE_SOURCE_MESSAGE, isStaleSourceError, rebaseCreateIntent } from "../domain/journeyMutation";
import type { JourneyRegistry } from "../domain/journeyRegistry";
import appSource from "../app/App.tsx?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

// CR110: Mirror compares one digest over every Journey's row, so any change anywhere refuses a
// create that it does not conflict with. The rule that decides whether the intent still fits lives
// in the domain; the wiring that reloads the tree inside the form is guarded here.
const registry: JourneyRegistry = {
  schemaVersion: "0.2.0", source: "mirror", sourceVersion: "b".repeat(64), syncedAt: "now",
  roots: [
    { id: "vida-tecnica", name: "Vida Técnica", children: [{ id: "existing", name: "Existing", parentId: "vida-tecnica" }] },
    { id: "other", name: "Other" },
  ],
};

describe("CR110: a stale create intent is judged against the fresh tree", () => {
  it("recognises the native stale-source refusal by exact message", () => {
    expect(isStaleSourceError(new Error(STALE_SOURCE_MESSAGE))).toBe(true);
    expect(isStaleSourceError(STALE_SOURCE_MESSAGE)).toBe(true);
    expect(isStaleSourceError(new Error("Journey slug is invalid or already exists."))).toBe(false);
  });

  it("holds the message identical to the native literal", () => {
    expect(tauriSource).toContain(`Some("stale_source") => "${STALE_SOURCE_MESSAGE}".to_string()`);
  });

  it("keeps an intent whose parent still exists and whose id is still free, with a recomputed position", () => {
    expect(rebaseCreateIntent(registry, { slug: "new-one", parentId: "vida-tecnica" })).toEqual({ kind: "rebasable", position: 1 });
    expect(rebaseCreateIntent(registry, { slug: "new-root", parentId: null })).toEqual({ kind: "rebasable", position: 2 });
  });

  it("names a taken id as the conflict", () => {
    const rebase = rebaseCreateIntent(registry, { slug: "existing", parentId: "vida-tecnica" });
    expect(rebase.kind).toBe("conflict");
    if (rebase.kind === "conflict") {
      expect(rebase.reason).toContain('"existing"');
      expect(rebase.parentMissing).toBe(false);
    }
  });

  it("names a vanished parent as the conflict and asks for the parent to be chosen again", () => {
    const rebase = rebaseCreateIntent(registry, { slug: "new-one", parentId: "gone" });
    expect(rebase.kind).toBe("conflict");
    if (rebase.kind === "conflict") {
      expect(rebase.reason).toContain('"gone"');
      expect(rebase.parentMissing).toBe(true);
    }
  });

  it("refuses to rebase against a registry without exact version authority", () => {
    const legacy = { ...registry, schemaVersion: "0.1.0" as const, sourceVersion: undefined };
    expect(rebaseCreateIntent(legacy, { slug: "x", parentId: null }).kind).toBe("conflict");
  });
});

describe("CR110: the form reloads the tree instead of sending the Navigator out to do it", () => {
  const flow = appSource.slice(
    appSource.indexOf("async function executeJourneyMutation"),
    appSource.indexOf("async function submitJourneyAdministration"),
  );

  it("branches on the stale refusal before reporting a generic failure", () => {
    expect(flow).toContain("if (isStaleSourceError(error)) {");
    expect(flow).toContain("await rebaseJourneyAdministrationAfterStaleSource(operation, payload);");
  });

  it("never retries the mutation on its own", () => {
    const rebase = flow.slice(flow.indexOf("async function rebaseJourneyAdministrationAfterStaleSource"));
    expect(rebase).not.toContain("mutateJourneyRegistry(");
    expect(rebase).not.toContain("executeJourneyMutation(");
  });

  it("rebuilds the pending request from the fresh registry so the next Confirm carries current authority and a new request id", () => {
    expect(flow).toContain('createMutationRequest(refreshedRegistry, "create_journey", { ...payload, position: rebase.position })');
  });

  it("keeps the failure inside the form, as the existing boundary requires", () => {
    expect(flow).not.toContain('setJourneyRegistryRefreshState("failed")');
    expect(flow).not.toContain("setJourneyRegistryRefreshMessage(message)");
  });

  it("resets a vanished parent to Root rather than leaving a parent the tree no longer has", () => {
    expect(flow).toContain('if (rebase.parentMissing) setJourneyAdminParent("");');
  });
});
