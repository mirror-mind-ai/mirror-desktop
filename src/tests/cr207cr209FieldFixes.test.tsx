import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error Vitest runs in Node; production code has no Node dependency.
import { readFileSync } from "node:fs";
import appSource from "../app/App.tsx?raw";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";

const cssSource: string = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

function body(source: string, signature: string): string {
  const start = source.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf("\n  }\n", start));
}

function rule(selector: string): string {
  const start = cssSource.indexOf(`${selector} {`);
  expect(start).toBeGreaterThan(-1);
  return cssSource.slice(start, cssSource.indexOf("}", start));
}

// CR207: New under a Journey's conversations created the conversation in whichever Journey was
// selected, because every group's button called the same function and it read the selection.
describe("CR207: New creates the conversation in the Journey whose group it is in", () => {
  it("passes the group's Journey to the request", () => {
    expect(appSource).toContain("onCreateConversation={() => requestBlankDesktopConversation(journey.id)}");
  });

  it("creates in the requested Journey, never the selected one", () => {
    const create = body(appSource, "async function createBlankDesktopConversation(");
    expect(create).toContain("journeyId: target.journeyId");
    expect(create).toContain("updateConversationCatalogFor(target.journeyId,");
    expect(create).toContain("selectJourney(target.journeyId, \"pointer\")");
    expect(create).not.toMatch(/journeyId: selectedJourney\b/);
    expect(create).not.toContain("setConversationCatalog(");
  });

  it("suggests and validates the title against the requested Journey's own list", () => {
    const request = body(appSource, "function requestBlankDesktopConversation(");
    expect(request).toContain("journeyCatalogState(conversationCatalogs, journeyId).entries");
    const create = body(appSource, "async function createBlankDesktopConversation(");
    expect(create).toContain("validateConversationTitle(target.entries, title)");
  });

  it("names the Journey in the dialog", () => {
    const dialog = appSource.slice(appSource.indexOf('aria-label="Create Desktop Conversation"'));
    expect(dialog.slice(0, 900)).toContain("New Conversation in {conversationCreateTarget.journeyName}");
  });
});

// CR208: the conversations under a nested Journey drew their guide at the root's column.
describe("CR208: a nested Journey's conversations sit under it", () => {
  it("carries the Journey's depth to the conversation group", () => {
    const html = renderToStaticMarkup(<FocusedConversationSidebar
      journeyId="livro"
      journeyName="Livro"
      depth={2}
      entries={[]}
      status="ready"
      hiddenConversations={{}}
      hideMirrorHistory={false}
      onToggleMirrorHistoryFilter={vi.fn()}
      onCreateConversation={vi.fn()}
      onSelectEntry={vi.fn()}
      onContinueMirror={vi.fn()}
      onOpenMirrorTerminal={vi.fn()}
      onRenameConversation={vi.fn()}
      onDeleteDesktop={vi.fn()}
      onHideConversation={vi.fn()}
      onRevealConversation={vi.fn()}
      onRevealAllConversations={vi.fn()}
      onHideEveryOtherConversation={vi.fn()}
    />);
    expect(html).toContain("--journey-depth:2");
    expect(appSource).toContain("depth={journeyListOrder === \"tree\" ? journey.depth : 0}");
  });

  it("indents the group by the same 16px per level the tree rows use", () => {
    expect(rule(".journey-list.tree-mode .focused-conversation-sidebar"))
      .toContain("margin: 0 4px 4px calc(20px + (var(--journey-depth, 0) * 16px));");
  });
});

// CR209: on a light theme the working folder's path was painted white, because the light families
// paint every unlisted button white, and the prefix kept a dark-theme grey.
describe("CR209: the working folder line is readable on light themes", () => {
  it("keeps the path out of the light families' white button ink", () => {
    const start = cssSource.indexOf(":where(button:not(.secondary-button");
    const exclusions = cssSource.slice(start, cssSource.indexOf(")) {", start));
    expect(exclusions).toContain(".active-journey-folder-path");
  });

  it("draws the line from the theme's tokens, not dark-theme colours", () => {
    expect(rule(".active-journey-folder")).toContain("color: var(--text-muted);");
    expect(rule(".active-journey-folder-path")).not.toMatch(/rgba\(255, 255, 255/);
    expect(rule(".active-journey-folder-path:hover")).toContain("color: var(--text);");
    expect(cssSource).toMatch(/\[data-application-theme="parchment"\]\n\) \.active-journey-folder\.fallback \{ color: #9a5b13; \}/);
  });
});
