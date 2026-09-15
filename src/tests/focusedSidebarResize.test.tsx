import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusedSidebarResizeHandle } from "../app/FocusedSidebarResizeHandle";
import { loadFocusedSidebarWidth, saveFocusedSidebarWidth } from "../app/focusedSidebarWidthStorage";

describe("focused conversation sidebar resizing", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });
  it("exposes a keyboard-operable separator without relying on color", () => {
    const html = renderToStaticMarkup(<FocusedSidebarResizeHandle width={292} viewportWidth={1200} onChange={() => undefined} />);
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-label="Resize conversation sidebar"');
    expect(html).toContain('aria-valuenow="292"');
    expect(html).toContain('tabindex="0"');
  });

  it("persists a clamped width per runtime channel", () => {
    window.localStorage.clear();
    expect(saveFocusedSidebarWidth("development", 999, 1200)).toBe(420);
    expect(loadFocusedSidebarWidth("development", 1200)).toBe(420);
    expect(loadFocusedSidebarWidth("user", 1200)).toBe(292);
  });
});
