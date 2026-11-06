import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import appSource from "../app/App.tsx?raw";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { MIRROR_HISTORY_SUPPORTED } = await import("../domain/mirrorHistorySupport");
const { loadMirrorConversationCatalog, openMirrorConversationInTerminal, renameMirrorConversation } =
  await import("../app/mirrorConversationCatalog");
const { FocusedConversationSidebar } = await import("../app/FocusedConversationSidebar");
const { resolveRestoredConversationSelection } = await import("../domain/conversationSelectionMemory");

// CR206: the Navigator decided on 2026-11-06 that Nautilus works only with the conversations it
// created. Conversations the Mirror Core created elsewhere are no longer listed, opened, continued
// or renamed here. The code stays; one switch keeps it from being reached.
describe("CR206: only conversations Nautilus created", () => {
  beforeEach(() => invoke.mockReset());

  it("keeps Mirror history unsupported", () => {
    expect(MIRROR_HISTORY_SUPPORTED).toBe(false);
  });

  it("does not ask the Core for a Journey's Mirror history", async () => {
    const entries = await loadMirrorConversationCatalog({
      journeyId: "mirror-desktop",
      rootThreadId: "thread-root",
      managedMirrorConversationIds: [],
      limit: 50,
    });
    expect(entries).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("refuses to open Mirror history in Terminal or rename it in Mirror without calling the Core", async () => {
    await expect(openMirrorConversationInTerminal({ journeyId: "mirror-desktop", conversationId: "abc12345", messageLimit: 30 }))
      .rejects.toThrow(/only with the conversations it created/);
    await expect(renameMirrorConversation({ journeyId: "mirror-desktop", conversationId: "abc12345", title: "New" }))
      .rejects.toThrow(/only with the conversations it created/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not start a handoff from Mirror history", () => {
    const start = appSource.indexOf("async function createConversationFromMirrorHistory(");
    expect(start).toBeGreaterThan(0);
    const body = appSource.slice(start, appSource.indexOf("\n  }\n", start));
    expect(body).toMatch(/if \(!MIRROR_HISTORY_SUPPORTED \|\|/);
  });

  it("does not offer the Desktop only filter", () => {
    const html = renderToStaticMarkup(<FocusedConversationSidebar
      journeyId="mirror-desktop"
      journeyName="Mirror Desktop"
      entries={[]}
      status="ready"
      hiddenConversations={{}}
      hideMirrorHistory={false}
      offerMirrorHistoryFilter={MIRROR_HISTORY_SUPPORTED}
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
    expect(html).not.toContain("Desktop only");
    expect(html).not.toContain("focused-conversation-kind-filter");
    expect(appSource).toContain("offerMirrorHistoryFilter={MIRROR_HISTORY_SUPPORTED}");
  });

  it("lands a relaunch remembered on Mirror history on the Journey", () => {
    const result = resolveRestoredConversationSelection({
      memory: { "mirror-desktop": { kind: "mirror_history", conversationId: "abc12345" } },
      journeyId: "mirror-desktop",
      entries: [],
      hidden: {},
    });
    expect(result).toEqual({
      restored: false,
      reason: "conversation_missing",
      selection: { kind: "journey_workspace", journeyId: "mirror-desktop" },
    });
  });
});
