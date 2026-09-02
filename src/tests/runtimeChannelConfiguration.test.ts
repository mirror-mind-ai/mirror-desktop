// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import stableConfig from "../../src-tauri/tauri.conf.json";
import developmentConfig from "../../src-tauri/tauri.dev.conf.json";
import rustSource from "../../src-tauri/src/main.rs?raw";
import runtimeChannelSource from "../../src-tauri/src/runtime_channel.rs?raw";
import appSource from "../app/App.tsx?raw";
import provisionScript from "../../scripts/provision_mirror_conversation.py?raw";
import channelLauncher from "../../scripts/nautilus_channel.mjs?raw";
import productionPromotion from "../../scripts/promote_production.mjs?raw";

const scripts = packageJson.scripts as Record<string, string>;
const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const readmeSource = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
const agentsSource = readFileSync(new URL("../../AGENTS.md", import.meta.url), "utf8");
const setupGuide = readFileSync(new URL("../../docs/development/environment-setup.md", import.meta.url), "utf8");
const stableIconSource = readFileSync(new URL("../../src-tauri/icons/icon.svg", import.meta.url), "utf8");
const developmentIconSource = readFileSync(new URL("../../src-tauri/icons/dev/icon.svg", import.meta.url), "utf8");

describe("runtime channel configuration", () => {
  it("keeps stable and development Tauri identities non-colliding", () => {
    expect(stableConfig.identifier).toBe("com.nautilus.harness");
    expect(developmentConfig.identifier).toBe("com.nautilus.harness.dev");
    expect(developmentConfig.productName).toBe("Nautilus Harness Dev");
    expect(developmentConfig.bundle.icon).toContain("icons/dev/icon.png");
    expect(runtimeChannelSource).toContain("apply_macos_dock_icon");
    expect(runtimeChannelSource).toContain("setApplicationIconImage");
    expect(runtimeChannelSource).toContain('include_bytes!("../icons/dev/icon.png")');
  });

  it("uses one Nautilus artwork with DEV as the only channel icon overlay", () => {
    expect(stableIconSource).toContain('stop-color="#61358a"');
    expect(stableIconSource).toContain("M141 350c-53-75-28-183");
    expect(stableIconSource).not.toContain(">DEV<");
    expect(developmentIconSource).toContain('stop-color="#61358a"');
    expect(developmentIconSource).toContain("M141 350c-53-75-28-183");
    expect(developmentIconSource).toContain(">DEV<");
    expect(appSource).toContain('import appIconUrl from "../../src-tauri/icons/icon.svg"');
    expect(appSource).not.toContain("devAppIconUrl");
    expect(appSource).toContain('className="brand-channel-badge"');
  });

  it("always pairs channel commands with the closed native launcher", () => {
    for (const command of [
      scripts["tauri:dev"],
      scripts["tauri:user"],
      scripts["tauri:build:dev"],
      scripts["tauri:build:user"],
    ]) {
      expect(command).toContain("scripts/nautilus_channel.mjs");
    }
    expect(scripts["import:mirror"]).toContain("scripts/nautilus_channel.mjs import-user");
    expect(channelLauncher).toContain('"src-tauri/tauri.dev.conf.json"');
    expect(channelLauncher).toContain('"development-channel"');
    expect(channelLauncher).toContain('MIRROR_USER: "mirror-dev"');
    expect(channelLauncher).toContain('NAUTILUS_APP_IDENTIFIER: "com.nautilus.harness.dev"');
    expect(channelLauncher).toContain('mirrorRoot: resolve(home, ".mirror-journeys", "mirror-mind", "mirror-dev")');
    expect(channelLauncher).toContain('"scripts/export_mirror_bootstrap.py"');
    expect(channelLauncher).toContain('"--mirror-root"');
    expect(channelLauncher).toContain('"com.nautilus.harness.dev"');
  });

  it("routes Mirror operations through the closed native profile without production fallback", () => {
    expect(runtimeChannelSource).toContain('.join(".mirror-journeys")');
    expect(runtimeChannelSource).toContain('.join("mirror-mind")');
    expect(runtimeChannelSource).toContain('.join("mirror-dev")');
    expect(runtimeChannelSource).toContain('.env("MIRROR_HOME"');
    expect(runtimeChannelSource).toContain('.env("MIRROR_USER"');
    expect(runtimeChannelSource).toContain('.env("DB_PATH"');
    expect(runtimeChannelSource).toContain('.env("PATH"');
    expect(runtimeChannelSource).toContain('runtime_command("pi")');
    expect(runtimeChannelSource).toContain('runtime_command("uv")');
    expect(rustSource).toContain("mirror_runtime_command");
    expect(rustSource).not.toContain('PathBuf::from("/Users/alissonvale/mirror")');
    expect(rustSource).not.toContain("Ok(mirror_root)\n    } else {\n        harness_root()");
    expect(provisionScript).toContain('parser.add_argument("--mirror-root", type=Path, required=True)');
    expect(provisionScript).not.toContain('Path.home() / "mirror" / "src"');
  });

  it("renders a textual development identity and bounded runtime diagnostics", () => {
    expect(appSource).toContain('className="development-badge"');
    expect(appSource).toContain('const DEVELOPMENT_BADGE_LABEL = "DEV LAB";');
    expect(appSource).toContain("runtime-channel-diagnostic");
    expect(appSource).toContain("data-runtime-channel");
    expect(cssSource).toContain(".app-shell.channel-development");
  });

  it("promotes a validated stable bundle only through the explicit macOS installer", () => {
    expect(scripts["promote:production"]).toContain("scripts/promote_production.mjs");
    expect(productionPromotion).toContain('"npm", ["test"]');
    expect(productionPromotion).toContain('"npm", ["run", "tauri:build:user"]');
    expect(productionPromotion).toContain('EXPECTED_BUNDLE_ID = "com.nautilus.harness"');
    expect(productionPromotion).toContain('resolve("/Applications", "Nautilus Harness.app")');
    expect(productionPromotion).toContain("CFBundleIdentifier");
    expect(productionPromotion).toContain("assertCleanWorktree");
  });

  it("keeps one discoverable canonical setup guide for humans and agents", () => {
    expect(readmeSource).toContain("docs/development/environment-setup.md");
    expect(agentsSource).toContain("docs/development/environment-setup.md");
    expect(setupGuide).toContain("npm run tauri:dev");
    expect(setupGuide).toContain("$HOME/.mirror-journeys/mirror-mind/mirror-dev");
    expect(setupGuide).toContain("com.nautilus.harness.dev");
    expect(setupGuide).toContain("npm run promote:production");
    expect(setupGuide).toContain("/Applications/Nautilus Harness.app");
  });
});
