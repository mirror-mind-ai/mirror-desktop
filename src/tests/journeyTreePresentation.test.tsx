import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyTreeIcon } from "../app/JourneyTreeIcon";
import appSource from "../app/App.tsx?raw";

describe("Journey tree presentation", () => {
  it("uses one dedicated dependency-free Journey glyph for every tree node", () => {
    const html = renderToStaticMarkup(<JourneyTreeIcon />);

    expect(html).toContain('data-journey-icon="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<svg");
    expect(html).toContain('width="18"');
    expect(html).toContain('height="18"');
    expect(html).not.toContain("artifact-type-icon");
  });

  it("replaces A-Z with an exclusive Pinned-only view", () => {
    expect(appSource).not.toContain('["name", "A–Z"]');
    expect(appSource).toMatch(/setPinnedOnly\(true\);\s+setJourneyListOrder\("recent"\)/);
    expect(appSource.match(/setPinnedOnly\(false\)/g)).toHaveLength(2);
    expect(appSource).toContain('aria-pressed={pinnedOnly}');
    expect(appSource).toContain('aria-pressed={!pinnedOnly && journeyListOrder === "recent"}');
    expect(appSource).toContain('aria-pressed={!pinnedOnly && journeyListOrder === "tree"}');
    expect(appSource).toContain('pinnedOnly ? filterPinnedJourneys(orderedJourneys) : orderedJourneys');
    expect(appSource).toContain("No pinned Journeys");
  });

  it("keeps the dense hierarchy treatment confined to Tree mode", () => {
    expect(appSource).toContain('journeyListOrder === "tree" ? "tree-mode" : "card-mode"');
    expect(appSource).toContain('journeyListOrder === "tree" ? "tree-node" : "card-node"');
    expect(appSource).toContain('journey.depth > 0 ? "is-nested" : "is-root"');
    expect(appSource).toContain('runtimeOwnerPhase ? `has-runtime runtime-${runtimeOwnerPhase}` : ""');
    expect(appSource).toContain('data-runtime-phase={runtimeOwnerPhase}');
    expect(appSource).toContain("<JourneyTreeIcon />");
    expect(appSource).toContain("--journey-depth");
    expect(appSource).toContain("journey-tree-toggle");
    expect(appSource).toContain('collapsed ? "›" : "▾"');
    expect(appSource).toContain("journey-tree-toggle-placeholder");
    expect(appSource).toContain("onContextMenu={(event) => openJourneyTreeMenu(event.currentTarget, event)}");
    expect(appSource).toContain('event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")');
    expect(appSource).toContain('role="menu"');
    expect(appSource).toContain('role="menuitem"');
    expect(appSource).toContain("Reload Journey tree");
    expect(appSource).toContain("event.preventDefault()");
    expect(appSource).toContain("event.stopPropagation()");
  });
});
