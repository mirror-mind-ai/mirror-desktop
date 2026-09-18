import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  prepareSandbox,
  redactedInventory,
  restoreSandbox,
  sandboxPaths,
  sandboxStatus,
} from "../../scripts/rs018_rehearsal_sandbox.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const noProcesses = () => undefined;

function prepare(options) {
  return prepareSandbox({ ...options, processInspection: noProcesses });
}

function restore(options) {
  return restoreSandbox({ ...options, processInspection: noProcesses });
}

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "rs018-sandbox-"));
  roots.push(home);
  const paths = sandboxPaths(home);
  mkdirSync(paths.active, { recursive: true });
  mkdirSync(paths.production, { recursive: true });
  writeFileSync(join(paths.active, "ordinary.json"), '{"private":"not emitted"}');
  mkdirSync(join(paths.active, "nested"));
  writeFileSync(join(paths.active, "nested", "state.bin"), "state");
  writeFileSync(join(paths.production, "untouched.txt"), "production");
  return { home, paths };
}

describe("RS018 rehearsal app-data sandbox", () => {
  it("dry-runs without moving ordinary DEV data or writing a receipt", () => {
    const { home, paths } = fixture();
    const result = prepare({ home, timestamp: "2026-09-18T18-00-00Z", dryRun: true });
    expect(result.phase).toBe("dry_run");
    expect(readFileSync(join(paths.active, "ordinary.json"), "utf8")).toContain("private");
    expect(() => readFileSync(paths.receipt)).toThrow();
  });

  it("swaps, inventories, restores, and verifies ordinary DEV state idempotently", () => {
    const { home, paths } = fixture();
    const before = redactedInventory(paths.active);
    const prepared = prepare({ home, timestamp: "2026-09-18T18-01-00Z" });
    expect(prepared.phase).toBe("prepared");
    expect(sandboxStatus({ home })).toMatchObject({ phase: "prepared", originalInventory: before });
    expect(redactedInventory(paths.active).fileCount).toBe(0);
    writeFileSync(join(paths.active, "rehearsal.json"), '{"message":"private-free"}');

    const restored = restore({ home, timestamp: "2026-09-18T18-02-00Z" });
    expect(restored.phase).toBe("restored");
    expect(restored.restoredInventory).toEqual(before);
    expect(restored.rehearsalInventory.fileCount).toBe(1);
    expect(readFileSync(join(paths.active, "ordinary.json"), "utf8")).toContain("private");
    expect(readFileSync(join(paths.production, "untouched.txt"), "utf8")).toBe("production");
    expect(restore({ home, timestamp: "later" }).restoredInventory).toEqual(before);
  });

  it("emits only bounded counts and digests, never file names or content", () => {
    const { paths } = fixture();
    const result = redactedInventory(paths.active);
    expect(Object.keys(result)).toEqual(["fileCount", "totalBytes", "manifestDigest"]);
    expect(JSON.stringify(result)).not.toContain("ordinary.json");
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("refuses symbolic app data and destination collisions", () => {
    const { home, paths } = fixture();
    rmSync(paths.active, { recursive: true });
    symlinkSync(paths.production, paths.active);
    expect(() => prepare({ home, timestamp: "symbolic" })).toThrow("regular directory");

    unlinkSync(paths.active);
    mkdirSync(paths.active);
    mkdirSync(join(paths.appSupport, "ai.mirrormind.desktop.dev.rs018-backup-collision"));
    expect(() => prepare({ home, timestamp: "collision" })).toThrow("already exists");
  });

  it("refuses a second preparation while a durable receipt owns restoration", () => {
    const { home } = fixture();
    prepare({ home, timestamp: "first" });
    expect(() => prepare({ home, timestamp: "second" })).toThrow("receipt already exists");
  });

  it("rolls over a verified restored receipt before a later rehearsal", () => {
    const { home, paths } = fixture();
    const first = prepare({ home, timestamp: "first" });
    writeFileSync(join(paths.active, "first-rehearsal.json"), "fixture");
    restore({ home, timestamp: "first-restored" });

    const second = prepare({ home, timestamp: "second" });
    expect(second.phase).toBe("prepared");
    expect(second.backupPath).not.toBe(first.backupPath);
    expect(sandboxStatus({ home }).phase).toBe("prepared");
    expect(redactedInventory(paths.active).fileCount).toBe(0);
    expect(readFileSync(join(paths.controlRoot, "receipt-history", "swap-receipt-first.json"), "utf8"))
      .toContain('"phase": "restored"');
  });
});
