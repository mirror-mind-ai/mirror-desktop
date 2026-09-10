// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import stableConfig from "../../src-tauri/tauri.conf.json";
import developmentConfig from "../../src-tauri/tauri.dev.conf.json";
import alphaUpdaterConfig from "../../src-tauri/tauri.alpha-update.conf.json";
import rustSource from "../../src-tauri/src/main.rs?raw";
import runtimeBindingSource from "../../src-tauri/src/runtime_binding.rs?raw";
import runtimeChannelSource from "../../src-tauri/src/runtime_channel.rs?raw";
import appSource from "../app/App.tsx?raw";
import journeyPreferenceSource from "../domain/journeyPreferencePersistence.ts?raw";
import provisionScript from "../../scripts/provision_mirror_conversation.py?raw";
import channelLauncher from "../../scripts/mirror_desktop_channel.mjs?raw";
import bindingFileContract from "../../scripts/runtime_binding_file.mjs?raw";
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
    expect(stableConfig.identifier).toBe("ai.mirrormind.desktop");
    expect(stableConfig.productName).toBe("Mirror Desktop");
    expect(developmentConfig.identifier).toBe("ai.mirrormind.desktop.dev");
    expect(developmentConfig.productName).toBe("Mirror Desktop Dev");
    expect(developmentConfig.bundle.icon).toContain("icons/dev/icon.png");
    expect(runtimeChannelSource).toContain("apply_macos_dock_icon");
    expect(runtimeChannelSource).toContain("setApplicationIconImage");
    expect(runtimeChannelSource).toContain('include_bytes!("../icons/dev/icon.png")');
  });

  it("uses the Mirror Desktop mirror artwork with DEV as the only channel overlay", () => {
    expect(stableIconSource).toContain("Mirror Desktop icon");
    expect(stableIconSource).toContain('<ellipse cx="256" cy="246" rx="124" ry="156"');
    expect(stableIconSource).toContain('<circle cx="256" cy="246" r="12"');
    expect(stableIconSource).not.toContain("Nautilus Harness icon");
    expect(stableIconSource).not.toContain(">DEV<");
    expect(developmentIconSource).toContain("Mirror Desktop Dev icon");
    expect(developmentIconSource).toContain('<ellipse cx="256" cy="246" rx="124" ry="156"');
    expect(developmentIconSource).toContain('<circle cx="256" cy="246" r="12"');
    expect(developmentIconSource).not.toContain("Nautilus Harness Dev icon");
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
      expect(command).toContain("scripts/mirror_desktop_channel.mjs");
    }
    expect(scripts["import:mirror"]).toContain("scripts/mirror_desktop_channel.mjs import-user");
    expect(scripts["import:mirror:dev"]).toContain("scripts/mirror_desktop_channel.mjs import-dev");
    expect(scripts["validate:desktop:launch"]).toContain("scripts/mirror_desktop_channel.mjs validate-desktop");
    expect(channelLauncher).toContain('"src-tauri/tauri.dev.conf.json"');
    expect(channelLauncher).toContain('"development-channel"');
    expect(channelLauncher).toContain("loadRuntimeBinding(profile)");
    expect(bindingFileContract).toContain('"runtime-binding.v1.json"');
    expect(bindingFileContract).toContain("requireCanonicalPath(binding.dbPath");
    expect(bindingFileContract).toContain('basename(binding.dbPath) !== "memory.db"');
    expect(channelLauncher).not.toContain("alisson-vale");
    expect(channelLauncher).not.toContain('MIRROR_USER: "mirror-dev"');
    expect(channelLauncher).toContain('"scripts/export_mirror_bootstrap.py"');
    expect(channelLauncher).toContain('"--mirror-root"');
    expect(channelLauncher).toContain('"ai.mirrormind.desktop.dev"');
    expect(channelLauncher).toContain('mode === "import-user" || mode === "import-dev"');
    expect(channelLauncher).toContain('const inheritedMirrorEnvironment = ["MIRROR_HOME", "MIRROR_USER", "DB_PATH"]');
    expect(channelLauncher).toContain('delete environment[name]');
    expect(channelLauncher).toContain('return { ...environment, ...extra };');
    expect(channelLauncher).toContain('"Mirror Desktop.app"');
    expect(channelLauncher).toContain('"Mirror Desktop Dev.app"');
  });

  it("initializes the updater only for channels with an updater contract", () => {
    expect(runtimeChannelSource).toContain("pub fn supports_updater(self) -> bool");
    expect(runtimeChannelSource).toContain("matches!(self, Self::User)");
    expect(rustSource).toContain("if channel.supports_updater()");
    expect(rustSource).toContain("tauri_plugin_updater::Builder::new().build()");
  });

  it("makes every generic user-channel route carry the trusted alpha updater contract", () => {
    expect(alphaUpdaterConfig.bundle.createUpdaterArtifacts).toBe(true);
    expect(alphaUpdaterConfig.plugins.updater.endpoints).toEqual([
      "https://updates.mirrormind.sh/mirror-desktop/alpha/{{target}}/{{current_version}}/latest.json",
    ]);
    expect(alphaUpdaterConfig.plugins.updater.pubkey).not.toHaveLength(0);
    expect(channelLauncher.match(/"src-tauri\/tauri\.alpha-update\.conf\.json"/g)).toHaveLength(2);
    expect(channelLauncher).toContain('const defaultUserSigningKey = resolve(process.env.HOME ?? "", ".mirror-desktop-updater", "alpha", "updater.key")');
    expect(channelLauncher).toContain('TAURI_SIGNING_PRIVATE_KEY: readFileSync(signingKey, "utf8")');
    expect(channelLauncher).toContain('User-channel build requires the trusted updater signing key');
  });

  it("routes Mirror operations through a persisted binding without production fallback", () => {
    expect(runtimeChannelSource).toContain("load_runtime_binding");
    expect(runtimeChannelSource).toContain('join(channel.bundle_identifier())');
    expect(runtimeChannelSource).not.toContain("alisson-vale");
    expect(runtimeChannelSource).toContain('.env("MIRROR_HOME"');
    expect(runtimeChannelSource).toContain('.env("MIRROR_USER"');
    expect(runtimeChannelSource).toContain('.env("DB_PATH"');
    expect(runtimeChannelSource).toContain('.env("PATH"');
    expect(runtimeChannelSource).toContain('matches!(program, "pi" | "uv")');
    expect(runtimeChannelSource).toContain('.nvm/versions/node');
    expect(runtimeChannelSource).toContain('.fnm/node-versions');
    expect(runtimeChannelSource).toContain('.volta/bin');
    expect(runtimeChannelSource).toContain('discover_versioned_runtime_directories');
    expect(runtimeBindingSource).toContain('resolve_pi_toolchain');
    expect(runtimeBindingSource).toContain('executable_at(directory, "node")');
    expect(rustSource).toContain("mirror_runtime_command");
    expect(rustSource).not.toContain('PathBuf::from("/Users/alissonvale/mirror")');
    expect(rustSource).not.toContain("Ok(mirror_root)\n    } else {\n        harness_root()");
    expect(JSON.stringify(stableConfig.bundle)).toContain("scripts/provision_mirror_conversation.py");
    expect(rustSource).toContain("BaseDirectory::Resource");
    expect(rustSource).toContain('resolve("scripts/provision_mirror_conversation.py"');
    expect(rustSource).toContain('"Mirror conversation provisioning did not complete."');
    expect(rustSource).not.toContain('format!("Mirror conversation provisioning failed: {}"');
    expect(rustSource).not.toContain('env!("CARGO_MANIFEST_DIR")).parent()\n        .ok_or_else(|| "Could not resolve Mirror Desktop project root."');
    expect(provisionScript).toContain('parser.add_argument("--mirror-root", type=Path, required=True)');
    expect(provisionScript).not.toContain('Path.home() / "mirror" / "src"');
  });

  it("renders a textual development identity and bounded runtime diagnostics", () => {
    expect(appSource).toContain('className="development-badge"');
    expect(appSource).toContain('const DEVELOPMENT_BADGE_LABEL = "DEV LAB";');
    expect(appSource).not.toContain("Journey Navigation");
    expect(appSource).not.toContain("PRODUCT_DESCRIPTOR");
    expect(appSource).toContain("<strong>Mirror Desktop ");
    expect(appSource).not.toContain("<strong>Nautilus ");
    expect(appSource).not.toContain("Using Harness agent defaults.");
    expect(appSource).not.toContain("channel-local Nautilus storage");
    expect(appSource).not.toContain("Dedicated Nautilus conversation");
    expect(appSource).not.toContain('developmentChannel ? "npm run import:mirror:dev" : "npm run import:mirror"');
    expect(appSource).not.toContain('"Development cockpit"');
    expect(appSource).not.toContain('"Journey cockpit"');
    expect(appSource).toContain("runtime-channel-diagnostic");
    expect(appSource).toContain("data-runtime-channel");
    expect(appSource).toContain("Connect your Mirror");
    expect(appSource).toContain("Mirror source directory");
    expect(appSource).toContain("Mirror home directory");
    expect(appSource).toContain("Validate and continue");
    expect(appSource).toContain("Choose your model");
    expect(appSource).toContain("Save model and continue");
    expect(appSource).toContain("saveOnboardingAgentProfile");
    expect(appSource).toContain("agentProfileConfigured !== true");
    expect(appSource).toContain("piModelCatalog.map");
    expect(appSource).toContain("await refreshJourneyRegistry()");
    expect(appSource).toContain("Mirror was connected, but Journeys couldn’t be loaded.");
    expect(appSource).not.toContain("No Journey registry loaded");
    expect(appSource).not.toContain("runtimeChannelError || runtimeChannel?.message");
    expect(appSource).not.toContain('?? "nautilus-harness"');
    expect(journeyPreferenceSource).not.toContain('activeJourneyId: "nautilus-harness"');
    expect(appSource).toContain("Choose Mirror source and home, then enter the Mirror user.");
    expect(appSource.match(/autoCapitalize="none" autoCorrect="off" spellCheck=\{false\}/g)).toHaveLength(2);
    expect(cssSource).toContain(".runtime-onboarding-shell");
    expect(cssSource).toContain(".runtime-onboarding-card");
    expect(cssSource).toContain(".app-shell.channel-development");
    expect(cssSource).toContain('[data-application-theme="tide"]');
    expect(cssSource).toContain('[data-application-theme="violet"]');
    expect(cssSource).toContain('[data-application-theme="ember"]');
    expect(cssSource).toContain('[data-application-theme="forest"]');
    expect(cssSource).toContain('[data-application-theme="slate"]');
    expect(cssSource).not.toContain("--ui-accent: var(--ui-accent)");
  });

  it("promotes a validated stable bundle only through the explicit macOS installer", () => {
    expect(scripts["promote:production"]).toContain("scripts/promote_production.mjs");
    expect(productionPromotion).toContain('"npm", ["test"]');
    expect(productionPromotion).toContain('"npm", ["run", "tauri:build:user"]');
    expect(productionPromotion).toContain('EXPECTED_BUNDLE_ID = "ai.mirrormind.desktop"');
    expect(productionPromotion).toContain('resolve("/Applications", "Mirror Desktop.app")');
    expect(productionPromotion).not.toContain('resolve("/Applications", "Nautilus Harness.app")');
    expect(productionPromotion).toContain("CFBundleIdentifier");
    expect(productionPromotion).toContain("assertCleanWorktree");
  });

  it("keeps one discoverable canonical setup guide for humans and agents", () => {
    expect(readmeSource).toContain("docs/development/environment-setup.md");
    expect(agentsSource).toContain("docs/development/environment-setup.md");
    expect(setupGuide).toContain("npm run tauri:dev");
    expect(setupGuide).toContain("$HOME/.mirror-journeys/mirror-mind/mirror-dev");
    expect(setupGuide).toContain("ai.mirrormind.desktop.dev");
    expect(setupGuide).toContain("npm run promote:production");
    expect(setupGuide).toContain("/Applications/Mirror Desktop.app");
  });
});
