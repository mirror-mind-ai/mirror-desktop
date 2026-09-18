import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots = [];
const watcher = resolve("scripts/rs018_terminal_window_watch.py");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rs018-watch-"));
  roots.push(root);
  const session = join(root, "session.jsonl");
  const evidence = join(root, "evidence.json");
  writeFileSync(session, [
    JSON.stringify({ type: "session", id: "session-one" }),
    JSON.stringify({ type: "message", id: "user-old", parentId: null, message: { role: "user", content: "private" } }),
    JSON.stringify({ type: "message", id: "assistant-old", parentId: "user-old", message: { role: "assistant", content: "private", stopReason: "stop" } }),
  ].join("\n") + "\n");
  return { root, session, evidence };
}

function run(args) {
  return new Promise((resolveResult) => {
    const child = spawn("python3", [watcher, ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolveResult({ status, stdout, stderr }));
  });
}

describe("RS018 terminal-window watcher", () => {
  it("observes only a new terminal active leaf and writes redacted evidence", async () => {
    const { root, session, evidence } = fixture();
    const ready = join(root, "ready.json");
    const resultPromise = run([
      "--session-file", session,
      "--baseline-leaf", "assistant-old",
      "--pid", String(process.pid),
      "--evidence", evidence,
      "--ready-file", ready,
      "--timeout-seconds", "2",
      "--poll-milliseconds", "2",
      "--dry-run",
    ]);
    const readyDeadline = Date.now() + 2_000;
    while (!existsSync(ready) && Date.now() < readyDeadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    }
    expect(existsSync(ready)).toBe(true);
    appendFileSync(session, [
      JSON.stringify({ type: "message", id: "user-new", parentId: "assistant-old", message: { role: "user", content: "secret question" } }),
      JSON.stringify({ type: "message", id: "assistant-new", parentId: "user-new", message: { role: "assistant", content: "secret answer", stopReason: "stop" } }),
    ].join("\n") + "\n");
    const result = await resultPromise;
    expect(result).toMatchObject({ status: 0, stderr: "" });
    const recorded = JSON.parse(readFileSync(evidence, "utf8"));
    expect(recorded).toMatchObject({
      baselineLeafEntryId: "assistant-old",
      terminalLeafEntryId: "assistant-new",
      terminalStopReason: "stop",
      dryRun: true,
    });
    expect(JSON.stringify(recorded)).not.toContain("secret");
    expect(JSON.stringify(recorded)).not.toContain("content");
  });

  it("rejects a stale baseline before waiting or signalling", async () => {
    const { session, evidence } = fixture();
    const result = await run([
      "--session-file", session,
      "--baseline-leaf", "stale",
      "--pid", String(process.pid),
      "--evidence", evidence,
      "--dry-run",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Baseline leaf does not match");
  });
});
