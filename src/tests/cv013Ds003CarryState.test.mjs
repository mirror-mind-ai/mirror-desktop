import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { carry03State, defaultFolders } from "../../scripts/carry_03_state.mjs";

/**
 * CV-013.DS-003: the 0.3 app's state continues in Nautilus. The whole app data folder of Mirror
 * Desktop TS (ai.mirrormind.desktop.ts) is copied into Nautilus's (ai.mirrormind.nautilus): every
 * Mirror home's Desktop state, Pi and Claude Code as installed, the model settings, the OpenRouter
 * key file, the avatar and the home binding. The Mirror home itself does not move.
 *
 * Only the structural `piSessionFile` and `sessionFile` values that point into the old folder move;
 * the same path inside what the agent did and said is history and stays. A Conversation Segment
 * receipt verifies in the target exactly when it verified in the source: segments and manifests
 * whose bytes changed are hashed again only when their recorded hash held.
 */

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function write(path, content, mode) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
  if (mode !== undefined) chmodSync(path, mode);
}

/** A 0.3 app data folder with one home, as the app writes it. */
function fixture() {
  const support = mkdtempSync(join(tmpdir(), "cv013-ds003-"));
  roots.push(support);
  const source = join(support, "ai.mirrormind.desktop.ts");
  const target = join(support, "ai.mirrormind.nautilus");
  const home = join(source, "homes", "home-1");
  const session = (root) => `${root}/homes/home-1/pi-sessions/atelier/s-1.jsonl`;
  write(join(source, "agent-settings.json"), `${JSON.stringify({ schemaVersion: "1.1.0", globalProfile: { model: { provider: "p", model: "m" } } }, null, 2)}\n`);
  write(join(source, "runtime-home.v2.json"), JSON.stringify({ schemaVersion: "2.0.0", homePath: "/Users/ana/.mirror-minds/ana" }), 0o600);
  write(join(source, "openrouter-key.secret"), "sk-fixture-never-shown", 0o600);
  write(join(source, "openrouter-key.v1.json"), JSON.stringify({ declined: false }));
  write(join(source, "window-geometry.json"), JSON.stringify({ width: 1200 }));
  write(join(source, "user-avatar", "avatar.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]));
  write(join(source, "pi", "install.log"), `installed into ${source}/pi\n`);
  write(join(source, "pi", "pi-1.4.0-x", "install-receipt.json"), JSON.stringify({ bin: "dist/cli.js" }));
  write(join(source, "pi", "pi-1.4.0-x", "node_modules", "pi", "cli.js"), "#!/usr/bin/env node\n", 0o755);
  mkdirSync(join(source, "anthropic", "empty"), { recursive: true });
  // Any other folder is copied as it is, even when its JSON is not JSON (a tool's tsconfig).
  write(join(source, "anthropic.prev", "sdk", "tsconfig.json"), `{\n  // comments\n  "sessionFile": "${source}/homes/home-1/x"\n}\n`);
  // A Pi transcript: copied byte for byte, the old folder in its text included.
  write(session(source).replace(source, source), [
    JSON.stringify({ type: "session", cwd: "/Users/ana/.mirror-minds/ana" }),
    JSON.stringify({ type: "message", message: { content: `ls ${source}/homes` } }),
    JSON.stringify({ type: "message", message: { arguments: { sessionFile: session(source) } } }),
    "",
  ].join("\n"));
  write(join(home, "journey-threads", "atelier.json"), `${JSON.stringify({
    piSessionFile: session(source),
    output: `${source}/homes/home-1/pi-sessions`,
  }, null, 2)}\n`, 0o600);
  utimesSync(join(home, "journey-threads", "atelier.json"), new Date("2026-10-01T12:00:00Z"), new Date("2026-10-01T12:00:00Z"));
  write(join(home, "mirror-append-conflicts.jsonl"), `${JSON.stringify({ piSessionFile: session(source) })}\n${JSON.stringify({ note: "none" })}\n`);
  write(join(home, "mirror-append-outbox.json"), JSON.stringify({ items: [{ itemId: "i-1" }] }));
  // A Conversation Segment history: segment 1's receipt holds, segment 2's was already stale.
  const generation = join(home, "conversation-segments", "atelier", "t-1", "generation-1");
  const manifest = JSON.stringify({ segments: [{ segmentId: "segment-1" }, { segmentId: "segment-2" }], sessionFile: session(source) });
  const segment1 = JSON.stringify({ liveIdentity: { sessionFile: session(source) }, turns: [{ output: `cd ${source}` }] });
  const segment2 = JSON.stringify({ liveIdentity: { sessionFile: session(source) } });
  write(`${generation}.json`, manifest);
  write(join(`${generation}.segments`, "segment-1.json"), segment1);
  write(join(`${generation}.segments`, "segment-2.json"), segment2);
  write(join(`${generation}.segments`, "complete.json"), `${JSON.stringify({
    schemaVersion: "1.0.0", manifestSha256: sha(manifest),
    projectionHashes: [{ segmentId: "segment-1", sha256: sha(segment1) }, { segmentId: "segment-2", sha256: sha("stale") }],
  }, null, 2)}\n`);
  return { support, source, target, home, generation, session, noProcesses: () => [] };
}

/** Every file under `root`: its bytes' hash, mode and modification time; links are not followed. */
function snapshot(root) {
  const out = {};
  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      const stat = lstatSync(child);
      if (stat.isSymbolicLink()) out[relative(root, child)] = ["link"];
      else if (stat.isDirectory()) walk(child);
      else out[relative(root, child)] = [sha(readFileSync(child)), stat.mode, Math.floor(stat.mtimeMs)];
    }
  };
  walk(root);
  return out;
}

const json = (path) => JSON.parse(readFileSync(path, "utf8"));

describe("CV-013.DS-003: carry the 0.3 state into Nautilus", () => {
  it("defaults to the 0.3 folder and Nautilus's, for the user app and for development", () => {
    expect(defaultFolders({ support: "/S" })).toEqual({ source: "/S/ai.mirrormind.desktop.ts", target: "/S/ai.mirrormind.nautilus" });
    expect(defaultFolders({ support: "/S", dev: true })).toEqual({ source: "/S/ai.mirrormind.desktop.ts.dev", target: "/S/ai.mirrormind.nautilus.dev" });
  });

  it("only says what it would do without --write", async () => {
    const f = fixture();
    const plan = await carry03State({ sourceRoot: f.source, targetRoot: f.target, dryRun: true, runningApps: f.noProcesses });
    expect(existsSync(f.target)).toBe(false);
    expect(plan).toMatchObject({
      dryRun: true, homes: ["home-1"], keyFile: true, outboxWaiting: 1,
      rewritten: { files: 5, values: 5 },
      segments: { rehashed: 1, manifestsRehashed: 1, unverifiedKept: 1 },
    });
    expect(plan.files).toBe(Object.keys(snapshot(f.source)).length);
  });

  it("copies every file, moves the session paths into Nautilus's folder and leaves history alone", async () => {
    const f = fixture();
    await carry03State({ sourceRoot: f.source, targetRoot: f.target, runningApps: f.noProcesses });
    const before = snapshot(f.source);
    const after = snapshot(f.target);
    expect(Object.keys(after).sort()).toEqual([...Object.keys(before), "carried-from-0.3.json"].sort());
    for (const unchanged of [
      "openrouter-key.secret", "runtime-home.v2.json", "user-avatar/avatar.png", "pi/install.log",
      "pi/pi-1.4.0-x/node_modules/pi/cli.js", "homes/home-1/pi-sessions/atelier/s-1.jsonl", "anthropic.prev/sdk/tsconfig.json",
    ]) {
      expect(after[unchanged].slice(0, 2), unchanged).toEqual(before[unchanged].slice(0, 2));
    }
    expect(statSync(join(f.target, "openrouter-key.secret")).mode & 0o777).toBe(0o600);
    // A record whose paths moved keeps its mode and its time, as the copied ones do.
    expect(after["homes/home-1/journey-threads/atelier.json"].slice(1)).toEqual(before["homes/home-1/journey-threads/atelier.json"].slice(1));
    expect(statSync(join(f.target, "pi/pi-1.4.0-x/node_modules/pi/cli.js")).mode & 0o777).toBe(0o755);
    expect(existsSync(join(f.target, "anthropic", "empty"))).toBe(true);
    const thread = json(join(f.target, "homes/home-1/journey-threads/atelier.json"));
    expect(thread.piSessionFile).toBe(f.session(f.target));
    expect(thread.output).toBe(`${f.source}/homes/home-1/pi-sessions`);
    const conflicts = readFileSync(join(f.target, "homes/home-1/mirror-append-conflicts.jsonl"), "utf8").split("\n");
    expect(JSON.parse(conflicts[0]).piSessionFile).toBe(f.session(f.target));
    expect(conflicts[1]).toBe(JSON.stringify({ note: "none" }));
    // Only the moved value changes: the rest of the file keeps its bytes and layout.
    expect(readFileSync(join(f.target, "homes/home-1/journey-threads/atelier.json"), "utf8"))
      .toBe(readFileSync(join(f.source, "homes/home-1/journey-threads/atelier.json"), "utf8").replace(f.session(f.source), f.session(f.target)));
  });

  it("copies the same when the disk cannot clone", async () => {
    const f = fixture();
    const cloned = await carry03State({ sourceRoot: f.source, targetRoot: f.target, runningApps: f.noProcesses });
    const plain = await carry03State({ sourceRoot: f.source, targetRoot: join(f.support, "plain"), runningApps: f.noProcesses, clone: false });
    expect(cloned.cloned).toBe(true);
    expect(plain.cloned).toBe(false);
    const strip = (snap) => Object.fromEntries(Object.entries(snap).filter(([name]) => name !== "carried-from-0.3.json"));
    // The two targets differ only where paths name their own folder; modes and times agree everywhere.
    const source = snapshot(f.source);
    const target = strip(snapshot(f.target));
    const copied = strip(snapshot(join(f.support, "plain")));
    expect(Object.keys(copied).sort()).toEqual(Object.keys(source).sort());
    for (const [name, value] of Object.entries(copied)) {
      expect(value.slice(1), name).toEqual(source[name].slice(1));
      if (target[name][0] === source[name][0]) expect(value[0], name).toBe(source[name][0]);
    }
  });

  it("keeps each segment receipt verifying exactly when it verified in the source", async () => {
    const f = fixture();
    const plan = await carry03State({ sourceRoot: f.source, targetRoot: f.target, runningApps: f.noProcesses });
    const generation = f.generation.replace(f.source, f.target);
    const receipt = json(join(`${generation}.segments`, "complete.json"));
    const hash = (name) => sha(readFileSync(join(`${generation}.segments`, name)));
    expect(receipt.manifestSha256).toBe(sha(readFileSync(`${generation}.json`)));
    expect(receipt.projectionHashes[0].sha256).toBe(hash("segment-1.json"));
    expect(receipt.projectionHashes[1].sha256).toBe(sha("stale"));
    expect(json(join(`${generation}.segments`, "segment-1.json")).turns[0].output).toBe(`cd ${f.source}`);
    expect(plan.segments).toEqual({ rehashed: 1, manifestsRehashed: 1, unverifiedKept: 1 });
  });

  it("never writes the 0.3 folder, and leaves a receipt that holds no key", async () => {
    const f = fixture();
    const before = snapshot(f.source);
    await carry03State({ sourceRoot: f.source, targetRoot: f.target, runningApps: f.noProcesses });
    expect(snapshot(f.source)).toEqual(before);
    const text = readFileSync(join(f.target, "carried-from-0.3.json"), "utf8");
    expect(text).not.toContain("sk-fixture");
    expect(JSON.parse(text)).toMatchObject({ source: f.source, recordedAs: f.source, homes: ["home-1"], keyFile: true });
  });

  it("carries a snapshot recorded in another folder, without asking whether the app runs", async () => {
    const f = fixture();
    const clone = join(f.support, "clone");
    // A copy of the folder whose records still name the folder they were written in.
    cpSync(f.source, clone, { recursive: true });
    const plan = await carry03State({
      sourceRoot: clone, recordedRoot: f.source, targetRoot: f.target, runningApps: () => ["Mirror Desktop TS"],
    });
    expect(plan.rewritten.values).toBe(5);
    expect(json(join(f.target, "homes/home-1/journey-threads/atelier.json")).piSessionFile).toBe(f.session(f.target));
  });

  describe("refuses, writing nothing", () => {
    const refuses = async (f, options, message) => {
      const before = snapshot(f.source);
      await expect(carry03State({ sourceRoot: f.source, targetRoot: f.target, runningApps: f.noProcesses, ...options })).rejects.toThrow(message);
      expect(snapshot(f.source)).toEqual(before);
      const leftovers = readdirSync(f.support).filter((name) => name.includes("carrying"));
      expect(leftovers).toEqual([]);
    };

    it("when Nautilus already has state", async () => {
      const f = fixture();
      write(join(f.target, "window-geometry.json"), "{}");
      await refuses(f, {}, /already holds/);
      expect(readdirSync(f.target)).toEqual(["window-geometry.json"]);
    });

    it("when either app is running on the live folder", async () => {
      const f = fixture();
      await refuses(f, { runningApps: () => ["/Applications/Nautilus for Mirror.app/Contents/MacOS/mirror-desktop"] }, /quit/i);
      expect(existsSync(f.target)).toBe(false);
    });

    it("when the folder holds a symbolic link", async () => {
      const f = fixture();
      symlinkSync("/etc", join(f.home, "link"));
      await refuses(f, {}, /symbolic link/);
    });

    it("when a session path points somewhere in the folder that is not a home", async () => {
      const f = fixture();
      write(join(f.home, "journey-threads", "odd.json"), JSON.stringify({ sessionFile: `${f.source}/pi/elsewhere.jsonl` }));
      await refuses(f, {}, /outside the homes/);
    });

    it("when a record is not valid JSON", async () => {
      const f = fixture();
      write(join(f.home, "journey-threads", "broken.json"), `{"sessionFile": "${f.session(f.source)}"`);
      await refuses(f, {}, /not valid JSON/);
    });

    it("when a session path is written in a form only a parser would see", async () => {
      const f = fixture();
      write(join(f.home, "journey-threads", "escaped.json"), JSON.stringify({ sessionFile: f.session(f.source) }).replaceAll("/", "\\/"));
      await refuses(f, {}, /could not be moved in place/);
    });

    it("when a step fails after staging began, removing what it staged", async () => {
      const f = fixture();
      await refuses(f, { onStaged: () => { throw new Error("disk full"); } }, /disk full/);
      expect(existsSync(f.target)).toBe(false);
    });
  });
});
