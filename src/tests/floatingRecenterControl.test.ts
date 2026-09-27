import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";

const appStyles = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const at = appStyles.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`missing rule ${selector}`);
  return appStyles.slice(at, appStyles.indexOf("}", at));
}

// CR092: a map-like recenter affordance. The hard constraint is structural — an absolutely
// positioned child of a scrolling box scrolls with its content, so the control must be anchored
// to a viewport around the scroller rather than inside it.
describe("floating recenter control", () => {
  it("anchors to a viewport around the scroller, never inside it", () => {
    const viewport = rule(".chat-stream-viewport");
    expect(viewport).toContain("position: relative");
    expect(viewport).toContain("min-height: 0");

    const control = rule(".conversation-recenter-floating");
    expect(control).toContain("position: absolute");
    expect(control).toContain("bottom:");
    expect(control).toContain("right:");

    // The control must be a sibling of the scroller inside the viewport, not a descendant of it.
    const viewportOpen = appSource.indexOf('className="chat-stream-viewport"');
    const streamClose = appSource.indexOf("</section>", appSource.indexOf('className="chat-stream"'));
    const controlAt = appSource.indexOf("conversation-recenter-floating");
    expect(viewportOpen).toBeGreaterThan(-1);
    expect(controlAt).toBeGreaterThan(streamClose);
  });

  it("clears the scrollbar gutter with a fixed offset rather than measuring at runtime", () => {
    const control = rule(".conversation-recenter-floating");
    const right = Number(/right: (\d+)px/.exec(control)?.[1]);
    // Comfortably clear of a visible macOS scrollbar, which is roughly 15px.
    expect(right).toBeGreaterThanOrEqual(20);
    expect(appSource).not.toContain("offsetWidth - clientWidth");
    expect(appSource).not.toContain("scrollbarWidth");
  });

  it("disappears when the surface is at its end, and hides the viewport with the surface", () => {
    expect(appSource).toContain("const conversationSurfaceHidden = !operationalChatSelected");
    expect(appSource).toContain('<div className="chat-stream-viewport" hidden={conversationSurfaceHidden}>');
    expect(appSource).toContain('className={`conversation-recenter-floating ${conversationRecenter.visible ? "visible" : ""}`}');
    expect(rule(".conversation-recenter-floating")).toContain("opacity: 0");
    expect(rule(".conversation-recenter-floating.visible")).toContain("opacity: 1");
    expect(appStyles).toContain(".chat-stream-viewport[hidden]");
  });

  it("arrives and leaves as a transition rather than a blink", () => {
    const control = rule(".conversation-recenter-floating");
    expect(control).toMatch(/transition: opacity \d+ms/);
    // Staying mounted is what gives the exit its transition; conditional rendering would blink.
    expect(appSource).not.toContain("conversationRecenter.visible ? (");
    const reduced = appStyles.slice(appStyles.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".conversation-recenter-floating");
    expect(reduced).toContain("transition: none");
  });

  it("stays out of the tab order and out of the pointer while it has nothing to offer", () => {
    expect(appSource).toContain("aria-hidden={!conversationRecenter.visible}");
    expect(appSource).toContain("tabIndex={conversationRecenter.visible ? undefined : -1}");
    expect(rule(".conversation-recenter-floating")).toContain("pointer-events: none");
    expect(rule(".conversation-recenter-floating.visible")).toContain("pointer-events: auto");
  });

  it("returns to the end without re-entering the surface it already lives in", () => {
    const control = appSource.slice(
      appSource.indexOf("conversation-recenter-floating"),
      appSource.indexOf("</button>", appSource.indexOf("conversation-recenter-floating")),
    );
    expect(control).toContain("onClick={() => revealConversationEnd()}");
    // showConversation would redundantly re-select an altitude and surface already in view.
    expect(control).not.toContain("showConversation");
  });

  it("carries a light-theme contract as an overlay, not as a header button", () => {
    const light = appStyles.slice(appStyles.indexOf("CR092 light contract"));
    expect(light).toContain('[data-application-theme="daylight"]');
    expect(light).toContain('[data-application-theme="mist"]');
    expect(light).toContain('[data-application-theme="parchment"]');
    expect(light).toContain(".conversation-recenter-floating");
    expect(light.slice(0, light.indexOf("}"))).toContain("box-shadow");
  });
});
