import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import mirrorDesktopContext, { CONTEXT_TYPE, MAX_CONTEXT_BYTES, takeContext } from "../../mirror-host/mirror-context.mjs";
import contextSource from "../../src-tauri/src/mirror_context.rs?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";

// CV-010.DS-005 slice 3d: the Pi extension that hands a turn its Mirror context. The app writes the
// block to a file of the turn's own; the extension gives it to Pi once, as the hidden message the
// terminal sends, and removes it. Measured on Pi 1.4.0 with a local provider: the block reaches the
// model as a user message after the person's, and the session keeps it as a `custom_message` entry.

function scratch() {
  return realpathSync(mkdtempSync(join(tmpdir(), "mirror-context-")));
}

/** A Pi stand-in that records the handlers an extension registers. */
function fakePi() {
  const handlers = {};
  return { on: (name, handler) => { (handlers[name] ??= []).push(handler); }, handlers };
}

function loaded(file) {
  const pi = fakePi();
  mirrorDesktopContext(pi, { MIRROR_DESKTOP_CONTEXT_FILE: file });
  return pi.handlers;
}

describe("the turn's context", () => {
  it("is handed to Pi once, hidden, and the file is removed", async () => {
    const file = join(scratch(), "turn-1.md");
    writeFileSync(file, "=== mirror context ===\nblock", { mode: 0o600 });
    const [start] = loaded(file).before_agent_start;
    expect(await start({ prompt: "hello" })).toEqual({ message: { customType: "mirror-context", content: "=== mirror context ===\nblock", display: false } });
    expect(CONTEXT_TYPE).toBe("mirror-context");
    expect(existsSync(file)).toBe(false);
    expect(await start({ prompt: "a second run of the same turn" })).toBeUndefined();
  });

  it("is not given to a run a custom message started, and waits for the person's", async () => {
    const file = join(scratch(), "turn-2.md");
    writeFileSync(file, "block");
    const [start] = loaded(file).before_agent_start;
    expect(await start({ messageType: "custom" })).toBeUndefined();
    expect(existsSync(file)).toBe(true);
    expect(await start({ messageType: "user" })).toMatchObject({ message: { content: "block" } });
  });

  it("gives nothing for a missing, empty, oversized, linked or folder path", () => {
    const dir = scratch();
    expect(takeContext(join(dir, "none.md"))).toBeNull();
    expect(takeContext(undefined)).toBeNull();
    writeFileSync(join(dir, "empty.md"), "");
    expect(takeContext(join(dir, "empty.md"))).toBeNull();
    writeFileSync(join(dir, "huge.md"), "x".repeat(MAX_CONTEXT_BYTES + 1));
    expect(takeContext(join(dir, "huge.md"))).toBeNull();
    expect(existsSync(join(dir, "huge.md"))).toBe(false);
    writeFileSync(join(dir, "target.md"), "secret elsewhere");
    symlinkSync(join(dir, "target.md"), join(dir, "link.md"));
    expect(takeContext(join(dir, "link.md"))).toBeNull();
    expect(readFileSync(join(dir, "target.md"), "utf8")).toBe("secret elsewhere");
    mkdirSync(join(dir, "folder.md"));
    expect(takeContext(join(dir, "folder.md"))).toBeNull();
  });

  it("does nothing without a file named", () => {
    const pi = fakePi();
    mirrorDesktopContext(pi, {});
    expect(pi.handlers).toEqual({});
  });

  it("leaves an owner-only marker when Pi compacts during the turn", async () => {
    const file = join(scratch(), "turn-3.md");
    const [compact] = loaded(file).session_compact;
    await compact({});
    expect(statSync(`${file}.compacted`).mode & 0o777).toBe(0o600);
  });
});

describe("the turn that carries it", () => {
  it("asks for context with what the person typed, before Pi starts, and never in place of the turn", () => {
    const start = mainSource.indexOf("// CV-010.DS-005 slice 3d: Mirror's context before the model");
    const spawn = mainSource.indexOf("let mut process_command = pi_turn_command(&command, args, &profile);");
    expect(start).toBeGreaterThan(0);
    expect(start).toBeLessThan(spawn);
    const block = mainSource.slice(start, mainSource.indexOf("let use_stdin = ", start));
    expect(block).toContain("let (typed, _) = project_dedicated_user_text_and_envelope(&prompt);");
    expect(block).toContain("mirror_context::prepare_turn(&app, &run_authority.pi_session_file, &typed, &run_authority.journey_id);");
    expect(block).toContain("let _context_guard = if mirror_mediated {");
    expect(block).not.toMatch(/return;/);
    expect(mainSource.slice(spawn, spawn + 200)).toContain("process_command.env(mirror_context::CONTEXT_ENV, file);");
  });

  it("tells the host after a manual compaction, and only for a mediated session", () => {
    const body = mainSource.slice(mainSource.indexOf("let forget_app = app.clone();"));
    const own = body.slice(0, body.indexOf(".await"));
    expect(own).toContain("if mediated && result.is_ok() {");
    expect(own).toContain("mirror_context::forget(&forget_app, &session_file)");
  });

  it("checks the extension against the runtime's receipt and keeps the key out of the file", () => {
    expect(contextSource).toContain('receipt.pointer("/mirrorContext/sha256")');
    // Decision 3: no key is said once per Conversation; failures every time.
    expect(contextSource).toContain("note_to_show(&context, session_id, told.get_or_insert_with(Default::default))");
    expect(contextSource).toContain('json!({"request": {"sessionId": session_id, "prompt": prompt, "journeyId": journey_id}, "apiKey": key})');
  });
});
