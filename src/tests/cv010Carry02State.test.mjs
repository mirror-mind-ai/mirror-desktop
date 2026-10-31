import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_STATE_ENTRIES } from "../../scripts/dev_adopt_unscoped_state.mjs";
import { CARRIED_ENTRIES, carry02State } from "../../scripts/carry_02_state.mjs";

// CV-010.DS-005 slice 5a-2: the 0.2 conversation surface continues in 0.3. After 5a adopts the
// production home, the 0.2 app's per-Journey state is COPIED into that home's folder in the 0.3 app,
// all or nothing, with only the structural Pi session paths rewritten. The 0.2 folder is never
// written, so 0.2 keeps working through the window back.

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "carry-02-")));
}

function home(parent, name, homeId, conversationIds) {
  const path = join(parent, name);
  mkdirSync(join(path, ".mirror-desktop"), { recursive: true });
  writeFileSync(join(path, ".mirror-desktop", "home.json"), JSON.stringify({ line: "0.3", homeId, createdAt: "2026-10-31T00:00:00Z" }));
  const db = new DatabaseSync(join(path, "memory.db"));
  db.exec("CREATE TABLE conversations (id TEXT PRIMARY KEY)");
  for (const id of conversationIds) db.prepare("INSERT INTO conversations (id) VALUES (?)").run(id);
  db.close();
  return path;
}

const write = (path, value) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

/** A 0.2 app data folder as production holds it, reduced to one Journey with one Pi session. */
function source02(parent, conversationId = "a14439c8") {
  const root = join(parent, "Application Support", "ai.mirrormind.desktop");
  const session = join(root, "pi-sessions", "2026-09-07T11-54-27-692Z_nautilus-personal-growth-g1-18d3.jsonl");
  // Pi's transcript is never parsed: even a tool call naming a session file stays as the agent wrote it.
  const toolCall = { type: "message", id: "m2", parentId: "m1", message: { role: "assistant", content: [{ type: "toolCall", arguments: { sessionFile: session } }] } };
  write(session, `{"type":"session","version":3,"id":"18d3","cwd":"/Users/ana/mirror"}\n{"type":"message","id":"m1","parentId":null}\n${JSON.stringify(toolCall)}\n`);
  write(join(root, "journey-threads", "personal-growth.json"), {
    thread: { generations: [{ mirrorConversationId: conversationId, piSessionFile: session }] },
  });
  write(join(root, "dedicated-journey-conversations", "personal-growth", "nautilus-thread-personal-growth.json"), {
    turns: [{ pi: { sessionFile: session } }],
    reconciliation: { checkpoints: { pi: { sessionFile: session } } },
    // What the agent did and said: a tool's arguments and output are content, never rewritten.
    operations: [{ arguments: { path: session, command: `wc -l ${session}` }, output: `${session}: 2 lines` }],
  });
  write(join(root, "conversation-segments", "personal-growth", "nautilus-thread-personal-growth", "generation-1.json"), { segments: 1 });
  write(join(root, "conversation-segments", "personal-growth", "nautilus-thread-personal-growth", "generation-1.segments", "segment-1.json"), {
    conversation: { liveIdentity: { piSessionFile: session } },
    checkpoints: { pi: { sessionFile: session } },
    // A session outside the app's folder (Pi's global one) is left where it is.
    other: { pi: { sessionFile: "/Users/ana/.pi/agent/sessions/x.jsonl" } },
  });
  write(join(root, "journey-preferences.json"), { preferences: { activeJourneyId: "personal-growth" } });
  write(join(root, "composer-drafts.json"), { drafts: {} });
  write(join(root, "mirror-append-outbox.json"), { schemaVersion: "1.0.0", savedAt: "2026-10-31T00:00:00Z", items: [] });
  write(join(root, "mirror-append-conflicts.jsonl"), `${JSON.stringify({ existing: { piSessionFile: session } })}\n`);
  // Not carried: a cache 0.3 rebuilds from Mirror, and app-level state.
  write(join(root, "journey-registry.json"), { schemaVersion: "0.2.0", roots: [] });
  write(join(root, "agent-settings.json"), { providers: [] });
  write(join(root, "voice-transcription", "model.bin"), "weights");
  return { root, session };
}

/** The 0.3 app data folder right after 5a: the bound home's folder holds what the app writes on bind. */
function target03(parent, homeId) {
  const root = join(parent, "Application Support", "ai.mirrormind.desktop.ts");
  write(join(root, "homes", homeId, "journey-registry.json"), '{"from":"0.3"}');
  write(join(root, "homes", homeId, "journey-preferences.json"), '{"preferences":{}}');
  mkdirSync(join(root, "homes", homeId, "pi-sessions"));
  return root;
}

function fingerprint(root) {
  const files = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path);
      else files[relative(root, path)] = `${stat.mode}:${stat.mtimeMs}:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
    }
  };
  walk(root);
  return files;
}

function fixture(conversations = ["a14439c8"]) {
  const parent = scratch();
  const { root: sourceRoot, session } = source02(parent);
  const homePath = home(parent, "alisson-vale", "home-prod-0001", conversations);
  const targetAppDataRoot = target03(parent, "home-prod-0001");
  return { parent, sourceRoot, session, homePath, targetAppDataRoot, target: join(targetAppDataRoot, "homes", "home-prod-0001") };
}

describe("carrying the 0.2 conversation surface into an adopted home", () => {
  it("carries every per-home entry but the Journey registry, which 0.3 rebuilds from Mirror", () => {
    expect(CARRIED_ENTRIES).toEqual(HOME_STATE_ENTRIES.filter((entry) => entry !== "journey-registry.json"));
  });

  it("copies the surface into the home's folder, rewriting only where a record says its Pi session is", async () => {
    const { sourceRoot, session, homePath, targetAppDataRoot, target } = fixture();
    const before = fingerprint(sourceRoot);
    const result = await carry02State({ sourceRoot, targetAppDataRoot, homePath });
    expect(fingerprint(sourceRoot)).toEqual(before);

    const moved = join(target, "pi-sessions", "2026-09-07T11-54-27-692Z_nautilus-personal-growth-g1-18d3.jsonl");
    expect(result).toMatchObject({
      homeId: "home-prod-0001", target, conversations: ["a14439c8"],
      carried: ["composer-drafts.json", "conversation-segments", "dedicated-journey-conversations", "journey-preferences.json",
        "journey-threads", "mirror-append-conflicts.jsonl", "mirror-append-outbox.json", "pi-sessions"],
      rewritten: { files: 4, values: 6 },
    });
    const read = (path) => JSON.parse(readFileSync(join(target, path), "utf8"));
    expect(read("journey-threads/personal-growth.json").thread.generations[0].piSessionFile).toBe(moved);
    const conversation = read("dedicated-journey-conversations/personal-growth/nautilus-thread-personal-growth.json");
    expect(conversation.turns[0].pi.sessionFile).toBe(moved);
    expect(conversation.reconciliation.checkpoints.pi.sessionFile).toBe(moved);
    expect(conversation.operations[0]).toEqual({ arguments: { path: session, command: `wc -l ${session}` }, output: `${session}: 2 lines` });
    const segment = read("conversation-segments/personal-growth/nautilus-thread-personal-growth/generation-1.segments/segment-1.json");
    expect(segment.conversation.liveIdentity.piSessionFile).toBe(moved);
    expect(segment.checkpoints.pi.sessionFile).toBe(moved);
    expect(segment.other.pi.sessionFile).toBe("/Users/ana/.pi/agent/sessions/x.jsonl");
    expect(JSON.parse(readFileSync(join(target, "mirror-append-conflicts.jsonl"), "utf8").trim()).existing.piSessionFile).toBe(moved);

    // A file with nothing to rewrite arrives byte for byte, the Pi session included.
    expect(readFileSync(moved)).toEqual(readFileSync(session));
    expect(readFileSync(join(target, "composer-drafts.json"))).toEqual(readFileSync(join(sourceRoot, "composer-drafts.json")));
    // The 0.2 preferences replace the ones written on bind; the 0.3 registry stays; app state stays behind.
    expect(read("journey-preferences.json")).toEqual({ preferences: { activeJourneyId: "personal-growth" } });
    expect(readFileSync(join(target, "journey-registry.json"), "utf8")).toBe('{"from":"0.3"}');
    expect(readdirSync(target).filter((name) => !CARRIED_ENTRIES.includes(name)).sort()).toEqual(["carried-from-0.2.json", "journey-registry.json"]);
    expect(readdirSync(join(targetAppDataRoot, "homes"))).toEqual(["home-prod-0001"]);

    const receipt = JSON.parse(readFileSync(join(target, "carried-from-0.2.json"), "utf8"));
    expect(statSync(join(target, "carried-from-0.2.json")).mode & 0o777).toBe(0o600);
    expect(receipt).toMatchObject({ source: sourceRoot, carried: result.carried, conversations: ["a14439c8"], rewritten: { files: 4, values: 6 } });
    expect(Date.parse(receipt.carriedAt)).not.toBeNaN();
    expect(receipt.files).toBe(Object.keys(before).filter((path) => CARRIED_ENTRIES.includes(path.split("/")[0])).length);
  });

  it("carries from a snapshot of the 0.2 folder, rewriting the paths its records name, and refuses when none would move", async () => {
    const { parent, sourceRoot, session, homePath, targetAppDataRoot, target } = fixture();
    const snapshot = join(parent, "snapshot", "ai.mirrormind.desktop");
    mkdirSync(join(snapshot, ".."), { recursive: true });
    cpSync(sourceRoot, snapshot, { recursive: true });
    await expect(carry02State({ sourceRoot: snapshot, targetAppDataRoot, homePath })).rejects.toThrow(/name no Pi session in .*pi-sessions.*recorded/);
    expect(readdirSync(target).sort()).toEqual(["journey-preferences.json", "journey-registry.json", "pi-sessions"]);

    const result = await carry02State({ sourceRoot: snapshot, recordedRoot: sourceRoot, targetAppDataRoot, homePath });
    expect(result.rewritten).toEqual({ files: 4, values: 6 });
    const moved = join(target, "pi-sessions", "2026-09-07T11-54-27-692Z_nautilus-personal-growth-g1-18d3.jsonl");
    expect(JSON.parse(readFileSync(join(target, "journey-threads", "personal-growth.json"), "utf8")).thread.generations[0].piSessionFile).toBe(moved);
    expect(readFileSync(moved)).toEqual(readFileSync(session));
    expect(JSON.parse(readFileSync(join(target, "carried-from-0.2.json"), "utf8"))).toMatchObject({ source: snapshot, recordedAs: sourceRoot });
  });

  it("says what it would do and writes nothing when asked for a dry run", async () => {
    const { sourceRoot, homePath, targetAppDataRoot } = fixture();
    const before = fingerprint(targetAppDataRoot);
    const plan = await carry02State({ sourceRoot, targetAppDataRoot, homePath, dryRun: true });
    expect(plan).toMatchObject({ dryRun: true, homeId: "home-prod-0001", conversations: ["a14439c8"], rewritten: { files: 4, values: 6 } });
    expect(plan.files).toBeGreaterThan(0);
    expect(fingerprint(targetAppDataRoot)).toEqual(before);
  });

  it("carries once: a home already carried, or with a Journey started in 0.3, is refused untouched", async () => {
    const carried = fixture();
    await carry02State(carried);
    const after = fingerprint(carried.targetAppDataRoot);
    await expect(carry02State(carried)).rejects.toThrow(/already holds conversation state/);
    expect(fingerprint(carried.targetAppDataRoot)).toEqual(after);

    const started = fixture();
    write(join(started.target, "journey-threads", "casa.json"), { thread: { generations: [] } });
    const before = fingerprint(started.targetAppDataRoot);
    await expect(carry02State(started)).rejects.toThrow(/already holds conversation state/);
    expect(fingerprint(started.targetAppDataRoot)).toEqual(before);
  });

  it("refuses while a 0.2 turn still waits to reach Mirror, and when the home lacks a named Conversation", async () => {
    const waiting = fixture();
    write(join(waiting.sourceRoot, "mirror-append-outbox.json"), { schemaVersion: "1.0.0", savedAt: "x", items: [{ itemId: "t1" }] });
    await expect(carry02State(waiting)).rejects.toThrow(/1 turn.*not yet in Mirror.*open 0\.2/);

    const elsewhere = fixture([]);
    await expect(carry02State(elsewhere)).rejects.toThrow(/does not hold the Conversations this state names: a14439c8/);
    for (const { targetAppDataRoot } of [waiting, elsewhere]) {
      expect(readdirSync(join(targetAppDataRoot, "homes", "home-prod-0001")).sort()).toEqual(["journey-preferences.json", "journey-registry.json", "pi-sessions"]);
    }
  });

  it("refuses an unmarked home, a symbolic link, a record pointing elsewhere in the 0.2 folder, and a file it cannot read", async () => {
    const unmarked = fixture();
    await expect(carry02State({ ...unmarked, homePath: join(unmarked.parent, "nowhere") })).rejects.toThrow();

    const linked = fixture();
    symlinkSync(linked.homePath, join(linked.sourceRoot, "pi-sessions", "elsewhere"));
    await expect(carry02State(linked)).rejects.toThrow(/symbolic link/);

    const stray = fixture();
    write(join(stray.sourceRoot, "journey-threads", "casa.json"), {
      thread: { generations: [{ mirrorConversationId: "a14439c8", piSessionFile: join(stray.sourceRoot, "user-avatar", "x.jsonl") }] },
    });
    await expect(carry02State(stray)).rejects.toThrow(/outside pi-sessions/);

    const broken = fixture();
    write(join(broken.sourceRoot, "journey-threads", "casa.json"), "{ not json");
    await expect(carry02State(broken)).rejects.toThrow(/casa\.json/);

    const unreadable = fixture();
    chmodSync(join(unreadable.sourceRoot, "composer-drafts.json"), 0o000);
    await expect(carry02State(unreadable)).rejects.toThrow();
    chmodSync(join(unreadable.sourceRoot, "composer-drafts.json"), 0o600);

    // A failure while writing, after every check passed: the staging folder goes, the target stays.
    const midway = fixture();
    const bound = join(midway.target, "journey-preferences.json");
    chmodSync(bound, 0o000);
    await expect(carry02State(midway)).rejects.toThrow();
    chmodSync(bound, 0o600);

    // All or nothing: no refusal leaves a half-carried folder or a staging folder behind.
    for (const { targetAppDataRoot } of [linked, stray, broken, unreadable, midway]) {
      expect(readdirSync(join(targetAppDataRoot, "homes"))).toEqual(["home-prod-0001"]);
      expect(readdirSync(join(targetAppDataRoot, "homes", "home-prod-0001")).sort()).toEqual(["journey-preferences.json", "journey-registry.json", "pi-sessions"]);
    }
  });
});
