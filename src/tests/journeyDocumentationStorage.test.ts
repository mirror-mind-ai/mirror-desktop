import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { listJourneyDocumentation } from "../app/journeyDocumentationStorage";

const emptyTree = { status: "empty", rootLabel: "mirror-desktop", items: [] };

describe("Journey documentation storage", () => {
  beforeEach(() => invoke.mockReset());

  it("loads the exact Journey root without exposing a host path", async () => {
    invoke.mockResolvedValueOnce(emptyTree);

    await expect(listJourneyDocumentation("mirror-desktop")).resolves.toEqual(emptyTree);

    expect(invoke).toHaveBeenCalledWith("list_journey_documentation", {
      journeyId: "mirror-desktop",
      relativePath: undefined,
    });
  });

  it("loads one bounded relative folder for lazy expansion", async () => {
    invoke.mockResolvedValueOnce({ ...emptyTree, rootLabel: "bundle" });

    await listJourneyDocumentation("mirror-desktop", "src-tauri/target/release/bundle");

    expect(invoke).toHaveBeenCalledWith("list_journey_documentation", {
      journeyId: "mirror-desktop",
      relativePath: "src-tauri/target/release/bundle",
    });
  });
});
