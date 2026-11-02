import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { describeLastCheck } from "../app/openRouterKey";
import { OpenRouterKeyPanel } from "../app/OpenRouterKeyPanel";
import appSource from "../app/App.tsx?raw";
import panelSource from "../app/OpenRouterKeyPanel.tsx?raw";
import keySource from "../app/openRouterKey.ts?raw";
import nativeSource from "../../src-tauri/src/openrouter_key.rs?raw";

// CR180: the OpenRouter key is kept in an owner-only file, not in the Keychain, which asked for the
// login password on every turn of an unsigned app. What the screen says follows where it is kept.

const at = Date.UTC(2026, 10, 2, 12);

describe("where the screen says the key is kept", () => {
  it("is this Mac, readable only by the person", () => {
    expect(describeLastCheck({ configured: true, lastCheck: null, declined: false })).toBe("A key is kept on this Mac, readable only by you; it has not been checked yet.");
    expect(describeLastCheck({ configured: true, lastCheck: { atMs: at, outcome: "worked" }, declined: false }, "en-US")).toMatch(/^A key is kept on this Mac\. It worked on /);
    const html = renderToStaticMarkup(<OpenRouterKeyPanel variant="settings" busy={false} onSave={() => undefined} onTest={() => undefined} onRemove={() => undefined} onDecline={() => undefined} onReload={() => undefined} />);
    expect(html).toContain("The key is kept on this Mac, in a file only you can read, and never shown again.");
    expect(html).toContain("Checking for a kept key…");
  });

  it("never names the Keychain any more", () => {
    for (const source of [panelSource, keySource]) expect(source).not.toContain("Keychain");
    expect(appSource).toContain('"OpenRouter accepted the key; it is kept on this Mac."');
    expect(appSource).toContain('"The key was removed from this Mac."');
    expect(appSource).not.toMatch(/(kept in|removed from) the Keychain/);
  });

  it("is the key file in the native side, reached on every read", () => {
    expect(nativeSource).toContain('const KEY_FILE: &str = "openrouter-key.secret";');
    expect(nativeSource).toContain("Ok((open_store(&root, &keychain), keychain, root.join(STATE_FILE)))");
    expect(nativeSource).toContain("remove_everywhere(&store, &keychain, &state)");
  });
});
