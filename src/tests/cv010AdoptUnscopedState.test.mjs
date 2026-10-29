import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import homeStateSource from "../../src-tauri/src/home_state.rs?raw";
import { adoptUnscopedState, HOME_STATE_ENTRIES } from "../../scripts/dev_adopt_unscoped_state.mjs";

// CV-010.DS-005 slice 3a-2: a development app's unscoped state moves into the folder of the home it
// came from, once, all or nothing, with the absolute paths its records hold rewritten.

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "adopt-unscoped-")));
}

function home(parent, name, homeId, conversationIds) {
  const path = join(parent, name);
  mkdirSync(join(path, ".mirror-desktop"), { recursive: true });
  writeFileSync(join(path, ".mirror-desktop", "home.json"), JSON.stringify({ line: "0.3", homeId, createdAt: "2026-10-29T00:00:00Z" }));
  const db = new DatabaseSync(join(path, "memory.db"));
  db.exec("CREATE TABLE conversations (id TEXT PRIMARY KEY)");
  for (const id of conversationIds) db.prepare("INSERT INTO conversations (id) VALUES (?)").run(id);
  db.close();
  return path;
}

/** An app data folder as slice 3a left it: state at the root, recording where its Pi session is. */
function unscoped(parent, conversationId = "a14439c8") {
  const root = join(parent, "Application Support", "ai.mirrormind.desktop.ts.dev");
  mkdirSync(join(root, "journey-threads"), { recursive: true });
  mkdirSync(join(root, "pi-sessions"));
  writeFileSync(join(root, "pi-sessions", "s1.jsonl"), '{"type":"session","id":"s1"}\n');
  const thread = { thread: { generations: [{ mirrorConversationId: conversationId, piSessionFile: join(root, "pi-sessions", "s1.jsonl") }] } };
  writeFileSync(join(root, "journey-threads", "personal-growth.json"), JSON.stringify(thread, null, 2));
  writeFileSync(join(root, "journey-registry.json"), "{}");
  writeFileSync(join(root, "agent-settings.json"), "{}");
  writeFileSync(join(root, "runtime-home.v2.json"), "{}");
  return root;
}

describe("adopting a development app's unscoped state", () => {
  it("lists exactly the entries the app keeps per home", () => {
    const body = homeStateSource.slice(homeStateSource.indexOf("HOME_STATE_ENTRIES: [&str;"));
    const listed = [...body.slice(0, body.indexOf("];")).matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(HOME_STATE_ENTRIES).toEqual(listed);
  });

  it("moves the state into the home's folder, rewrites recorded paths, and leaves app state alone", async () => {
    const parent = scratch();
    const root = unscoped(parent);
    const ana = home(parent, "ana", "home-aaaa-0001", ["a14439c8"]);
    const result = await adoptUnscopedState({ appDataRoot: root, homePath: ana });
    const target = join(root, "homes", "home-aaaa-0001");
    expect(result).toMatchObject({ homeId: "home-aaaa-0001", target, adopted: ["journey-registry.json", "journey-threads", "pi-sessions"], rewritten: 1, conversations: ["a14439c8"] });
    const thread = JSON.parse(readFileSync(join(target, "journey-threads", "personal-growth.json"), "utf8"));
    expect(thread.thread.generations[0].piSessionFile).toBe(join(target, "pi-sessions", "s1.jsonl"));
    expect(existsSync(thread.thread.generations[0].piSessionFile)).toBe(true);
    expect(readdirSync(root).sort()).toEqual(["agent-settings.json", "homes", "runtime-home.v2.json"]);
    expect(readdirSync(join(root, "homes"))).toEqual(["home-aaaa-0001"]);
    expect(statSync(join(root, "homes")).mode & 0o777).toBe(0o700);
    expect(await adoptUnscopedState({ appDataRoot: root, homePath: ana })).toEqual({ homeId: "home-aaaa-0001", adopted: [] });
  });

  it("refuses a home that does not hold the Conversations the state names, and changes nothing", async () => {
    const parent = scratch();
    const root = unscoped(parent);
    const joao = home(parent, "joao-silva", "home-bbbb-0002", []);
    await expect(adoptUnscopedState({ appDataRoot: root, homePath: joao })).rejects.toThrow(/does not hold the Conversations this state names: a14439c8/);
    expect(readdirSync(root).sort()).toEqual(["agent-settings.json", "journey-registry.json", "journey-threads", "pi-sessions", "runtime-home.v2.json"]);
  });

  it("refuses state that names no Conversation, a home that already has state, an unmarked home, and a symbolic link", async () => {
    const parent = scratch();
    const ana = home(parent, "ana", "home-aaaa-0001", ["a14439c8"]);
    const bare = join(parent, "bare");
    mkdirSync(join(bare, "pi-sessions"), { recursive: true });
    await expect(adoptUnscopedState({ appDataRoot: bare, homePath: ana })).rejects.toThrow(/names no Mirror Conversation/);

    const taken = unscoped(join(parent, "taken"));
    mkdirSync(join(taken, "homes", "home-aaaa-0001"), { recursive: true });
    writeFileSync(join(taken, "homes", "home-aaaa-0001", "journey-registry.json"), "{}");
    await expect(adoptUnscopedState({ appDataRoot: taken, homePath: ana })).rejects.toThrow(/already holds state/);

    const unmarked = join(parent, "unmarked");
    mkdirSync(unmarked);
    await expect(adoptUnscopedState({ appDataRoot: unscoped(join(parent, "u")), homePath: unmarked })).rejects.toThrow();

    const linked = unscoped(join(parent, "linked"));
    symlinkSync(join(parent, "ana"), join(linked, "pi-sessions", "elsewhere"));
    await expect(adoptUnscopedState({ appDataRoot: linked, homePath: ana })).rejects.toThrow(/symbolic link/);
    expect(readdirSync(join(linked, "homes"))).toEqual([]);
    expect(existsSync(join(linked, "pi-sessions", "s1.jsonl"))).toBe(true);
  });
});
