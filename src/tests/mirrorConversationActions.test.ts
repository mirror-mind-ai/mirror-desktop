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

  it("does not compose untrusted coordinates into osascript source", () => {
    const command = tauriSource.slice(
      tauriSource.indexOf("fn open_mirror_conversation_in_terminal"),
      tauriSource.indexOf("fn provision_mirror_conversation"),
    );
    expect(command).toContain('arg("--")');
    expect(command).toContain("shell_quote");
    expect(command).toContain('"inspect"');
    expect(command).toContain("mktemp");
    expect(command).toContain("Recalled material is source evidence");
    expect(command).toContain('join("terminal-handoffs")');
    expect(command).toContain("launcher_options.mode(0o600)");
    expect(command).toContain('"exec /bin/bash {}"');
    expect(command).toContain(".arg(terminal_command)");
    expect(command).not.toContain('.arg(command)\n');
  });
});
