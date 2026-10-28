import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CURRENT_RELEASE_LINE,
  RELEASE_LINES,
  assertReleaseLine,
  releaseLineFor,
} from "../../scripts/release_line.mjs";
import { deriveRetainedVersions, evidenceSlug } from "../../scripts/release_deploy.mjs";
import { defaultBaseUrl, deriveBaseUrlFromUpdaterConfig } from "../../scripts/private_update_publish.mjs";
import { alphaBuildPlan } from "../../scripts/alpha_build.mjs";
import { inspectSelfUpdateConfig } from "../../scripts/self_update_preflight.mjs";

/**
 * CV-010.DS-005 phase 0: the 0.3 line (Mirror Desktop TS) and the frozen 0.2 line never meet.
 *
 * Production polls the 0.2 channel, and publication writes a manifest for every retained
 * version under the line's base URL. A 0.3 build on the 0.2 channel would be installed over
 * production; a 0.3 build under the 0.2 identifier would open production's app data. Every
 * check here exists to make one of those two crossings impossible rather than unlikely.
 */

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const LINE_02 = {
  version: "0.2.0-alpha.59",
  baseUrl: "https://updates.mirrormind.sh/mirror-desktop/alpha",
  identifier: "ai.mirrormind.desktop",
  productName: "Mirror Desktop",
};
const LINE_03 = {
  version: "0.3.0-alpha.1",
  baseUrl: "https://updates.mirrormind.sh/mirror-desktop/ts",
  identifier: "ai.mirrormind.desktop.ts",
  productName: "Mirror Desktop TS",
};

describe("the release-line table", () => {
  it("declares exactly the frozen 0.2 line and the 0.3 TypeScript line", () => {
    expect(RELEASE_LINES.map((line) => line.line)).toEqual(["0.2", "0.3"]);
    expect(RELEASE_LINES[0]).toMatchObject({ baseUrl: LINE_02.baseUrl, identifier: LINE_02.identifier, productName: LINE_02.productName });
    expect(RELEASE_LINES[1]).toMatchObject({ baseUrl: LINE_03.baseUrl, identifier: LINE_03.identifier, productName: LINE_03.productName });
    expect(CURRENT_RELEASE_LINE.line).toBe("0.3");
    expect(Object.isFrozen(RELEASE_LINES)).toBe(true);
    expect(RELEASE_LINES.every((line) => Object.isFrozen(line))).toBe(true);
  });

  it("finds a version's line by its major.minor and refuses versions of no line", () => {
    expect(releaseLineFor("0.2.0-alpha.58").line).toBe("0.2");
    expect(releaseLineFor("v0.3.0-alpha.1").line).toBe("0.3");
    expect(() => releaseLineFor("0.4.0")).toThrow(/no release line/i);
    expect(() => releaseLineFor("0.30.0")).toThrow(/no release line/i);
  });

  it("accepts each line on its own channel and identity (positive controls)", () => {
    expect(assertReleaseLine(LINE_02).line).toBe("0.2");
    expect(assertReleaseLine(LINE_03).line).toBe("0.3");
    expect(assertReleaseLine({ ...LINE_03, baseUrl: `${LINE_03.baseUrl}/` }).line).toBe("0.3");
  });

  it("refuses a 0.3 version on the 0.2 channel, naming the line and the channel", () => {
    expect(() => assertReleaseLine({ ...LINE_03, baseUrl: LINE_02.baseUrl }))
      .toThrow(/0\.3.*mirror-desktop\/alpha|mirror-desktop\/alpha.*0\.3/);
  });

  it("refuses a 0.2 version on the 0.3 channel", () => {
    expect(() => assertReleaseLine({ ...LINE_02, baseUrl: LINE_03.baseUrl }))
      .toThrow(/0\.2.*mirror-desktop\/ts|mirror-desktop\/ts.*0\.2/);
  });

  it("refuses an identity that belongs to the other line", () => {
    expect(() => assertReleaseLine({ ...LINE_03, identifier: LINE_02.identifier })).toThrow(/identifier/);
    expect(() => assertReleaseLine({ ...LINE_03, productName: LINE_02.productName })).toThrow(/product name/i);
    expect(() => assertReleaseLine({ ...LINE_02, identifier: LINE_03.identifier })).toThrow(/identifier/);
  });
});

describe("the 0.3 line's configuration", () => {
  const stable = json("src-tauri/tauri.conf.json");
  const development = json("src-tauri/tauri.dev.conf.json");
  const evaluation = json("src-tauri/tauri.eval.conf.json");
  const updater = json("src-tauri/tauri.ts-update.conf.json");
  const packageJson = json("package.json");

  it("carries a 0.3 version that agrees with the current line", () => {
    expect(packageJson.version).toBe(stable.version);
    expect(releaseLineFor(stable.version)).toBe(CURRENT_RELEASE_LINE);
  });

  it("uses the TS identity in every channel and never the 0.2 app-data folders", () => {
    expect(stable).toMatchObject({ identifier: "ai.mirrormind.desktop.ts", productName: "Mirror Desktop TS" });
    expect(stable.app.windows[0].title).toBe("Mirror Desktop TS");
    expect(development).toMatchObject({ identifier: "ai.mirrormind.desktop.ts.dev", productName: "Mirror Desktop TS Dev" });
    expect(development.app.windows[0].title).toBe("Mirror Desktop TS Dev");
    expect(evaluation).toMatchObject({ identifier: "ai.mirrormind.desktop.ts", productName: "Mirror Desktop TS Eval" });
    expect(evaluation.app.windows[0].title).toBe("Mirror Desktop TS Eval");
  });

  it("polls only the TS channel, and the 0.2 updater configuration is gone from this line", () => {
    expect(updater.plugins.updater.endpoints).toEqual([
      "https://updates.mirrormind.sh/mirror-desktop/ts/{{target}}/{{current_version}}/latest.json",
    ]);
    expect(deriveBaseUrlFromUpdaterConfig(updater)).toBe(CURRENT_RELEASE_LINE.baseUrl);
    expect(defaultBaseUrl).toBe(CURRENT_RELEASE_LINE.baseUrl);
    expect(existsSync("src-tauri/tauri.alpha-update.conf.json")).toBe(false);
    expect(packageJson.scripts["alpha:channel:check"]).toContain("src-tauri/tauri.ts-update.conf.json");
  });

  it("passes the self-update preflight as the TS product, and the 0.2 identity does not", () => {
    const merged = { ...stable, ...updater, bundle: { ...stable.bundle, ...updater.bundle } };
    expect(inspectSelfUpdateConfig(merged).status).toBe("ready");
    const asLine02 = { ...merged, identifier: LINE_02.identifier, productName: LINE_02.productName };
    expect(inspectSelfUpdateConfig(asLine02).status).toBe("blocked");
  });

  it("builds and promotes the TS bundle, never /Applications/Mirror Desktop.app", () => {
    const plan = alphaBuildPlan({ version: "0.3.0-alpha.1" });
    expect(plan.config).toBe("src-tauri/tauri.ts-update.conf.json");
    expect(plan.app).toBe("src-tauri/target/release/bundle/macos/Mirror Desktop TS.app");
    expect(plan.dmg).toBe("src-tauri/target/release/bundle/dmg/Mirror Desktop TS_0.3.0-alpha.1_x64.dmg");
    expect(plan.updaterArtifact).toBe("src-tauri/target/release/bundle/macos/Mirror Desktop TS.app.tar.gz");
    const promotion = read("scripts/promote_production.mjs");
    expect(promotion).toContain("CURRENT_RELEASE_LINE");
    expect(promotion).not.toMatch(/"Mirror Desktop\.app"|"ai\.mirrormind\.desktop"/);
  });
});

describe("the release route keeps the lines apart", () => {
  const tags = ["v0.2.0-alpha.1", "v0.2.0-alpha.57", "v0.2.0-alpha.58", "v0.3.0-alpha.1", "not-a-version"];

  it("retains only the same line's earlier versions", () => {
    expect(deriveRetainedVersions({ version: "0.3.0-alpha.2", tags })).toEqual(["0.3.0-alpha.1", "0.3.0-alpha.2"]);
    expect(deriveRetainedVersions({ version: "0.3.0-alpha.1", tags: tags.slice(0, 3) })).toEqual(["0.3.0-alpha.1"]);
    // Control: the 0.2 line still retains every earlier 0.2 version and nothing above it.
    expect(deriveRetainedVersions({ version: "0.2.0-alpha.59", tags }))
      .toEqual(["0.2.0-alpha.1", "0.2.0-alpha.57", "0.2.0-alpha.58", "0.2.0-alpha.59"]);
  });

  it("ignores tags of no known line, and refuses to release a version of no line", () => {
    expect(deriveRetainedVersions({ version: "0.3.0-alpha.2", tags: ["v0.1.0", "v0.4.0", ...tags] }))
      .toEqual(["0.3.0-alpha.1", "0.3.0-alpha.2"]);
    expect(() => deriveRetainedVersions({ version: "0.1.0", tags: [] })).toThrow(/no release line/i);
  });

  it("names 0.3 evidence so it never overwrites the 0.2 alpha-N records", () => {
    expect(evidenceSlug("0.2.0-alpha.58")).toBe("alpha-58");
    expect(evidenceSlug("0.3.0-alpha.1")).toBe("v0.3.0-alpha.1");
  });

  it("checks the line at prepare and again at publish", () => {
    const route = read("scripts/release_deploy.mjs");
    const context = route.slice(route.indexOf("function deployContext"), route.indexOf("function preparationActions"));
    expect(context).toContain("assertReleaseLine(");
    // The definition plus its three callers: prepare, publish and plan.
    expect(route.match(/deployContext\(options\)/g)).toHaveLength(4);
    for (const stage of ["async function prepare", "async function publish"]) {
      const body = route.slice(route.indexOf(stage), route.indexOf("\n}\n", route.indexOf(stage)));
      expect(body, stage).toContain("deployContext(options)");
    }
  });
});

describe("census: 0.2 identities appear nowhere in the 0.3 line's channel code", () => {
  // The release-line table is the only place allowed to name the 0.2 line, so the guard can
  // refuse it. Read-only diagnostics of production's 0.2 app data, and the RS018/RS019
  // harnesses that produced 0.2-line evidence, are deliberately outside this census.
  const withoutTests = (source) => {
    const cut = source.indexOf("#[cfg(test)]");
    return cut < 0 ? source : source.slice(0, cut);
  };
  const census = {
    "package.json": read("package.json"),
    "src-tauri/tauri.conf.json": read("src-tauri/tauri.conf.json"),
    "src-tauri/tauri.dev.conf.json": read("src-tauri/tauri.dev.conf.json"),
    "src-tauri/tauri.eval.conf.json": read("src-tauri/tauri.eval.conf.json"),
    "src-tauri/tauri.ts-update.conf.json": read("src-tauri/tauri.ts-update.conf.json"),
    "src-tauri/src/runtime_channel.rs": withoutTests(read("src-tauri/src/runtime_channel.rs")),
    "src-tauri/src/main.rs": withoutTests(read("src-tauri/src/main.rs")),
    "src/app/runtimeChannelStorage.ts": read("src/app/runtimeChannelStorage.ts"),
    "scripts/mirror_desktop_channel.mjs": read("scripts/mirror_desktop_channel.mjs"),
    "scripts/alpha_build.mjs": read("scripts/alpha_build.mjs"),
    "scripts/self_update_preflight.mjs": read("scripts/self_update_preflight.mjs"),
    "scripts/private_update_publish.mjs": read("scripts/private_update_publish.mjs"),
    "scripts/promote_production.mjs": read("scripts/promote_production.mjs"),
    "scripts/release_deploy.mjs": read("scripts/release_deploy.mjs"),
  };
  const forbidden = [
    /ai\.mirrormind\.desktop(?!\.ts)(\.dev)?\b/,
    /mirror-desktop\/alpha\b/,
    /tauri\.alpha-update\.conf/,
    /Mirror Desktop(?! TS)( Dev| Eval)?\.app/,
    /"Mirror Desktop(?! TS)( Dev| Eval)"/,
  ];

  it("scans the expected files", () => {
    expect(Object.keys(census)).toHaveLength(14);
    expect(Object.values(census).every((source) => source.length > 0)).toBe(true);
  });

  it("finds none of the 0.2 identities", () => {
    const hits = Object.entries(census).flatMap(([file, source]) =>
      forbidden.filter((pattern) => pattern.test(source)).map((pattern) => `${file} ${pattern}`));
    expect(hits).toEqual([]);
  });

  it("would find them if they were there (negative control)", () => {
    for (const planted of ['"ai.mirrormind.desktop"', '"ai.mirrormind.desktop.dev"', "mirror-desktop/alpha/x", '"Mirror Desktop.app"', '"Mirror Desktop Eval"']) {
      expect(forbidden.some((pattern) => pattern.test(planted)), planted).toBe(true);
    }
    for (const allowed of ['"ai.mirrormind.desktop.ts"', '"ai.mirrormind.desktop.ts.dev"', '"Mirror Desktop TS.app"', '"Mirror Desktop TS Eval"', '"Mirror Desktop"']) {
      expect(forbidden.some((pattern) => pattern.test(allowed)), allowed).toBe(false);
    }
  });
});
