import { describe, expect, it } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";

const cssSource = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function declarationBlock(selector: string): string {
  const at = cssSource.indexOf(selector);
  if (at < 0) throw new Error(`missing rule ${selector}`);
  const open = cssSource.indexOf("{", at);
  return cssSource.slice(open, cssSource.indexOf("}", open));
}

// CR082: the compact sidebar is a Journey rail. It cannot be a 72px version of the expanded
// sidebar, because the focused Conversation list wraps into unreadable vertical text there.
describe("collapsed sidebar polish", () => {
  it("hides the focused Conversation expansion instead of squeezing it into the rail", () => {
    expect(cssSource).toContain(".sidebar-compact .journey-conversation-toggle,");
    expect(cssSource).toContain(".sidebar-compact .focused-conversation-sidebar {");
    expect(cssSource).toContain("display: none;");
    expect(appSource).toContain("conversationsExpanded ? (");
    expect(appSource).toContain("<FocusedConversationSidebar");
    // Compacting is presentation only: the reducer action that semantically collapses a focused
    // Conversation remains tied to the explicit per-Journey toggle, not to sidebar compaction.
    const toggleSidebar = appSource.slice(
      appSource.indexOf("function toggleSidebarPresentation()"),
      appSource.indexOf("function showJourneyTree()"),
    );
    expect(toggleSidebar).not.toContain("dispatchConversationFocus");
  });

  it("gives compact Journey tiles their own grammar instead of inheriting expanded cards", () => {
    expect(cssSource).toContain("CR082: the compact sidebar is a rail");
    const tile = declarationBlock(".sidebar-compact .journey-item.card-node,");
    expect(tile).toContain("background: transparent");
    expect(tile).toContain("box-shadow: none");
    expect(tile).toContain("flex: 0 0 48px");
    expect(tile).toContain("min-height: 48px");
    expect(tile).toContain("transform: none");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node::before,");
    expect(cssSource).toContain("display: none;");

    const defaultGlyph = declarationBlock(".sidebar-compact .journey-item.card-node .journey-icon.default,");
    expect(defaultGlyph).toContain("background: transparent");
    expect(defaultGlyph).toContain("border-color: transparent");
    expect(defaultGlyph).toContain("box-shadow: none");
    expect(defaultGlyph).toContain("height: 30px");

    const ordering = declarationBlock(".sidebar-compact .journey-order-control");
    expect(ordering).toContain("background: transparent");
    expect(ordering).toContain("border-color: transparent");
  });

  it("keeps active, running and pinned states visually orthogonal", () => {
    expect(appSource).toContain('appearance?.kind === "custom" ? "has-custom-appearance" : ""');
    expect(appSource).toContain('journey.pinned ? "is-pinned" : ""');
    expect(appSource).toContain("deriveJourneyAgentStatus({");
    expect(appSource).toContain("status={agentStatus}");
    expect(appSource).toContain('placement="sidebar"');
    expect(appSource).not.toContain("runtimeOwnerPhase ? `has-runtime runtime-${runtimeOwnerPhase}` : \"\"");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node.selected,");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node.has-custom-appearance.selected");
    expect(cssSource).toContain(".sidebar-compact .journey-agent-status.placement-sidebar");
    expect(cssSource).toContain(".sidebar-compact .journey-item.card-node.is-pinned::after,");
    const pinned = declarationBlock(".sidebar-compact .journey-item.card-node.is-pinned::after,");
    expect(pinned).toContain('content: ""');
    expect(pinned).toContain("height: 6px");
    expect(pinned).toContain("right: 8px");
    expect(pinned).toContain("top: 8px");

    const customSelected = declarationBlock(".sidebar-compact .journey-item.card-node.has-custom-appearance.selected");
    expect(customSelected).toContain("background: transparent");
    expect(customSelected).toContain("border-color: transparent");
    expect(customSelected).toContain("box-shadow: none");
    const customIcon = declarationBlock(".sidebar-compact .journey-item.card-node .journey-icon.custom");
    expect(customIcon).toContain("height: 42px");
    expect(customIcon).toContain("width: 42px");
  });

  it("preserves labels and discoverability while visible copy is absent", () => {
    expect(appSource).toContain("const journeyStateDescription = [");
    expect(appSource).toContain("journey.pinned ? \"Pinned\" : undefined");
    expect(appSource).toContain('title={`${journey.name}${journeyStateDescription ? ` — ${journeyStateDescription}` : ""}`}');
    expect(appSource).toContain('aria-label={`${journey.name}${journeyStateDescription ? `, ${journeyStateDescription}` : ""}`}');
  });

  it("harmonizes the compact brand mark with custom Journey icons", () => {
    const brand = declarationBlock(".sidebar-compact .brand-mark");
    const customIcon = declarationBlock(".sidebar-compact .journey-item.card-node .journey-icon.custom");
    expect(brand).toContain("height: 42px");
    expect(brand).toContain("width: 42px");
    expect(customIcon).toContain("height: 42px");
    expect(customIcon).toContain("width: 42px");
  });

  it("pins a compact light-theme override after the generic light Journey card rules", () => {
    const generic = cssSource.indexOf(") :where(.journey-item.card-node, .message.assistant");
    const compact = cssSource.indexOf("CR082 light compact rail contract");
    expect(generic).toBeGreaterThan(-1);
    expect(compact).toBeGreaterThan(generic);
    const light = cssSource.slice(compact, cssSource.indexOf("/* Channel-local user avatar contract. */"));
    expect(light).toContain(".app-shell.sidebar-compact:is(");
    expect(light).toContain("box-shadow: none");
    expect(light).toContain(".journey-item.card-node.selected");
    expect(light).toContain(".journey-item.card-node.has-custom-appearance.selected");
    expect(light).toContain(".journey-item.card-node.selected .journey-icon.custom");
    expect(light).toContain(".journey-item.card-node.is-pinned::after");
    expect(light).toContain(".journey-item.card-node .journey-icon.default");
    expect(light).toContain(".journey-order-control {");
  });
});
