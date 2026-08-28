import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { inspectRuntimeChannel, parseRuntimeChannelDiagnostic } from "../app/runtimeChannelStorage";

const development = {
  channel: "development",
  productName: "Nautilus Harness Dev",
  bundleIdentifier: "com.nautilus.harness.dev",
  appDataRoot: "/Users/example/Library/Application Support/com.nautilus.harness.dev",
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

  it("rejects unknown fields and cross-channel identifiers", () => {
    expect(() => parseRuntimeChannelDiagnostic({ ...development, token: "secret" })).toThrow(/unsupported fields/);
    expect(() => parseRuntimeChannelDiagnostic({ ...development, bundleIdentifier: "com.nautilus.harness" })).toThrow(/bundle identity/);
  });
});
