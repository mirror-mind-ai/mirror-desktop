import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { MirrorHistoryActionSurface } from "../app/MirrorHistoryActionSurface";
import { EmptyDesktopConversation } from "../app/EmptyDesktopConversation";

describe("conversation space surfaces", () => {
  it("renders the focused Journey root separately from child Conversations", () => {
    const html = renderToStaticMarkup(<FocusedConversationSidebar
      journeyId="mirror-desktop"
      journeyName="Mirror Desktop"
      selected={{ kind: "journey_workspace", journeyId: "mirror-desktop" }}
      entries={[{
        kind: "desktop_conversation",
        conversationId: "desktop-conversation-1",
        threadId: "desktop-thread-1",
        title: "Desktop child",
        updatedAt: "2026-09-15T10:00:00.000Z",
        messageCount: 0,
        availability: "ready",
        authority: {
          activeGeneration: 1, runtimeChannel: "development", generations: [{
            generation: 1, status: "ready", piSessionId: "pi-session-child-1", piSessionFile: "/app/pi-session-child-1.jsonl",
            mirrorConversationId: "mirror-generation-child-1", createdAt: "2026-09-15T10:00:00.000Z", activatedAt: "2026-09-15T10:00:00.000Z",
            activationReceipt: {
              schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1", generation: 1,
              piSessionId: "pi-session-child-1", mirrorConversationId: "mirror-generation-child-1", mode: "mirror",
              commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-15T10:00:00.000Z",
            },
          }],
        },
      }, {
        kind: "mirror_history",
        conversationId: "mirror-conversation-1",
        title: "Terminal history",
        updatedAt: "2026-09-15T09:00:00.000Z",
        messageCount: 12,
        availability: "available_in_mirror",
      }]}
      status="ready"
      onCollapse={vi.fn()}
      onCreateConversation={vi.fn()}
      onSelectRoot={vi.fn()}
      onSelectEntry={vi.fn()}
    />);
    expect(html).toContain("Back to all Journeys");
    expect(html).toContain("Journey workspace");
    expect(html).toContain("New conversation");
    expect(html).toContain("Desktop child");
    expect(html).toContain("Available in Mirror");
  });

  it("renders Mirror history as a no-composer action surface", () => {
    const html = renderToStaticMarkup(<MirrorHistoryActionSurface
      journeyId="mirror-desktop"
      entry={{
        kind: "mirror_history",
        conversationId: "mirror-conversation-1",
        title: "Terminal history",
        updatedAt: "2026-09-15T09:00:00.000Z",
        messageCount: 12,
        availability: "available_in_mirror",
      }}
      onCreateHandoff={vi.fn()}
      onOpenTerminal={vi.fn()}
      onRename={vi.fn()}
    />);
    expect(html).toContain("Available in Mirror");
    expect(html).toContain("Create Desktop conversation from this history");
    expect(html).toContain("Open in Terminal with recalled context");
    expect(html).toContain("Rename in Mirror");
    expect(html).not.toContain("textarea");
  });

  it("renders an empty authoritative child without a synthetic greeting", () => {
    const html = renderToStaticMarkup(<EmptyDesktopConversation title="New conversation" />);
    expect(html).toContain("This conversation has not started yet");
    expect(html).not.toContain("How can I help you?");
  });
});
