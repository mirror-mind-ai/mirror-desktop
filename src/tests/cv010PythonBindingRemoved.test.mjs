import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// CV-010.DS-005 slice 2f-2: the 0.3 line binds a marked home only (2c), so the 0.2 line's Python
// binding, its discovery (DS-001) and the Python import scripts are removed rather than left
// unreachable. Nothing that names a Mirror source tree, a Mirror user or a Python Mirror remains
// on a route the app or its launch scripts can take.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(join(root, path), "utf8");

const REMOVED_FILES = [
  "src-tauri/src/mirror_discovery.rs",
  "src/app/MirrorDiscoveryCard.tsx",
  "src/domain/mirrorDiscovery.ts",
  "scripts/runtime_binding_file.mjs",
  "scripts/export_mirror_bootstrap.py",
  "scripts/log_mirror_conversation.py",
  "scripts/tests/test_export_mirror_bootstrap.py",
  "scripts/tests/test_runtime_binding_file.py",
  "scripts/tests/test_mirror_conversation_catalog_rebind.py",
];

const REMOVED_COMMANDS = [
  "inspect_runtime_binding_candidate",
  "discover_existing_mirror",
  "validate_runtime_binding",
  "save_runtime_binding",
];

function rustSources() {
  const directory = join(root, "src-tauri", "src");
  return readdirSync(directory).filter((name) => name.endsWith(".rs")).map((name) => read(`src-tauri/src/${name}`)).join("\n");
}

describe("the 0.2 line's Python binding is gone from the 0.3 line", () => {
  it("deletes the binding, discovery and Python import files", () => {
    for (const path of REMOVED_FILES) expect(existsSync(join(root, path)), path).toBe(false);
  });

  it("registers and defines none of the binding commands, and the front calls none", () => {
    const rust = rustSources();
    const front = read("src/app/runtimeChannelStorage.ts") + read("src/app/App.tsx");
    for (const command of REMOVED_COMMANDS) {
      expect(rust).not.toMatch(new RegExp(`\\bfn ${command}\\(`));
      expect(front).not.toContain(`"${command}"`);
    }
    expect(rust).not.toContain("mod mirror_discovery");
    expect(rust).not.toMatch(/\bstruct RuntimeBinding\b|\bValidatedRuntimeBinding\b|fn from_validated\b|fn environment_candidate\b/);
    expect(rust).not.toContain("runtime-compatibility.json");
    expect(JSON.parse(read("config/runtime-compatibility.json"))).toEqual({ schemaVersion: "1.0.0", minimumMacOS: "12.0.0" });
  });

  it("keeps no Python binding state in the app", () => {
    const app = read("src/app/App.tsx");
    for (const name of ["submitRuntimeBinding", "fillRuntimeBindingFromDiscovery", "runtimeMirrorRoot", "runtimeBindingDraft", "inspectRuntimeBindingCandidate", "discoverExistingMirror"]) {
      expect(app, name).not.toContain(name);
    }
  });

  it("launch scripts run no Python Mirror and import nothing from one", () => {
    const launcher = read("scripts/mirror_desktop_channel.mjs");
    expect(launcher).not.toMatch(/python3|export_mirror_bootstrap|loadRuntimeBinding|import-user|import-dev/);
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(Object.keys(scripts).filter((name) => name.startsWith("import:"))).toEqual([]);
  });
});
