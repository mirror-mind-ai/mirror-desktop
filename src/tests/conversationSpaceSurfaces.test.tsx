import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { MirrorHistoryActionSurface } from "../app/MirrorHistoryActionSurface";
import { ConversationEntryContextMenu } from "../app/ConversationEntryContextMenu";
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
      onCreateConversation={vi.fn()}
      onSelectEntry={vi.fn()}
      onContinueMirror={vi.fn()}
      onOpenMirrorTerminal={vi.fn()}
      onRenameMirror={vi.fn()}
    />);
    expect(html).toContain("Conversations");
    expect(html).toContain("New conversation");
    expect(html).not.toContain("Back to all Journeys");
    expect(html).not.toContain("Journey workspace");
    expect(html).toContain("Desktop child");
    expect(html).toContain("Mirror · 12 messages");
  });

  it("keeps long inline catalogs initially bounded", () => {
    const entries = Array.from({ length: 8 }, (_, index) => ({
      kind: "mirror_history" as const,
      conversationId: `mirror-conversation-${index + 1}`,
      title: `History ${index + 1}`,
      updatedAt: "2026-09-15T09:00:00.000Z",
      messageCount: index + 1,
      availability: "available_in_mirror" as const,
    }));
    const html = renderToStaticMarkup(<FocusedConversationSidebar
      journeyId="mirror-desktop"
      journeyName="Mirror Desktop"
      selected={{ kind: "journey_workspace", journeyId: "mirror-desktop" }}
      entries={entries}
      status="ready"
      onCreateConversation={vi.fn()}
      onSelectEntry={vi.fn()}
      onContinueMirror={vi.fn()}
      onOpenMirrorTerminal={vi.fn()}
      onRenameMirror={vi.fn()}
    />);
    expect(html).toContain("History 6");
    expect(html).not.toContain("History 7");
    expect(html).toContain("Show 2 more");
    expect(html).toContain("Create new conversation in Mirror Desktop");
  });

  it("renders Mirror history as a no-composer action surface", () => {
    const html = renderToStaticMarkup(<MirrorHistoryActionSurface
      entry={{
        kind: "mirror_history",
        conversationId: "mirror-conversation-1",
        title: "Terminal history",
        updatedAt: "2026-09-15T09:00:00.000Z",
        messageCount: 12,
        availability: "available_in_mirror",
        persona: "engineer",
      }}
      onCreateHandoff={vi.fn()}
      onOpenTerminal={vi.fn()}
    />);
    expect(html).toContain("Mirror Core Conversation");
    expect(html).toContain("This conversation belongs to Mirror Core via Terminal");
    expect(html).toContain("to continue here");
    expect(html.match(/Created with Mirror Core via Terminal/g)).toHaveLength(1);
    expect(html).toContain("Created with Mirror Core via Terminal. The source remains there.");
    expect(html).toContain("Continue in new Desktop Conversation");
    expect(html).toContain("Continue with recalled context in Terminal");
    expect(html).not.toContain("Rename in Mirror");
    expect(html).not.toContain("Persona");
    expect(html).not.toContain("engineer");
    expect(html).not.toContain("textarea");
  });

  it("offers all Mirror actions from the conversation context menu", () => {
    const html = renderToStaticMarkup(<ConversationEntryContextMenu
      entry={{
        kind: "mirror_history",
        conversationId: "mirror-conversation-1",
        title: "Terminal history",
        updatedAt: "2026-09-15T09:00:00.000Z",
        messageCount: 12,
        availability: "available_in_mirror",
      }}
      x={20}
      y={30}
      returnFocusTo={null}
      onContinue={vi.fn()}
      onOpenTerminal={vi.fn()}
      onRename={vi.fn()}
      onDismiss={vi.fn()}
    />);
    expect(html.match(/role="menuitem"/g)).toHaveLength(3);
    expect(html).toContain("Continue in new Desktop Conversation");
    expect(html).toContain("Continue with recalled context in Terminal");
    expect(html).toContain("Rename in Mirror");
  });

  it("renders an empty authoritative child without a synthetic greeting", () => {
    const html = renderToStaticMarkup(<EmptyDesktopConversation title="New conversation" />);
    expect(html).toContain("This conversation has not started yet");
    expect(html).not.toContain("How can I help you?");
  });
});
