import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  claudeCodeSettings,
  loadConfig,
  markAskClaudeDeprecationNoticeShown,
  markStartupNoticeShown,
} from "../../mirror-host/anthropic/provider/src/config";

// CR173: the Desktop's own Anthropic provider, a pinned fork of pi-claude-bridge 0.9.3. Its cuts:
// the person's Claude Code hooks never run inside a Desktop turn (CR167), and the person's bridge
// configuration is never read nor written, which also keeps AskClaude unregistered.

const PROVIDER = join(__dirname, "../../mirror-host/anthropic/provider");

describe("CR173 the Desktop's Anthropic provider", () => {
  let home: string;
  let previousHome: string | undefined;
  let previousAgentDir: string | undefined;

  beforeEach(() => {
    home = realpathSync(mkdtempSync(join(tmpdir(), "cr173-")));
    previousHome = process.env.HOME;
    previousAgentDir = process.env.PI_CODING_AGENT_DIR;
    process.env.HOME = home;
    delete process.env.PI_CODING_AGENT_DIR;
  });

  afterEach(() => {
    process.env.HOME = previousHome;
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  });

  it("turns off every Claude Code hook in the turn, and Claude's auto-memory", () => {
    expect(claudeCodeSettings()).toEqual({ autoMemoryEnabled: false, disableAllHooks: true });
    // Even when a caller hands it the person's provider settings.
    expect(claudeCodeSettings({ autoMemoryEnabled: true })).toEqual({ autoMemoryEnabled: false, disableAllHooks: true });
  });

  it("starts every Claude invocation without the person's hooks", () => {
    const index = readFileSync(join(PROVIDER, "src/index.ts"), "utf8");
    // The turn and AskClaude load the person's settings sources, so they take the hook-free
    // settings. The one-off summary loads no source at all (`settingSources: []`), which was
    // measured on 2026-11-02 to run no plugin hook.
    const invocations = index.match(/settings: \{[^}]*\},?\s*\n(?:.*\n){0,3}/g) ?? [];
    expect(invocations).toHaveLength(3);
    for (const invocation of invocations) {
      const hookFree = invocation.includes("...claudeCodeSettings(") || /settingSources: \[\] as SettingSource\[\]/.test(invocation);
      expect(hookFree, invocation).toBe(true);
    }
  });

  it("reads neither the person's global nor project bridge configuration", () => {
    const person = {
      askClaude: { enabled: true },
      provider: { pathToClaudeCodeExecutable: "/elsewhere/claude", strictMcpConfig: false, plan: "max" },
    };
    mkdirSync(join(home, ".pi/agent"), { recursive: true });
    writeFileSync(join(home, ".pi/agent/claude-bridge.json"), JSON.stringify(person));
    const project = join(home, "project");
    mkdirSync(join(project, ".pi"), { recursive: true });
    writeFileSync(join(project, ".pi/claude-bridge.json"), JSON.stringify(person));

    const config = loadConfig(project);

    expect(config.askClaude?.enabled).not.toBe(true);
    expect(config.provider?.pathToClaudeCodeExecutable).toBeUndefined();
    expect(config.provider?.strictMcpConfig).not.toBe(false);
    expect(config.provider?.plan).toBeUndefined();
    // No first-run notice is queued, so nothing asks to write a marker.
    expect(config.startupNoticeShown).toBeTruthy();
  });

  it("never writes into the person's Pi folder", () => {
    markStartupNoticeShown();
    markAskClaudeDeprecationNoticeShown();
    expect(readdirSync(home)).toEqual([]);
  });

  it("changes no upstream file but config.ts", () => {
    const lines = readFileSync(join(PROVIDER, "UPSTREAM.sha256"), "utf8").trim().split("\n");
    const upstream = new Map(lines.map((line) => {
      const [hash, path] = line.split(/\s+/);
      return [path, hash] as const;
    }));
    const vendored = readdirSync(join(PROVIDER, "src")).map((name) => `src/${name}`).sort();
    expect(vendored).toEqual([...upstream.keys()].sort());
    const changed = vendored.filter((path) =>
      createHash("sha256").update(readFileSync(join(PROVIDER, path))).digest("hex") !== upstream.get(path));
    expect(changed).toEqual(["src/config.ts"]);
  });

  it("records where it came from and what it changed", () => {
    const fork = readFileSync(join(PROVIDER, "FORK.md"), "utf8");
    expect(fork).toContain("pi-claude-bridge 0.9.3");
    expect(fork).toContain("874fa7c2678456336f23b64e784e2057e608d83e");
    expect(fork).toContain("sha512-5OM3X6QLX7Xsv86bD+yiWvQEHdlGdXnaY9DgZg6jG4jpnKiHQ2FZKYVRFHYmDAEccDPfeFwW+NFHnkb+BUM+6Q==");
    expect(readFileSync(join(PROVIDER, "LICENSE"), "utf8")).toContain("MIT");
  });
});
