#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";

const mode = process.argv[2];
const tauri = resolve("node_modules", ".bin", process.platform === "win32" ? "tauri.cmd" : "tauri");
const home = homedir();

const channels = {
  dev: {
    args: ["dev", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "mirror-dev"),
      MIRROR_USER: "mirror-dev",
      DB_PATH: resolve(home, ".mirror-minds", "mirror-dev", "memory.db"),
      NAUTILUS_APP_IDENTIFIER: "com.nautilus.harness.dev",
    },
  },
  "build-dev": {
    args: ["build", "--config", "src-tauri/tauri.dev.conf.json", "--features", "development-channel"],
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "mirror-dev"),
      MIRROR_USER: "mirror-dev",
      DB_PATH: resolve(home, ".mirror-minds", "mirror-dev", "memory.db"),
      NAUTILUS_APP_IDENTIFIER: "com.nautilus.harness.dev",
    },
  },
  "build-user": {
    args: ["build"],
    env: {
      MIRROR_HOME: resolve(home, ".mirror-minds", "alisson-vale"),
      MIRROR_USER: "alisson-vale",
      DB_PATH: resolve(home, ".mirror-minds", "alisson-vale", "memory.db"),
      NAUTILUS_APP_IDENTIFIER: "com.nautilus.harness",
    },
  },
};

const selected = channels[mode];
if (!selected) {
  console.error("Usage: node scripts/nautilus_channel.mjs <dev|build-dev|build-user>");
  process.exit(2);
}

const channelEnvironment = { ...process.env, ...selected.env };
if (mode === "dev") {
  const bootstrap = spawnSync("python3", [
    "scripts/export_mirror_bootstrap.py",
    "--app-identifier",
    "com.nautilus.harness.dev",
  ], {
    cwd: process.cwd(),
    env: channelEnvironment,
    stdio: "inherit",
  });
  if (bootstrap.error || bootstrap.status !== 0) {
    console.error(bootstrap.error?.message ?? "Could not initialize the Nautilus Dev Journey registry.");
    process.exit(bootstrap.status ?? 1);
  }
}

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
