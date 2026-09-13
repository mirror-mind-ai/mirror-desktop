import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { loadResolvedWhatsNewState, loadWhatsNewState, preparePendingRelease } from "../app/whatsNewStorage";
import type { ReleaseReading } from "../domain/releaseReading";

const body = "## Highlights\n";
let reading: ReleaseReading;

beforeEach(async () => {
  invoke.mockReset();
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  reading = {
    schemaVersion: "1.0.0",
    product: "Mirror Desktop",
    version: "0.2.0-alpha.5",
    title: "Release clarity",
    digest: "Explains the exact release.",
    highlights: ["Shows What's New after relaunch."],
    body,
    bodySha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(""),
    releaseNotesUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md",
  };
});

describe("What's New storage", () => {
  it("defaults safely when native state is absent or malformed", async () => {
    invoke.mockResolvedValueOnce(null);
    await expect(loadWhatsNewState()).resolves.toEqual({ schemaVersion: "1.0.0" });
    invoke.mockResolvedValueOnce("{bad");
    await expect(loadWhatsNewState()).resolves.toEqual({ schemaVersion: "1.0.0" });
  });

  it("persists a bounded pending reading before installation", async () => {
    invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);
    await preparePendingRelease(reading);
    expect(invoke).toHaveBeenLastCalledWith("save_whats_new_state", expect.objectContaining({ payload: expect.stringContaining('"pending"') }));
  });

  it("publishes installed state only when the running version matches", async () => {
    invoke.mockResolvedValueOnce(JSON.stringify({ schemaVersion: "1.0.0", pending: reading })).mockResolvedValueOnce(undefined);
    const resolved = await loadResolvedWhatsNewState(reading.version);
    expect(resolved.reminder).toBe(true);
    expect(resolved.installed).toEqual(reading);
  });
});
