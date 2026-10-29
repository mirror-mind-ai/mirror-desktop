import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { openMirrorConversationInTerminal } from "../app/mirrorConversationCatalog";
import tauriSource from "../../src-tauri/src/main.rs?raw";

describe("Mirror history continuation actions", () => {
  beforeEach(() => invoke.mockReset());

  it("opens bounded recall through an exact native Terminal boundary", async () => {
    invoke.mockResolvedValue({
      schemaVersion: "1.0.0", status: "opened", journeyId: "mirror-desktop",
      conversationId: "mirror-history-1234567890", messageLimit: 30,
    });
    await expect(openMirrorConversationInTerminal({
      journeyId: "mirror-desktop", conversationId: "mirror-history-1234567890", messageLimit: 30,
    })).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("open_mirror_conversation_in_terminal", {
      journeyId: "mirror-desktop", conversationId: "mirror-history-1234567890", messageLimit: 30,
    });
  });

  // CV-010.DS-005 decision 3 of phase 2: terminal recall ran the Python core in a shell, so the 0.3
  // line refuses it natively and composes nothing; the osascript boundary remains on release/0.2.
  it("refuses terminal recall natively and composes no osascript", () => {
    const start = tauriSource.indexOf("fn open_mirror_conversation_in_terminal");
    const command = tauriSource.slice(start, tauriSource.indexOf("\n}\n", start));
    expect(command).toContain('Err(mirror_host_bridge::not_carried("Terminal recall"))');
    expect(command).not.toMatch(/osascript|mktemp|bash/);
  });
});
