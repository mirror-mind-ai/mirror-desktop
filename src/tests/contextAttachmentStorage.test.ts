import { describe, expect, it } from "vitest";
import source from "../app/contextAttachmentStorage.ts?raw";
import tauriSource from "../../src-tauri/src/main.rs?raw";

 describe("context attachment native boundary", () => {
  it("supplies exact Journey identity and relative paths to one fixed command", () => {
    expect(source).toContain('"snapshot_journey_context"');
    expect(source).toContain("{ journeyId, relativePaths }");
    expect(source).not.toMatch(/projectPath|absolutePath|read_journey_document/);
  });

  it("keeps filesystem authority in the registered Journey native boundary", () => {
    expect(tauriSource).toContain("registered_journey_root(&app, &journey_id)");
    expect(tauriSource).toContain("snapshot_journey_context_at(&journey_root, &journey_id, &relative_paths)");
    expect(tauriSource).toContain("Symbolic links cannot be attached as context.");
    expect(tauriSource).not.toContain("fs:allow-read");
  });
});
