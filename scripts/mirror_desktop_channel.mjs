#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";

const mode = process.argv[2];
const tauri = resolve("node_modules", ".bin", process.platform === "win32" ? "tauri.cmd" : "tauri");
const home = homedir();

const channels = {
  user: {
    args: ["dev"],
    mirrorRoot: resolve(home, "mirror"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "alisson-vale"),
      MIRROR_USER: "alisson-vale",
      DB_PATH: resolve(home, ".mirror-minds", "alisson-vale", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop",
    },
  },
  dev: {
    args: ["dev", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    mirrorRoot: resolve(home, ".mirror-journeys", "mirror-mind", "mirror-dev"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "mirror-dev"),
      MIRROR_USER: "mirror-dev",
      DB_PATH: resolve(home, ".mirror-minds", "mirror-dev", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop.dev",
    },
  },
  "build-dev": {
    args: ["build", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    mirrorRoot: resolve(home, ".mirror-journeys", "mirror-mind", "mirror-dev"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "mirror-dev"),
      MIRROR_USER: "mirror-dev",
      DB_PATH: resolve(home, ".mirror-minds", "mirror-dev", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop.dev",
    },
  },
  "build-user": {
    args: ["build"],
    mirrorRoot: resolve(home, "mirror"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "alisson-vale"),
      MIRROR_USER: "alisson-vale",
      DB_PATH: resolve(home, ".mirror-minds", "alisson-vale", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop",
    },
  },
  "import-user": {
    args: [],
    mirrorRoot: resolve(home, "mirror"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "alisson-vale"),
      MIRROR_USER: "alisson-vale",
      DB_PATH: resolve(home, ".mirror-minds", "alisson-vale", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop",
    },
  },
  "import-dev": {
    args: [],
    mirrorRoot: resolve(home, ".mirror-journeys", "mirror-mind", "mirror-dev"),
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "mirror-dev"),
      MIRROR_USER: "mirror-dev",
      DB_PATH: resolve(home, ".mirror-minds", "mirror-dev", "memory.db"),
      MIRROR_DESKTOP_APP_IDENTIFIER: "ai.mirrormind.desktop.dev",
    },
  },
};

function runBootstrap(selected) {
  const bootstrap = spawnSync("python3", [
    "scripts/export_mirror_bootstrap.py",
    "--mirror-root",
    selected.mirrorRoot,
    "--app-identifier",
    selected.env.MIRROR_DESKTOP_APP_IDENTIFIER,
  ], {
    cwd: process.cwd(),
    env: { ...process.env, ...selected.env },
    stdio: "inherit",
  });
  if (bootstrap.error || bootstrap.status !== 0) {
    console.error(bootstrap.error?.message ?? "Could not initialize the canonical Journey registry.");
    process.exit(bootstrap.status ?? 1);
  }
}

function launchDesktopValidation() {
  if (process.platform !== "darwin") {
    console.error("Source-built desktop validation launch currently supports macOS only.");
    process.exit(2);
  }

  const bundles = [
    { profile: channels["import-user"], name: "Mirror Desktop.app" },
    { profile: channels["import-dev"], name: "Mirror Desktop Dev.app" },
  ];
  for (const { profile } of bundles) runBootstrap(profile);

  const launchEnvironment = { ...process.env };
  const inheritedMirrorEnvironment = ["MIRROR_HOME", "MIRROR_USER", "DB_PATH"];
  for (const name of inheritedMirrorEnvironment) delete launchEnvironment[name];

  for (const { name } of bundles) {
    const bundle = resolve("src-tauri", "target", "release", "bundle", "macos", name);
    if (!existsSync(bundle)) {
      console.error(`Built bundle is unavailable at ${bundle}. Build both channels before validation.`);
      process.exit(1);
    }
    const launch = spawnSync("open", ["-n", bundle], {
      cwd: process.cwd(),
      env: launchEnvironment,
      stdio: "inherit",
    });
    if (launch.error || launch.status !== 0) {
      console.error(launch.error?.message ?? `Could not launch ${name}.`);
      process.exit(launch.status ?? 1);
    }
  }
}

if (mode === "validate-desktop") {
  launchDesktopValidation();
  process.exit(0);
}

const selected = channels[mode];
if (!selected) {
  console.error("Usage: node scripts/mirror_desktop_channel.mjs <user|dev|build-dev|build-user|import-user|import-dev|validate-desktop>");
  process.exit(2);
}

const channelEnvironment = { ...process.env, ...selected.env };
if (mode === "dev" || mode === "import-user" || mode === "import-dev") runBootstrap(selected);

if (mode === "import-user" || mode === "import-dev") process.exit(0);

const result = spawnSync(tauri, [...selected.args, ...process.argv.slice(3)], {
  cwd: process.cwd(),
  env: channelEnvironment,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
