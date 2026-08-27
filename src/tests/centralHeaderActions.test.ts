import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import appStyles from "../styles/app.css?raw";

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

  it("keeps one accessible shortcut back to the active Journey conversation", () => {
    expect(appSource).toContain("function showConversation()");
    expect(appSource).toContain('setSelectedAltitude("operational")');
    expect(appSource).toContain('setSelectedOperationalSurface("chat")');
    expect(appSource).toContain('aria-label="Go to conversation"');
    expect(appSource).toContain('title="Conversation"');
    expect(appSource).toContain("chatEndRef.current?.scrollIntoView");
    expect(appSource).toContain('aria-current={operationalChatSelected ? "location" : undefined}');
  });
});
