#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, closeSync, fsyncSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const DEV_IDENTIFIER = "ai.mirrormind.desktop.dev";
const USER_IDENTIFIER = "ai.mirrormind.desktop";
const CONTROL_IDENTIFIER = "ai.mirrormind.desktop.rs018-rehearsal";
const RECEIPT_SCHEMA = "1.0.0";
const MAX_FILES = 50_000;
const MAX_BYTES = 4 * 1024 * 1024 * 1024;

export function sandboxPaths(home) {
  const appSupport = join(resolve(home), "Library", "Application Support");
  const controlRoot = join(appSupport, CONTROL_IDENTIFIER);
  return {
    home: resolve(home),
    appSupport,
    active: join(appSupport, DEV_IDENTIFIER),
    production: join(appSupport, USER_IDENTIFIER),
    controlRoot,
    receipt: join(controlRoot, "swap-receipt.json"),
  };
}

function assertDirectory(path, label) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`${label} must be a regular directory: ${path}`);
  }
}

function assertInside(path, parent, label) {
  const child = resolve(path);
  const root = `${resolve(parent)}${sep}`;
  if (!child.startsWith(root)) throw new Error(`${label} escaped its bounded parent.`);
}

function sha256File(path) {
  const hash = createHash("sha256");
  const fd = openSync(path, "r");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  try {
    let bytesRead;
    do {
      bytesRead = readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}

export function redactedInventory(root) {
  assertDirectory(root, "Inventory root");
  const entries = [];
  const pending = [root];
  let totalBytes = 0;
  while (pending.length > 0) {
    const directory = pending.pop();
    const children = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const path = join(directory, child.name);
      const metadata = lstatSync(path);
      if (metadata.isSymbolicLink()) throw new Error(`Inventory refuses symbolic links: ${path}`);
      if (child.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (!child.isFile()) throw new Error(`Inventory refuses non-regular files: ${path}`);
      totalBytes += metadata.size;
      if (entries.length >= MAX_FILES || totalBytes > MAX_BYTES) {
        throw new Error("Inventory exceeds its bounded file or byte limit.");
      }
      entries.push({ relativePath: relative(root, path), size: metadata.size, sha256: sha256File(path) });
    }
  }
  entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const manifestDigest = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  return { fileCount: entries.length, totalBytes, manifestDigest };
}

function writeJsonDurable(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const staged = `${path}.${process.pid}.tmp`;
  writeFileSync(staged, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  const file = openSync(staged, "r");
  fsyncSync(file);
  closeSync(file);
  renameSync(staged, path);
  const directory = openSync(dirname(path), "r");
  fsyncSync(directory);
  closeSync(directory);
}

function readReceipt(path) {
  const metadata = lstatSync(path);
  if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("Sandbox receipt is not a regular file.");
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  if (receipt.schemaVersion !== RECEIPT_SCHEMA || receipt.kind !== "rs018_rehearsal_app_data_swap") {
    throw new Error("Sandbox receipt is invalid.");
  }
  return receipt;
}

export function runningMirrorDesktopProcesses() {
  if (process.platform !== "darwin") return [];
  const output = execFileSync("ps", ["-axo", "pid=,comm=,command="], { encoding: "utf8" });
  return output.split("\n").map((line) => line.trim()).filter(Boolean).filter((line) => {
    const match = line.match(/^\d+\s+(\S+)\s+(.+)$/);
    if (!match) return false;
    const executable = basename(match[1]);
    const command = match[2];
    return executable === "mirror-desktop"
      || (executable === "node" && (
        command.includes("mirror_desktop_channel.mjs dev")
        || command.includes("/node_modules/.bin/tauri dev")
      ))
      || (executable === "cargo" && command.includes("--features development-channel"));
  });
}

function assertNoRunningDesktop() {
  const processes = runningMirrorDesktopProcesses();
  if (processes.length > 0) throw new Error(`Mirror Desktop DEV is still running (${processes.length} process(es)).`);
}

export function prepareSandbox({ home, timestamp, dryRun = false, processInspection = assertNoRunningDesktop }) {
  processInspection();
  const paths = sandboxPaths(home);
  if (basename(paths.active) !== DEV_IDENTIFIER || basename(paths.production) !== USER_IDENTIFIER) {
    throw new Error("Sandbox paths do not match the closed channel identifiers.");
  }
  assertDirectory(paths.active, "Ordinary DEV app data");
  const inventory = redactedInventory(paths.active);
  const backup = join(paths.appSupport, `${DEV_IDENTIFIER}.rs018-backup-${timestamp}`);
  const rehearsalArchive = join(paths.controlRoot, `rehearsal-app-data-${timestamp}`);
  assertInside(backup, paths.appSupport, "Backup");
  assertInside(rehearsalArchive, paths.controlRoot, "Rehearsal archive");
  for (const path of [backup, rehearsalArchive]) {
    try {
      lstatSync(path);
      throw new Error(`Sandbox destination already exists: ${path}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  try {
    const existing = readReceipt(paths.receipt);
    if (existing.phase !== "restored") {
      throw new Error(`Sandbox receipt already exists in phase ${existing.phase}. Restore it before preparing another rehearsal.`);
    }
    const restoredInventory = redactedInventory(paths.active);
    if (restoredInventory.manifestDigest !== existing.originalInventory.manifestDigest) {
      throw new Error("A restored receipt cannot roll over because ordinary DEV data diverged.");
    }
    if (!dryRun) {
      const history = join(paths.controlRoot, "receipt-history");
      mkdirSync(history, { recursive: true });
      const historicalReceipt = join(history, `swap-receipt-${existing.preparedAt.replaceAll(/[^A-Za-z0-9._-]/g, "-")}.json`);
      try {
        lstatSync(historicalReceipt);
        throw new Error(`Historical sandbox receipt already exists: ${historicalReceipt}`);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      renameSync(paths.receipt, historicalReceipt);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const receipt = {
    schemaVersion: RECEIPT_SCHEMA,
    kind: "rs018_rehearsal_app_data_swap",
    phase: dryRun ? "dry_run" : "preparing",
    preparedAt: timestamp,
    activePath: paths.active,
    productionPath: paths.production,
    backupPath: backup,
    rehearsalArchivePath: rehearsalArchive,
    originalInventory: inventory,
  };
  if (dryRun) return receipt;
  mkdirSync(paths.controlRoot, { recursive: true });
  writeJsonDurable(paths.receipt, receipt);
  renameSync(paths.active, backup);
  mkdirSync(paths.active, { recursive: false });
  const prepared = { ...receipt, phase: "prepared" };
  writeJsonDurable(paths.receipt, prepared);
  return prepared;
}

export function sandboxStatus({ home }) {
  const paths = sandboxPaths(home);
  const receipt = readReceipt(paths.receipt);
  return {
    schemaVersion: RECEIPT_SCHEMA,
    phase: receipt.phase,
    activePath: receipt.activePath,
    backupPath: receipt.backupPath,
    rehearsalArchivePath: receipt.rehearsalArchivePath,
    originalInventory: receipt.originalInventory,
  };
}

export function restoreSandbox({ home, timestamp, processInspection = assertNoRunningDesktop }) {
  processInspection();
  const paths = sandboxPaths(home);
  const receipt = readReceipt(paths.receipt);
  if (receipt.activePath !== paths.active || receipt.productionPath !== paths.production) {
    throw new Error("Sandbox receipt coordinates do not match this home.");
  }
  assertInside(receipt.backupPath, paths.appSupport, "Receipt backup");
  assertInside(receipt.rehearsalArchivePath, paths.controlRoot, "Receipt rehearsal archive");
  if (!basename(receipt.backupPath).startsWith(`${DEV_IDENTIFIER}.rs018-backup-`)) {
    throw new Error("Sandbox receipt backup coordinate is invalid.");
  }
  if (receipt.phase === "restored") {
    const inventory = redactedInventory(paths.active);
    if (inventory.manifestDigest !== receipt.originalInventory.manifestDigest) {
      throw new Error("Restored ordinary DEV app data diverged from its original inventory.");
    }
    return receipt;
  }
  if (receipt.phase !== "prepared" && receipt.phase !== "preparing") {
    throw new Error(`Sandbox cannot restore phase ${receipt.phase}.`);
  }
  if (receipt.phase === "preparing") {
    try {
      lstatSync(receipt.backupPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const unchanged = redactedInventory(paths.active);
      if (unchanged.manifestDigest !== receipt.originalInventory.manifestDigest) {
        throw new Error("Interrupted preparation has neither an exact backup nor unchanged ordinary DEV data.");
      }
      const restoredWithoutSwap = { ...receipt, phase: "restored", restoredAt: timestamp, restoredInventory: unchanged };
      writeJsonDurable(paths.receipt, restoredWithoutSwap);
      return restoredWithoutSwap;
    }
  }
  let activeExists = true;
  try {
    assertDirectory(paths.active, "Rehearsal DEV app data");
  } catch (error) {
    if (error?.code === "ENOENT" && receipt.phase === "preparing") activeExists = false;
    else throw error;
  }
  assertDirectory(receipt.backupPath, "Ordinary DEV backup");
  try {
    lstatSync(receipt.rehearsalArchivePath);
    throw new Error(`Rehearsal archive already exists: ${receipt.rehearsalArchivePath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const backupInventory = redactedInventory(receipt.backupPath);
  if (backupInventory.manifestDigest !== receipt.originalInventory.manifestDigest) {
    throw new Error("Ordinary DEV backup diverged before restore.");
  }
  if (activeExists) renameSync(paths.active, receipt.rehearsalArchivePath);
  renameSync(receipt.backupPath, paths.active);
  const restoredInventory = redactedInventory(paths.active);
  if (restoredInventory.manifestDigest !== receipt.originalInventory.manifestDigest) {
    throw new Error("Ordinary DEV restore verification failed.");
  }
  const restored = {
    ...receipt,
    phase: "restored",
    restoredAt: timestamp,
    ...(activeExists ? { rehearsalInventory: redactedInventory(receipt.rehearsalArchivePath) } : {}),
    restoredInventory,
  };
  writeJsonDurable(paths.receipt, restored);
  return restored;
}

function parseArgs(argv) {
  const command = argv[0];
  const options = { home: homedir(), timestamp: new Date().toISOString().replaceAll(":", "-") };
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] === "--home") options.home = argv[++index];
    else if (argv[index] === "--timestamp") options.timestamp = argv[++index];
    else if (argv[index] === "--dry-run") options.dryRun = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return { command, options };
}

function main(argv) {
  const { command, options } = parseArgs(argv);
  const result = command === "prepare" ? prepareSandbox(options)
    : command === "status" ? sandboxStatus(options)
      : command === "restore" ? restoreSandbox(options)
        : (() => { throw new Error("Usage: rs018_rehearsal_sandbox.mjs <prepare|status|restore> [--home PATH] [--timestamp VALUE] [--dry-run]"); })();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
