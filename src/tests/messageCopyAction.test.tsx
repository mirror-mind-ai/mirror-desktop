import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { copyMessageBody, MessageCopyAction } from "../app/MessageCopyAction";
import { stripMessageSpeakerSignature } from "../app/conversationPresentation";

const projectFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("message copy action", () => {
  it("copies only the persona-signature-stripped body as Markdown source", async () => {
    const writeText = vi.fn(async () => undefined);
    const body = stripMessageSpeakerSignature("◇ strategist\n\n**Visible** body");

    await expect(copyMessageBody(body, writeText)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("**Visible** body");
  });

  it("reports clipboard failures truthfully", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("clipboard denied");
    });

    await expect(copyMessageBody("Visible body", writeText)).resolves.toBe("failed");
  });

  it("renders an always-visible accessible action without adding message metadata", () => {
    const html = renderToStaticMarkup(<MessageCopyAction body="Visible body" />);

    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Copy message text"');
    expect(html).toContain('title="Copy message text"');
    expect(html).toContain("<svg");
    expect(html).not.toContain(">Copy<");
    expect(html).not.toContain("Visible body");
  });

  it("registers only clipboard text writing in the native boundary", () => {
    expect(projectFile("src-tauri/src/main.rs")).toContain(".plugin(tauri_plugin_clipboard_manager::init())");
    expect(projectFile("src-tauri/capabilities/default.json")).toContain("clipboard-manager:allow-write-text");
  });
});
