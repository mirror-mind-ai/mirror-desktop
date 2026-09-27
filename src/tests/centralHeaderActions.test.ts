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

  // CR092: the recenter control left the header for a floating affordance over the Conversation,
  // so the header keeps three controls and the emphasis contract is gone. It still shares the
  // single end-reveal routine, which is what kept it from drifting from surface entry in CR084.
  it("keeps the recenter control out of the header", () => {
    const headerActions = appSource.slice(
      appSource.indexOf('className="chat-header-actions"'),
      appSource.indexOf('aria-label="Journey conversation menu"'),
    );
    expect(headerActions).not.toContain("conversation-recenter-shortcut");
    expect(headerActions).not.toContain('aria-label="Return to the latest turn"');
    expect(appSource).not.toContain("conversationRecenter.available");
    expect(appSource).not.toContain("conversationRecenter.emphasized");
    expect(appStyles).not.toContain(".conversation-recenter-shortcut");
  });

  it("reuses the one end-reveal routine from the floating control", () => {
    expect(appSource).toContain("function revealConversationEnd()");
    expect(appSource).toContain('aria-label="Return to the latest turn"');
    expect(appSource).toContain('title="Back to latest"');
    // The scroll listener feeds reactive state; React bails out when the value is unchanged.
    expect(appSource).toContain("setConversationAwayFromEnd(!isConversationNearBottom(metrics))");
    // showConversation delegates rather than duplicating the scroll sequence.
    const showConversationBody = appSource.slice(
      appSource.indexOf("function showConversation()"),
      appSource.indexOf("const developmentChannel"),
    );
    expect(showConversationBody).toContain("revealConversationEnd()");
    expect(showConversationBody).not.toContain("scrollIntoView");
  });
});
