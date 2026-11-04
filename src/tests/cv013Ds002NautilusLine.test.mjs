import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURRENT_RELEASE_LINE,
  RELEASE_LINES,
  assertReleaseLine,
  releaseLineFor,
} from "../../scripts/release_line.mjs";
import { deriveRetainedVersions, evidenceSlug } from "../../scripts/release_deploy.mjs";
import {
  defaultBaseUrl,
  latestMacosDmgUrl,
  planPrivateUpdatePublication,
  updaterArtifactName,
  webRootForBaseUrl,
} from "../../scripts/private_update_publish.mjs";
import { alphaBuildPlan } from "../../scripts/alpha_build.mjs";
import { inspectSelfUpdateConfig } from "../../scripts/self_update_preflight.mjs";
import { parseRuntimeChannelDiagnostic } from "../app/runtimeChannelStorage";

/**
 * CV-013.DS-002 slice 1: main builds Nautilus for Mirror, release line 0.4, under its own
 * identifier, app-data folder and update channel. The 0.3 line (Mirror Desktop TS) is closed at
 * v0.3.0-alpha.16 and stays in the table only so the gate can refuse a crossing: a 0.4 build on the
 * 0.3 channel would be installed over the apps still on it, and a 0.4 build under the 0.3
 * identifier would open their app data.
 */

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const LINE_03 = {
  version: "0.3.0-alpha.17",
  baseUrl: "https://updates.mirrormind.sh/mirror-desktop/ts",
  identifier: "ai.mirrormind.desktop.ts",
  productName: "Mirror Desktop TS",
};
const LINE_04 = {
  version: "0.4.0-alpha.1",
  baseUrl: "https://updates.mirrormind.sh/nautilus",
  identifier: "ai.mirrormind.nautilus",
  productName: "Nautilus for Mirror",
};

describe("the Nautilus release line", () => {
  it("is the current line, after the frozen 0.2 and the closed 0.3", () => {
    expect(RELEASE_LINES.map((line) => line.line)).toEqual(["0.2", "0.3", "0.4"]);
    expect(CURRENT_RELEASE_LINE).toBe(RELEASE_LINES[2]);
    expect(CURRENT_RELEASE_LINE).toMatchObject({
      line: "0.4",
      productName: "Nautilus for Mirror",
      bundleName: "Nautilus",
      identifier: "ai.mirrormind.nautilus",
      baseUrl: "https://updates.mirrormind.sh/nautilus",
      updaterConfig: "src-tauri/tauri.nautilus-update.conf.json",
      artifactName: "Nautilus for Mirror",
      downloadAlias: "nautilus-latest.dmg",
    });
    // The closed 0.3 line keeps the names its channel already serves.
    expect(RELEASE_LINES[1]).toMatchObject({
      ...Object.fromEntries(Object.entries(LINE_03).filter(([key]) => key !== "version")),
      bundleName: "Mirror Desktop TS",
      artifactName: "Mirror Desktop",
      downloadAlias: "mirror-desktop-latest.dmg",
    });
    expect(RELEASE_LINES.every((line) => Object.isFrozen(line))).toBe(true);
  });

  it("finds 0.4 versions and still refuses versions of no line", () => {
    expect(releaseLineFor("v0.4.0-alpha.1").line).toBe("0.4");
    expect(releaseLineFor("0.3.0-alpha.16").line).toBe("0.3");
    expect(() => releaseLineFor("0.5.0")).toThrow(/no release line/i);
  });

  it("accepts 0.4 on its own channel and identity, and refuses every crossing with 0.3", () => {
    expect(assertReleaseLine(LINE_04).line).toBe("0.4");
    expect(() => assertReleaseLine({ ...LINE_04, baseUrl: LINE_03.baseUrl })).toThrow(/0\.4.*nautilus|mirror-desktop\/ts/);
    expect(() => assertReleaseLine({ ...LINE_03, baseUrl: LINE_04.baseUrl })).toThrow(/0\.3/);
    expect(() => assertReleaseLine({ ...LINE_04, identifier: LINE_03.identifier })).toThrow(/identifier/);
    expect(() => assertReleaseLine({ ...LINE_04, productName: LINE_03.productName })).toThrow(/product name/i);
  });

  it("retains only 0.4 versions when publishing 0.4", () => {
    const tags = ["v0.3.0-alpha.15", "v0.3.0-alpha.16", "v0.4.0-alpha.1"];
    expect(deriveRetainedVersions({ version: "0.4.0-alpha.2", tags })).toEqual(["0.4.0-alpha.1", "0.4.0-alpha.2"]);
    expect(evidenceSlug("0.4.0-alpha.1")).toBe("v0.4.0-alpha.1");
  });
});

describe("the Nautilus configuration", () => {
  const stable = json("src-tauri/tauri.conf.json");
  const development = json("src-tauri/tauri.dev.conf.json");
  const evaluation = json("src-tauri/tauri.eval.conf.json");
  const packageJson = json("package.json");

  it("names every build Nautilus for Mirror, with the short name in the menu", () => {
    expect(stable).toMatchObject({ identifier: "ai.mirrormind.nautilus", productName: "Nautilus for Mirror" });
    expect(stable.app.windows[0].title).toBe("Nautilus for Mirror");
    expect(stable.bundle.macOS.bundleName).toBe("Nautilus");
    expect(development).toMatchObject({ identifier: "ai.mirrormind.nautilus.dev", productName: "Nautilus for Mirror Dev" });
    expect(development.app.windows[0].title).toBe("Nautilus for Mirror Dev");
    expect(development.bundle.macOS.bundleName).toBe("Nautilus Dev");
    expect(evaluation).toMatchObject({ identifier: "ai.mirrormind.nautilus", productName: "Nautilus for Mirror Eval" });
    expect(evaluation.app.windows[0].title).toBe("Nautilus for Mirror Eval");
    expect(evaluation.bundle.macOS.bundleName).toBe("Nautilus Eval");
  });

  it("polls only the Nautilus channel, signed by the same publisher key", () => {
    const updater = json("src-tauri/tauri.nautilus-update.conf.json");
    expect(updater.plugins.updater.endpoints).toEqual([
      "https://updates.mirrormind.sh/nautilus/{{target}}/{{current_version}}/latest.json",
    ]);
    expect(updater.plugins.updater.pubkey).toBe(
      "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEZCNzUxN0UxNEI4QjU4NkMKUldSc1dJdEw0UmQxK3o4NlJVeHM4eDdvTVNnTDAyWCtFQ1pCNlNUL1R6ZldHQjlwS1JjRlJ2L08K",
    );
    expect(defaultBaseUrl).toBe("https://updates.mirrormind.sh/nautilus");
    expect(existsSync("src-tauri/tauri.ts-update.conf.json")).toBe(false);
    expect(packageJson.scripts["alpha:channel:check"]).toContain("src-tauri/tauri.nautilus-update.conf.json");
  });

  it("passes the self-update preflight as Nautilus, and the 0.3 identity does not", () => {
    const updater = json("src-tauri/tauri.nautilus-update.conf.json");
    const merged = { ...stable, ...updater, bundle: { ...stable.bundle, ...updater.bundle } };
    expect(inspectSelfUpdateConfig(merged).status).toBe("ready");
    const as03 = { ...merged, identifier: LINE_03.identifier, productName: LINE_03.productName };
    expect(inspectSelfUpdateConfig(as03).status).toBe("blocked");
  });

  it("builds the Nautilus bundle", () => {
    const plan = alphaBuildPlan({ version: "0.4.0-alpha.1" });
    expect(plan.config).toBe("src-tauri/tauri.nautilus-update.conf.json");
    expect(plan.app).toBe("src-tauri/target/release/bundle/macos/Nautilus for Mirror.app");
    expect(plan.dmg).toBe("src-tauri/target/release/bundle/dmg/Nautilus for Mirror_0.4.0-alpha.1_x64.dmg");
    expect(plan.updaterArtifact).toBe("src-tauri/target/release/bundle/macos/Nautilus for Mirror.app.tar.gz");
  });

  it("promotes by the menu name and the product name", () => {
    const promotion = read("scripts/promote_production.mjs");
    expect(promotion).toContain("CURRENT_RELEASE_LINE.bundleName");
    expect(promotion).toContain('bundleValue(appPath, "CFBundleName")');
    expect(promotion).toContain('bundleValue(appPath, "CFBundleDisplayName")');
  });
});

describe("the Nautilus publication", () => {
  it("writes under the update host's root by the channel's own path", () => {
    expect(webRootForBaseUrl("https://updates.mirrormind.sh/nautilus")).toBe("/var/www/mirror-desktop-updates/nautilus");
    // Controls: the paths the closed lines already publish to are unchanged.
    expect(webRootForBaseUrl("https://updates.mirrormind.sh/mirror-desktop/ts")).toBe("/var/www/mirror-desktop-updates/mirror-desktop/ts");
    expect(webRootForBaseUrl("https://updates.mirrormind.sh/mirror-desktop")).toBe("/var/www/mirror-desktop-updates/mirror-desktop");
    expect(() => webRootForBaseUrl("https://updates.mirrormind.sh/")).toThrow(/path/);
    expect(() => webRootForBaseUrl("https://updates.mirrormind.sh/a/../../etc")).toThrow(/path/);
  });

  it("names the artifact and the stable download after Nautilus", () => {
    expect(updaterArtifactName("0.4.0-alpha.1")).toBe("Nautilus for Mirror_0.4.0-alpha.1.app.tar.gz");
    expect(latestMacosDmgUrl()).toBe("https://updates.mirrormind.sh/nautilus/downloads/macos/nautilus-latest.dmg");
    const plan = planPrivateUpdatePublication({ version: "0.4.0-alpha.1", currentVersions: ["0.4.0-alpha.1"] });
    expect(plan.webRoot).toBe("/var/www/mirror-desktop-updates/nautilus");
    expect(plan.artifactUrl).toBe("https://updates.mirrormind.sh/nautilus/artifacts/Nautilus%20for%20Mirror_0.4.0-alpha.1.app.tar.gz");
  });

  it("verifies the stable download by the line's own alias", () => {
    const route = read("scripts/release_deploy.mjs");
    expect(route).not.toContain("mirror-desktop-latest.dmg");
    expect(route).toContain("latestMacosDmgUrl(");
    const publish = read("scripts/private_update_publish.mjs");
    expect(publish.match(/mirror-desktop-latest\.dmg/g) ?? []).toHaveLength(0);
    expect(publish).toContain("CURRENT_RELEASE_LINE.downloadAlias");
  });
});

describe("the Nautilus runtime identity", () => {
  const rust = read("src-tauri/src/runtime_channel.rs");
  const launcher = read("scripts/mirror_desktop_channel.mjs");

  it("accepts a diagnostic only under the Nautilus identifiers", () => {
    const base = {
      status: "unbound",
      message: "Nautilus is unbound.",
      appDataRoot: "/Users/example/Library/Application Support/ai.mirrormind.nautilus",
    };
    expect(parseRuntimeChannelDiagnostic({ ...base, channel: "user", productName: "Nautilus for Mirror", bundleIdentifier: "ai.mirrormind.nautilus" }).bundleIdentifier)
      .toBe("ai.mirrormind.nautilus");
    expect(parseRuntimeChannelDiagnostic({ ...base, channel: "development", productName: "Nautilus for Mirror Dev", bundleIdentifier: "ai.mirrormind.nautilus.dev" }).channel)
      .toBe("development");
    for (const identifier of ["ai.mirrormind.desktop.ts", "ai.mirrormind.desktop.ts.dev", "ai.mirrormind.desktop"]) {
      expect(() => parseRuntimeChannelDiagnostic({ ...base, channel: "user", productName: "x", bundleIdentifier: identifier }), identifier)
        .toThrow(/bundle identity/);
    }
  });

  it("names the channels Nautilus in the native profile and in the launcher", () => {
    for (const expected of ['"Nautilus for Mirror"', '"Nautilus for Mirror Dev"', '"Nautilus for Mirror Eval"', '"ai.mirrormind.nautilus"', '"ai.mirrormind.nautilus.dev"']) {
      expect(rust, expected).toContain(expected);
    }
    for (const expected of ['"Nautilus for Mirror.app"', '"Nautilus for Mirror Dev.app"', '"Nautilus for Mirror Eval.app"', '"ai.mirrormind.nautilus.dev"']) {
      expect(launcher, expected).toContain(expected);
    }
  });

  it("calls the header's build by the Nautilus names", () => {
    const app = read("src/app/App.tsx");
    expect(app).toContain('const buildName = developmentChannel ? "Nautilus for Mirror Dev"');
  });
});

describe("census: the 0.3 identities appear nowhere in the Nautilus line's channel code", () => {
  // The release-line table is the only place allowed to name the closed lines, so the guard can
  // refuse them. Tests, the 0.2 to 0.3 carry and the diagnostics of old app data are outside.
  const withoutTests = (source) => {
    const cut = source.indexOf("#[cfg(test)]");
    return cut < 0 ? source : source.slice(0, cut);
  };
  const census = {
    "package.json": read("package.json"),
    "src-tauri/tauri.conf.json": read("src-tauri/tauri.conf.json"),
    "src-tauri/tauri.dev.conf.json": read("src-tauri/tauri.dev.conf.json"),
    "src-tauri/tauri.eval.conf.json": read("src-tauri/tauri.eval.conf.json"),
    "src-tauri/tauri.nautilus-update.conf.json": existsSync("src-tauri/tauri.nautilus-update.conf.json") ? read("src-tauri/tauri.nautilus-update.conf.json") : "",
    "src-tauri/src/runtime_channel.rs": withoutTests(read("src-tauri/src/runtime_channel.rs")),
    "src/app/runtimeChannelStorage.ts": read("src/app/runtimeChannelStorage.ts"),
    "scripts/mirror_desktop_channel.mjs": read("scripts/mirror_desktop_channel.mjs"),
    "scripts/alpha_build.mjs": read("scripts/alpha_build.mjs"),
    "scripts/self_update_preflight.mjs": read("scripts/self_update_preflight.mjs"),
    "scripts/private_update_publish.mjs": read("scripts/private_update_publish.mjs"),
    "scripts/promote_production.mjs": read("scripts/promote_production.mjs"),
    "scripts/release_deploy.mjs": read("scripts/release_deploy.mjs"),
  };
  const forbidden = [
    /ai\.mirrormind\.desktop/,
    /mirror-desktop\/ts\b/,
    /tauri\.ts-update\.conf/,
    /Mirror Desktop TS/,
  ];

  it("finds none of them", () => {
    const hits = Object.entries(census).flatMap(([file, source]) =>
      forbidden.filter((pattern) => pattern.test(source)).map((pattern) => `${file} ${pattern}`));
    expect(hits).toEqual([]);
  });

  it("would find them if they were there (negative control)", () => {
    for (const planted of ['"ai.mirrormind.desktop.ts"', "mirror-desktop/ts/x", '"Mirror Desktop TS Eval.app"', "tauri.ts-update.conf.json"]) {
      expect(forbidden.some((pattern) => pattern.test(planted)), planted).toBe(true);
    }
    for (const allowed of ['"ai.mirrormind.nautilus"', "nautilus/x", '"Nautilus for Mirror.app"']) {
      expect(forbidden.some((pattern) => pattern.test(allowed)), allowed).toBe(false);
    }
  });
});

/**
 * Slice 2: the words the person reads say Nautilus. Every user-facing string that names the app,
 * in the interface, in the native messages, in the microphone permission and in the release
 * route's output, moves. Two kinds of "Mirror Desktop" stay on purpose:
 *
 * - the `product` schema name in update, release-reading and voice manifests, a wire contract
 *   between publisher and reader that nobody sees;
 * - labels written into stored data (the prompt envelope's marker, Pi session names), which
 *   slice 3 moves with readers that accept both forms.
 *
 * Comments, tests and the sample Journey in journeyAltitudePreview.ts (the project's own history)
 * are outside the census.
 */
describe("slice 2: the words the person reads", () => {
  const isComment = (line) => /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line);
  const contract = [
    /\bproduct\b.*"Mirror Desktop"/i,
    /PRODUCT: &str = "Mirror Desktop"|PRODUCT = "Mirror Desktop"/,
    /Manifest product must be Mirror Desktop/,
  ];
  const storedLabels = [/Mirror Desktop Journey authority/, /· Mirror Desktop/];
  const sourceFiles = () => {
    const files = [];
    for (const root of ["src/app", "src/domain", "src/agent"]) {
      for (const name of readdirSync(root, { recursive: true })) {
        if (/\.(ts|tsx)$/.test(name) && !name.endsWith("journeyAltitudePreview.ts")) files.push(`${root}/${name}`);
      }
    }
    for (const name of readdirSync("src-tauri/src")) if (name.endsWith(".rs")) files.push(`src-tauri/src/${name}`);
    files.push("src-tauri/Info.plist");
    for (const name of ["alpha_build", "private_update_publish", "release_candidate", "release_deploy", "release_notes", "self_update_preflight", "promote_production"]) {
      files.push(`scripts/${name}.mjs`);
    }
    return files;
  };
  const withoutRustTests = (file, source) => {
    if (!file.endsWith(".rs")) return source;
    const at = source.indexOf("\nmod tests {");
    return at === -1 ? source : source.slice(0, at);
  };
  const leftovers = (allowed) => sourceFiles().flatMap((file) =>
    withoutRustTests(file, read(file)).split("\n").flatMap((line, index) =>
      line.includes("Mirror Desktop") && !isComment(line) && !allowed.some((pattern) => pattern.test(line))
        ? [`${file}:${index + 1}: ${line.trim().slice(0, 120)}`]
        : []));

  it("leaves no visible Mirror Desktop outside the manifests' contract and the stored labels", () => {
    expect(leftovers([...contract, ...storedLabels])).toEqual([]);
  });

  it("asks for the microphone in Nautilus's name", () => {
    expect(read("src-tauri/Info.plist")).toContain("<string>Nautilus uses the microphone only when you explicitly start a voice recording.");
  });

  it("names the app in the first-run screens and the update notice", () => {
    expect(read("src/app/PiInstallStep.tsx")).toContain('<p className="eyebrow">Nautilus for Mirror</p>');
    expect(read("src/app/SelfUpdateNotification.tsx")).toContain("`Nautilus ${available.version} is available`");
  });

  it("keeps the other-build refusal one sentence on both sides of the bridge", () => {
    expect(read("src/domain/otherBuildRefusal.ts")).toContain('"This conversation belongs to another Nautilus build"');
    expect(read("src-tauri/src/main.rs")).toContain('"This conversation belongs to another Nautilus build: it was made by the {} build, and this is the {} build."');
  });
});
