// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error Vitest runs in Node; production frontend has no Node dependency.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error The source-built preflight is a Node module outside the frontend graph.
import { checkMirrorHost, parseArguments, sanitizeOrigin, supportsMinimumMacOS } from "../../scripts/private_alpha_preflight.mjs";
// @ts-expect-error The pin script is a Node module outside the frontend graph.
import { readPin } from "../../scripts/mirror_host_pin.mjs";
import preflightSource from "../../scripts/private_alpha_preflight.mjs?raw";
import releaseDeploySource from "../../scripts/release_deploy.mjs?raw";

// @ts-expect-error Vitest runs in Node.
const root: string = join(import.meta.dirname, "..", "..");
const pin = readPin(root);
const platform = "darwin-x64";
const runtimeReady = existsSync(join(root, ".mirror-host", "runtime", platform, "pin-receipt.json"));

function goodHandshake() {
  return {
    handshake: { type: "ready", node: `v${pin.node.version}`, coreVersion: pin.core.version, desktopApiVersion: pin.core.desktopApiVersion },
    refusal: { id: 1, ok: false, error: { name: "HomeNotMarkedError", reason: "unmarked" } },
  };
}

describe("private alpha preflight", () => {
  it("parses only explicit bounded arguments, and no longer takes a Python Mirror's coordinates", () => {
    expect(parseArguments(["--json"])).toEqual({ json: true });
    expect(() => parseArguments(["--token", "secret"])).toThrow(/Unsupported/);
    expect(() => parseArguments(["--mirror-root", "/mirror"])).toThrow(/Unsupported/);
    expect(sanitizeOrigin("https://token@example.com/repository.git")).toBe("https://example.com/repository.git");
  });

  it("rejects Big Sur before dependency installation and accepts Monterey", () => {
    expect(supportsMinimumMacOS("11.7.11", "12.0.0")).toBe(false);
    expect(supportsMinimumMacOS("12.0.0", "12.0.0")).toBe(true);
    expect(supportsMinimumMacOS("12.7.6", "12.0.0")).toBe(true);
  });

  // CV-010.DS-005 slice 2f: the 0.3 line checks the pinned host, not uv and a Python checkout.
  it("requires neither uv nor a Python Mirror", () => {
    expect(preflightSource).not.toMatch(/capture\("uv"/);
    expect(preflightSource).not.toContain("pyproject");
    expect(preflightSource).not.toContain("mirrorCore");
    expect(preflightSource).toContain("const runtime = checkMirrorHost();");
    expect(releaseDeploySource).toContain('run("npm", ["run", "alpha:preflight"]);');
    expect(releaseDeploySource).not.toMatch(/mirror-root|mirrorRoot/);
  });

  it.skipIf(!runtimeReady)("accepts the materialized runtime: pinned handshake, and an unmarked home refused", () => {
    expect(checkMirrorHost({ root, platform })).toEqual({
      status: "pinned", platform, node: pin.node.version, coreVersion: pin.core.version,
      coreCommit: pin.core.commit, desktopApiVersion: pin.core.desktopApiVersion, markerGuard: "refuses unmarked homes",
    });
  });

  it.skipIf(!runtimeReady)("blocks a handshake that is not the pin's, and a host that does not refuse an unmarked home", () => {
    const with_ = (change: (answer: ReturnType<typeof goodHandshake>) => void) => () => {
      const answer = goodHandshake();
      change(answer);
      return answer;
    };
    expect(checkMirrorHost({ root, platform, probe: with_(() => {}) }).status).toBe("pinned");
    expect(() => checkMirrorHost({ root, platform, probe: with_((a) => { a.handshake.node = "v24.6.0"; }) })).toThrow(/handshake/);
    expect(() => checkMirrorHost({ root, platform, probe: with_((a) => { a.handshake.coreVersion = "0.36.0"; }) })).toThrow(/handshake/);
    expect(() => checkMirrorHost({ root, platform, probe: with_((a) => { a.handshake.desktopApiVersion = 2; }) })).toThrow(/handshake/);
    expect(() => checkMirrorHost({ root, platform, probe: with_((a) => { a.refusal = { id: 1, ok: true } as never; }) })).toThrow(/marker/);
    expect(() => checkMirrorHost({ root, platform, probe: with_((a) => { a.refusal.error.reason = "invalid_home"; }) })).toThrow(/marker/);
  });

  it("blocks a missing or stale runtime before starting anything", () => {
    let started = false;
    const probe = () => { started = true; return goodHandshake(); };
    expect(() => checkMirrorHost({ root, platform: "darwin-arm64-absent", probe })).toThrow(/not the pinned one: no runtime/);
    expect(started).toBe(false);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toContain(".mirror-host/");
  });
});
