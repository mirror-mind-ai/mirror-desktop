import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JourneyItemContextMenu } from "../app/JourneyItemContextMenu";
import appSource from "../app/App.tsx?raw";
import menuSource from "../app/JourneyItemContextMenu.tsx?raw";

const handlers = {
  onTogglePin: vi.fn(),
  onEdit: vi.fn(),
  onCreate: vi.fn(),
  onMove: vi.fn(),
  onDelete: vi.fn(),
  onDismiss: vi.fn(),
};

describe("Journey item context menu", () => {
  it("moves Pin into the exact-Journey menu before the four administrative actions", () => {
    const html = renderToStaticMarkup(
      <JourneyItemContextMenu
        journeyId="journey-one"
        x={24}
        y={48}
        pinned={false}
        deleteDisabled={false}
        deleteTitle="Permanently delete this empty Journey."
        returnFocusTo={null}
        {...handlers}
      />,
    );

    expect(html.match(/role="menuitem"/g)).toHaveLength(4);
    expect(html.match(/role="menuitemcheckbox"/g)).toHaveLength(1);
    expect(html).toContain("Pin Journey");
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("Edit Journey…");
    expect(html).toContain("Create Journey…");
    expect(html).toContain("Move Journey…");
    expect(html).toContain("Delete Journey…");
    expect(html).not.toContain("Assign project path");
    expect(html).not.toContain("Cancel");
    expect(menuSource).toContain("onTogglePin(journeyId)");
    expect(menuSource).toContain("onEdit(journeyId)");
    expect(menuSource).toContain("onCreate(journeyId)");
    expect(menuSource).toContain("onMove(journeyId)");
    expect(menuSource).toContain("onDelete(journeyId)");
  });

  /**
   * CR099: the menu used to take an app-wide `runtimeBusy` and disable its four administrative
   * items with it. Nothing here is disabled by a turn any more. Delete is the only item that can be
   * refused, and the caller passes the reason as its title.
   */
  it("disables nothing but Delete, and only with a reason", () => {
    const refused = renderToStaticMarkup(
      <JourneyItemContextMenu
        journeyId="journey-one"
        x={24}
        y={48}
        pinned
        deleteDisabled
        deleteTitle="An agent is working in this Journey. Stop the turn before deleting it."
        returnFocusTo={null}
        {...handlers}
      />,
    );
    expect(refused).toContain('role="menuitemcheckbox" aria-checked="true"');
    expect(refused).toContain("Unpin Journey");
    expect(refused).toContain("An agent is working in this Journey. Stop the turn before deleting it.");
    expect(refused.match(/disabled=""/g)).toHaveLength(1);

    const allowed = renderToStaticMarkup(
      <JourneyItemContextMenu
        journeyId="journey-one"
        x={24}
        y={48}
        pinned
        deleteDisabled={false}
        deleteTitle="Permanently delete this empty Journey."
        returnFocusTo={null}
        {...handlers}
      />,
    );
    expect(allowed.match(/disabled=""/g)).toBeNull();
    expect(menuSource).not.toContain("runtimeBusy");
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
    // CR099: the tree asks per Journey, so the global flag no longer reaches these controls.
    expect(appSource).toContain('dragAllowed: treeOperation("drag", journeyId).allowed,');
    expect(appSource).toContain('treeOperation("delete", journeyItemMenu.journeyId)');
    expect(appSource).not.toContain('journeyListOrder === "tree" && (event.key === "ContextMenu"');
  });
});
