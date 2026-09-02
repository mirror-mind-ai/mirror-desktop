import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyItemContextMenu } from "../app/JourneyItemContextMenu";
import appSource from "../app/App.tsx?raw";
import menuSource from "../app/JourneyItemContextMenu.tsx?raw";

const handlers = {
  onEdit: vi.fn(),
  onCreate: vi.fn(),
  onMove: vi.fn(),
  onDelete: vi.fn(),
  onDismiss: vi.fn(),
};

describe("Journey item context menu", () => {
  it("contains only the four current exact-Journey actions", () => {
    const html = renderToStaticMarkup(
      <JourneyItemContextMenu
        journeyId="journey-one"
        x={24}
        y={48}
        runtimeBusy={false}
        deleteDisabled={false}
        deleteTitle="Permanently delete this empty Journey."
        returnFocusTo={null}
        {...handlers}
      />,
    );

    expect(html.match(/role="menuitem"/g)).toHaveLength(4);
    expect(html).toContain("Edit Journey…");
    expect(html).toContain("Create Journey…");
    expect(html).toContain("Move Journey…");
    expect(html).toContain("Delete Journey…");
    expect(html).not.toContain("Assign project path");
    expect(html).not.toContain("Cancel");
    expect(menuSource).toContain("onEdit(journeyId)");
    expect(menuSource).toContain("onCreate(journeyId)");
    expect(menuSource).toContain("onMove(journeyId)");
    expect(menuSource).toContain("onDelete(journeyId)");
  });

  it("dismisses outside the menu and restores trigger focus on Escape", () => {
    expect(menuSource).toContain('document.addEventListener("mousedown", closeOnOutsidePointer)');
    expect(menuSource).toContain('document.addEventListener("keydown", closeWithKeyboard)');
    expect(menuSource).toContain('event.key === "Escape"');
    expect(menuSource).toContain("returnFocusRef.current?.focus()");
  });

  it("opens the same exact-target menu from Recent, Pinned, and Tree rows", () => {
    expect(appSource).toContain("openJourneyItemMenu(journey.id, event.currentTarget");
    expect(appSource).toContain('aria-haspopup="menu"');
    expect(appSource).not.toContain('journeyListOrder === "tree" && !runtimeBusy ? (event) =>');
    expect(appSource).not.toContain('journeyListOrder === "tree" && (event.key === "ContextMenu"');
  });
});
