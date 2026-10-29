import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  bindMirrorHome, chooseRuntimeDirectory, createMirrorHome, inspectRuntimeChannel, parseRuntimeChannelDiagnostic,
} from "../app/runtimeChannelStorage";

const development = {
  channel: "development",
  productName: "Mirror Desktop TS Dev",
  bundleIdentifier: "ai.mirrormind.desktop.ts.dev",
  appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop.ts.dev",
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

  // CV-010.DS-005 slice 2f-2: the Python binding's candidate, validate and save routes are gone; the
  // one folder the app asks for is a Mirror home, bound through bind_mirror_home.
  it("asks only for a Mirror home folder", async () => {
    invoke.mockResolvedValueOnce("/Users/example/mirror-ts-homes/ana").mockResolvedValueOnce(null);
    await expect(chooseRuntimeDirectory("mirrorHome")).resolves.toBe("/Users/example/mirror-ts-homes/ana");
    await expect(chooseRuntimeDirectory("mirrorHome")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenNthCalledWith(1, "choose_runtime_directory", { kind: "mirrorHome" });
  });

  it("accepts a bounded unbound state without runtime coordinates", () => {
    expect(parseRuntimeChannelDiagnostic({
      channel: "user",
      productName: "Mirror Desktop TS",
      bundleIdentifier: "ai.mirrormind.desktop.ts",
      appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop.ts",
      status: "unbound",
      message: "Mirror Desktop runtime is unbound.",
    }).status).toBe("unbound");
  });

  it("accepts evaluation presentation over the exact user app-data identity", () => {
    expect(parseRuntimeChannelDiagnostic({
      ...development,
      channel: "evaluation",
      productName: "Mirror Desktop TS Eval",
      bundleIdentifier: "ai.mirrormind.desktop.ts",
      appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.desktop.ts",
    })).toMatchObject({ channel: "evaluation", productName: "Mirror Desktop TS Eval" });
  });

  it("rejects unknown fields, cross-channel identifiers and incomplete validated state", () => {
    expect(() => parseRuntimeChannelDiagnostic({ ...development, token: "secret" })).toThrow(/unsupported fields/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, bundleIdentifier: "ai.mirrormind.desktop.ts" })).toThrow(/bundle identity/);
    // CV-010.DS-005 phase 0: the frozen 0.2 identities are foreign to every channel of this line.
    expect(() => parseRuntimeChannelDiagnostic({ ...development, bundleIdentifier: "ai.mirrormind.desktop.dev" })).toThrow(/bundle identity/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, channel: "user", bundleIdentifier: "ai.mirrormind.desktop" })).toThrow(/bundle identity/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, mirrorHome: undefined })).toThrow(/lacks required coordinates/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, dbPath: undefined })).toThrow(/lacks required coordinates/);
  });

  // CV-010.DS-005 slice 2d-1: a 0.3 diagnostic names the home and its database, nothing else.
  it("accepts a 0.3 diagnostic that names only the home and its database", () => {
    const { mirrorRoot: _root, mirrorUser: _user, ...home } = development;
    expect(parseRuntimeChannelDiagnostic(home)).toEqual(home);
  });

  it("binds a 0.3 home through its own native command", async () => {
    const { mirrorRoot: _root, mirrorUser: _user, ...home } = development;
    invoke.mockResolvedValueOnce(home);
    await expect(bindMirrorHome("/Users/example/Mirror Homes/ana")).resolves.toEqual(home);
    expect(invoke).toHaveBeenCalledWith("bind_mirror_home", { homePath: "/Users/example/Mirror Homes/ana" });
  });

  // CV-010.DS-005 slice 3a.
  it("creates a 0.3 home through its own native command, in ~/Mirror unless a folder was chosen", async () => {
    const { mirrorRoot: _root, mirrorUser: _user, ...home } = development;
    invoke.mockResolvedValueOnce(home).mockResolvedValueOnce(home).mockResolvedValueOnce("/Volumes/Notes");
    await expect(createMirrorHome("ana-souza")).resolves.toEqual(home);
    expect(invoke).toHaveBeenNthCalledWith(1, "create_mirror_home", { userName: "ana-souza", folder: null });
    await createMirrorHome("ana", "/Volumes/Notes");
    expect(invoke).toHaveBeenNthCalledWith(2, "create_mirror_home", { userName: "ana", folder: "/Volumes/Notes" });
    await expect(chooseRuntimeDirectory("homeFolder")).resolves.toBe("/Volumes/Notes");
    expect(invoke).toHaveBeenNthCalledWith(3, "choose_runtime_directory", { kind: "homeFolder" });
  });
});
