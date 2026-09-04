#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const EXPECTED_BUNDLE_ID = "ai.mirrormind.desktop";
const EXPECTED_PRODUCT_NAME = "Mirror Desktop";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const builtApp = resolve(
  repositoryRoot,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "macos",
  "Mirror Desktop.app",
);
const installedApp = resolve("/Applications", "Mirror Desktop.app");

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  console.log(`\n→ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
  if (result.error || result.status !== 0) {
    fail(result.error?.message ?? `${command} exited with status ${result.status}`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    fail(result.error?.message ?? `${command} exited with status ${result.status}`);
  }
  return result.stdout.trim();
}

function assertCleanWorktree() {
  const status = capture("git", ["status", "--porcelain", "--untracked-files=normal"]);
  if (status) {
    fail("the Mirror Desktop worktree is not clean; commit or discard changes before promotion");
  }
}

function bundleValue(appPath, key) {
  return capture("/usr/libexec/PlistBuddy", [
    "-c",
    `Print :${key}`,
    resolve(appPath, "Contents", "Info.plist"),
  ]);
}

function assertStableBundle(appPath) {
  if (!existsSync(appPath)) {
    fail(`stable bundle was not produced at ${appPath}`);
  }
  const bundleId = bundleValue(appPath, "CFBundleIdentifier");
  const productName = bundleValue(appPath, "CFBundleName");
  if (bundleId !== EXPECTED_BUNDLE_ID || productName !== EXPECTED_PRODUCT_NAME) {
    fail(
      `bundle identity mismatch: expected ${EXPECTED_PRODUCT_NAME} (${EXPECTED_BUNDLE_ID}), ` +
        `received ${productName} (${bundleId})`,
    );
  }
}

function assertInstalledAppIsClosed() {
  if (!existsSync(installedApp)) return;
  const result = spawnSync("pgrep", ["-f", `${installedApp}/Contents/MacOS/`], {
    encoding: "utf8",
  });
  if (result.status === 0 && result.stdout.trim()) {
    fail("close the installed Mirror Desktop app before promoting");
  }
}

function installStableBundle() {
  const applicationsRoot = dirname(installedApp);
  mkdirSync(applicationsRoot, { recursive: true });
  try {
    accessSync(applicationsRoot, constants.W_OK);
  } catch {
    fail(`${applicationsRoot} is not writable; promotion never invokes sudo automatically`);
  }

  assertInstalledAppIsClosed();
  const token = `${Date.now()}-${process.pid}`;
  const stagingApp = resolve(applicationsRoot, `.Mirror Desktop.promoting-${token}.app`);
  const backupApp = resolve(applicationsRoot, `.Mirror Desktop.backup-${token}.app`);
  let previousMoved = false;

  try {
    run("/usr/bin/ditto", [builtApp, stagingApp]);
    assertStableBundle(stagingApp);
    if (existsSync(installedApp)) {
      renameSync(installedApp, backupApp);
      previousMoved = true;
    }
    renameSync(stagingApp, installedApp);
    assertStableBundle(installedApp);
    if (previousMoved) rmSync(backupApp, { recursive: true, force: true });
  } catch (error) {
    if (!existsSync(installedApp) && previousMoved && existsSync(backupApp)) {
      renameSync(backupApp, installedApp);
    }
    rmSync(stagingApp, { recursive: true, force: true });
    throw error;
  }
}

try {
  if (process.platform !== "darwin") {
    fail("production promotion is currently supported only on macOS");
  }

  if (process.argv.includes("--plan")) {
    console.log(`Promotion plan:\n  source: ${builtApp}\n  destination: ${installedApp}`);
    process.exit(0);
  }

  assertCleanWorktree();
  run("npm", ["test"]);
  run("npm", ["run", "build"]);
  run("cargo", ["test"], { cwd: resolve(repositoryRoot, "src-tauri") });
  run("cargo", ["check"], { cwd: resolve(repositoryRoot, "src-tauri") });
  run("npm", ["run", "tauri:build:user"]);
  assertStableBundle(builtApp);
  installStableBundle();

  console.log(`\n✓ Promoted ${EXPECTED_PRODUCT_NAME} (${EXPECTED_BUNDLE_ID}) to ${installedApp}`);
} catch (error) {
  console.error(`Promotion refused: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
