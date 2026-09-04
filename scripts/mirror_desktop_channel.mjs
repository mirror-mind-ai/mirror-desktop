#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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
};

const selected = channels[mode];
if (!selected) {
  console.error("Usage: node scripts/mirror_desktop_channel.mjs <user|dev|build-dev|build-user|import-user>");
  process.exit(2);
}

const channelEnvironment = { ...process.env, ...selected.env };
if (mode === "dev" || mode === "import-user") {
  const bootstrap = spawnSync("python3", [
    "scripts/export_mirror_bootstrap.py",
    "--mirror-root",
    selected.mirrorRoot,
    "--app-identifier",
    selected.env.MIRROR_DESKTOP_APP_IDENTIFIER,
  ], {
    cwd: process.cwd(),
    env: channelEnvironment,
    stdio: "inherit",
  });
  if (bootstrap.error || bootstrap.status !== 0) {
    console.error(bootstrap.error?.message ?? "Could not initialize the canonical Journey registry.");
    process.exit(bootstrap.status ?? 1);
  }
}

if (mode === "import-user") process.exit(0);

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
