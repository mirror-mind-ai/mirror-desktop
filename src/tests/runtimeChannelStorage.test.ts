import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  chooseRuntimeDirectory, inspectRuntimeChannel, parseRuntimeChannelDiagnostic,
  saveRuntimeBinding, validateRuntimeBinding,
} from "../app/runtimeChannelStorage";

const development = {
  channel: "development",
  productName: "Mirror Desktop Dev",
  bundleIdentifier: "ai.mirrormind.desktop.dev",
  appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop.dev",
  mirrorRoot: "/Users/example/Code/mirror-dev",
  mirrorHome: "/Users/example/.mirror-minds/mirror-dev",
  mirrorUser: "mirror-dev",
  dbPath: "/Users/example/.mirror-minds/mirror-dev/memory.db",
  status: "validated",
};

describe("runtime channel storage", () => {
  beforeEach(() => invoke.mockReset());

  it("accepts one strict development diagnostic", async () => {
    invoke.mockResolvedValueOnce(development);
    await expect(inspectRuntimeChannel()).resolves.toEqual(development);
    expect(invoke).toHaveBeenCalledWith("inspect_runtime_channel");
  });

  it("validates and saves an explicit binding through separate native commands", async () => {
    const binding = {
      schemaVersion: "1.0.0" as const,
      channel: "development" as const,
      mirrorRoot: development.mirrorRoot,
      mirrorHome: development.mirrorHome,
      mirrorUser: development.mirrorUser,
      dbPath: development.dbPath,
    };
    invoke.mockResolvedValueOnce(development).mockResolvedValueOnce(development).mockResolvedValueOnce(binding.mirrorRoot);
    await expect(validateRuntimeBinding(binding)).resolves.toEqual(development);
    await expect(saveRuntimeBinding(binding)).resolves.toEqual(development);
    await expect(chooseRuntimeDirectory("mirrorRoot")).resolves.toBe(binding.mirrorRoot);
    expect(invoke).toHaveBeenNthCalledWith(1, "validate_runtime_binding", { binding });
    expect(invoke).toHaveBeenNthCalledWith(2, "save_runtime_binding", { binding });
    expect(invoke).toHaveBeenNthCalledWith(3, "choose_runtime_directory", { kind: "mirrorRoot" });
  });

  it("accepts a bounded unbound state without runtime coordinates", () => {
    expect(parseRuntimeChannelDiagnostic({
      channel: "user",
      productName: "Mirror Desktop",
      bundleIdentifier: "ai.mirrormind.desktop",
      appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop",
      status: "unbound",
      message: "Mirror Desktop runtime is unbound.",
    }).status).toBe("unbound");
  });

  it("rejects unknown fields, cross-channel identifiers and incomplete validated state", () => {
    expect(() => parseRuntimeChannelDiagnostic({ ...development, token: "secret" })).toThrow(/unsupported fields/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, bundleIdentifier: "ai.mirrormind.desktop" })).toThrow(/bundle identity/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, mirrorHome: undefined })).toThrow(/lacks required coordinates/);
  });
});
