import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { assertMarkedHome } from "../../mirror-host/host.mjs";
import { bindHome, createMarkedHome, targetProblem } from "../../scripts/dev_ts_home.mjs";
import { layoutHost, readPin } from "../../scripts/mirror_host_pin.mjs";

// CV-010.DS-005 phase 2, slice 2c: a development 0.3 home. The script creates the home through the
// laid-out host (so the core it creates with is the pinned one), then writes the 0.3 marker the host
// and the supervisor require. It never touches a path under ~/.mirror-minds, where the Python homes
// live, and never an existing path. `--bind` writes the 0.3 home binding into the TS Dev app data.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let runtimeDir;

beforeAll(() => {
  runtimeDir = join(realpathSync(mkdtempSync(join(tmpdir(), "dev-ts-home-runtime-"))), "host");
  layoutHost({ root, pin: readPin(root), outDir: runtimeDir });
});

function scratch(prefix) {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

describe("a development 0.3 home", () => {
  it("is created through the host, marked, and current", async () => {
    const parent = scratch("dev-ts-home-");
    const homePath = join(parent, "ana");
    const result = await createMarkedHome({ homePath, userName: "ana", runtimeDir, nodeBin: process.execPath });
    expect(result).toMatchObject({ homePath, dbPath: join(homePath, "memory.db"), state: "current" });
    const marker = JSON.parse(readFileSync(join(homePath, ".mirror-desktop", "home.json"), "utf8"));
    expect(Object.keys(marker).sort()).toEqual(["createdAt", "homeId", "line"]);
    expect(marker.line).toBe("0.3");
    expect(marker.homeId).toBe(result.homeId);
    expect(statSync(join(homePath, ".mirror-desktop", "home.json")).mode & 0o777).toBe(0o600);
    expect(statSync(join(homePath, ".mirror-desktop")).mode & 0o777).toBe(0o700);
    expect(() => assertMarkedHome(join(homePath, "memory.db"))).not.toThrow();
    expect(readdirSync(parent)).toEqual(["ana"]);
  });

  it("refuses the Python homes, an existing path, a relative path, a symlinked parent, and a missing parent", () => {
    const home = scratch("dev-ts-home-user-");
    mkdirSync(join(home, ".mirror-minds", "alisson-vale"), { recursive: true });
    const parent = scratch("dev-ts-home-targets-");
    mkdirSync(join(parent, "taken"));
    symlinkSync(join(home, ".mirror-minds"), join(parent, "minds-link"));
    const problem = (path) => targetProblem(path, home);
    expect(problem(join(home, ".mirror-minds", "new"))).toMatch(/\.mirror-minds/);
    expect(problem(join(home, ".mirror-minds", "alisson-vale"))).toMatch(/\.mirror-minds/);
    expect(problem(join(home, ".mirror-minds"))).toMatch(/\.mirror-minds/);
    expect(problem(join(parent, "minds-link", "new"))).toMatch(/symlink|\.mirror-minds/);
    expect(problem(join(parent, "taken"))).toMatch(/exists/);
    expect(problem("relative/home")).toMatch(/absolute/);
    expect(problem(join(parent, "missing", "home"))).toMatch(/parent/);
    expect(problem(join(parent, "fine"))).toBeNull();
  });

  it("refuses before creating anything", async () => {
    const parent = scratch("dev-ts-home-refused-");
    mkdirSync(join(parent, "taken"));
    await expect(createMarkedHome({ homePath: join(parent, "taken"), userName: "ana", runtimeDir, nodeBin: process.execPath }))
      .rejects.toThrow(/exists/);
    expect(readdirSync(join(parent, "taken"))).toEqual([]);
  });

  it("binds the TS Dev app to the home, and refuses to overwrite a binding", async () => {
    const parent = scratch("dev-ts-home-bind-");
    const homePath = join(parent, "ana");
    await createMarkedHome({ homePath, userName: "ana", runtimeDir, nodeBin: process.execPath });
    const appData = join(parent, "app-data");
    const path = bindHome({ homePath, appDataRoot: appData });
    expect(path).toBe(join(appData, "runtime-home.v2.json"));
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ schemaVersion: "2.0.0", homePath });
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(() => bindHome({ homePath, appDataRoot: appData })).toThrow(/already/);
    expect(() => bindHome({ homePath: join(parent, "unmarked"), appDataRoot: join(parent, "other") })).toThrow(/marked/);
    expect(existsSync(join(parent, "other", "runtime-home.v2.json"))).toBe(false);
  });

  it("never names the Python binding file", () => {
    const source = readFileSync(join(root, "scripts", "dev_ts_home.mjs"), "utf8");
    expect(source).not.toContain("runtime-binding.v1.json");
  });
});
