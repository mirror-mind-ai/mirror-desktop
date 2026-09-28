import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import { ComposerContextMenu } from "../app/ComposerContextMenu";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function render(overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <ComposerContextMenu canCompact compacting={false} onCompactNow={() => undefined} {...overrides} />,
  );
}

// CR080: the context label's menu. Manual compaction is the escape hatch, offered where the
// number that motivates it already lives.
describe("Composer context menu", () => {
  it("offers Compact now as a menu item and says what it does", () => {
    const html = render();
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain("Compact now");
    expect(html).toContain("Closes a chapter");
    expect(html).not.toContain("disabled");
  });

  it("refuses with the reason while compaction is unavailable", () => {
    const html = render({ canCompact: false, unavailableReason: "A turn is still running." });
    expect(html).toContain("disabled");
    expect(html).toContain("A turn is still running.");
  });

  it("reports an in-flight compaction and refuses a second one", () => {
    const html = render({ compacting: true });
    expect(html).toContain("Compacting…");
    expect(html).toContain("disabled");
  });

  it("rides the popover contract that claims back the footer's pointer events", () => {
    // The Composer footer disables pointer events for its subtree (the CR078 lesson).
    expect(render()).toContain("model-intent-menu");
    const menu = cssSource.slice(
      cssSource.indexOf(".model-intent-menu {"),
      cssSource.indexOf("}", cssSource.indexOf(".model-intent-menu {")),
    );
    expect(menu).toContain("pointer-events: auto");
  });
});
