import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";

// `?raw` yields an empty string for CSS under this config, which silently made the
// stylesheet assertions below vacuous; the repository convention is to read the file.
const appStyles = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

describe("central header actions", () => {
  it("removes obsolete header composition and right-panel controls", () => {
    expect(appSource).not.toContain("headerExpanded");
    expect(appSource).not.toContain("rightPanelCollapsed");
    expect(appSource).not.toContain("rightPanelVisible");
    expect(appSource).not.toContain('className="grammar-panel"');
    expect(appSource).not.toContain("header-toggle");
    expect(appSource).not.toContain("right-panel-toggle");
    expect(appStyles).not.toContain(".chat-header-collapsed");
    expect(appStyles).not.toContain(".grammar-panel");
  });

  it("keeps accessible conversation controls ahead of the Journey menu", () => {
    expect(appSource).toContain("function showConversation()");
    expect(appSource).toContain('setSelectedAltitude("operational")');
    expect(appSource).toContain('setSelectedOperationalSurface("chat")');
    expect(appSource).toContain('aria-label="Search active conversation"');
    expect(appSource).toContain('aria-label="Navigate active conversation turns"');
    expect(appSource).toContain('title="Search conversation"');
    expect(appSource).toContain('title="Navigate turns"');
    expect(appSource).toContain("chatEndRef.current?.scrollIntoView");
    expect(appSource).toContain("aria-pressed={conversationSearchOpen}");
    expect(appSource).toContain("aria-pressed={conversationTurnNavigatorOpen}");
    expect(appSource.indexOf('aria-label="Search active conversation"')).toBeLessThan(
      appSource.indexOf('aria-label="Journey conversation menu"'),
    );
    expect(appSource.indexOf('aria-label="Navigate active conversation turns"')).toBeLessThan(
      appSource.indexOf('aria-label="Journey conversation menu"'),
    );
  });

  // CR084: returning to the latest turn is one control beside the existing ones, sharing the
  // single end-reveal routine so it cannot drift from surface entry.
  it("offers a recenter control that reuses the one end-reveal routine", () => {
    expect(appSource).toContain("function revealConversationEnd()");
    expect(appSource).toContain('aria-label="Return to the latest turn"');
    expect(appSource).toContain('title="Back to latest"');
    expect(appSource).toContain("disabled={!conversationRecenter.available}");
    expect(appSource).toContain('conversationRecenter.emphasized ? "emphasized" : ""');
    // The scroll listener feeds reactive state; React bails out when the value is unchanged.
    expect(appSource).toContain("setConversationAwayFromEnd(!isConversationNearBottom(metrics))");
    // showConversation delegates rather than duplicating the scroll sequence.
    const showConversationBody = appSource.slice(
      appSource.indexOf("function showConversation()"),
      appSource.indexOf("const developmentChannel"),
    );
    expect(showConversationBody).toContain("revealConversationEnd()");
    expect(showConversationBody).not.toContain("scrollIntoView");
    expect(appSource.indexOf('aria-label="Return to the latest turn"')).toBeLessThan(
      appSource.indexOf('aria-label="Journey conversation menu"'),
    );
    // Light and dark themes both carry the emphasis contract.
    expect(appStyles).toContain(".conversation-recenter-shortcut.emphasized");
    expect(appStyles).toContain(".conversation-recenter-shortcut svg");
  });
});
