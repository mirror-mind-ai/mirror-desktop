import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FocusedConversationSidebar } from "../app/FocusedConversationSidebar";
import { MirrorHistoryActionSurface } from "../app/MirrorHistoryActionSurface";
import { ConversationEntryContextMenu } from "../app/ConversationEntryContextMenu";
import { EmptyDesktopConversation } from "../app/EmptyDesktopConversation";
import { ConversationDetailHeader } from "../app/ConversationDetailHeader";

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
      actionMessage="Creating dedicated Desktop authority…"
      onCreateConversation={vi.fn()}
      onSelectEntry={vi.fn()}
      onContinueMirror={vi.fn()}
      onOpenMirrorTerminal={vi.fn()}
      onRenameConversation={vi.fn()}
      onDeleteDesktop={vi.fn()}
    />);
    expect(html).toContain("Conversations");
    expect(html).toContain("Creating dedicated Desktop authority…");
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
      onRenameConversation={vi.fn()}
      onDeleteDesktop={vi.fn()}
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
    expect(html).toContain("Mirror history · Source actions only");
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
      onDeleteDesktop={vi.fn()}
      onDismiss={vi.fn()}
    />);
    expect(html.match(/role="menuitem"/g)).toHaveLength(3);
    expect(html).toContain("Continue in new Desktop Conversation");
    expect(html).toContain("Continue with recalled context in Terminal");
    expect(html).toContain("Rename in Mirror");
  });

  it("offers destructive deletion only for a Desktop child", () => {
    const html = renderToStaticMarkup(<ConversationEntryContextMenu
      entry={{
        kind: "desktop_conversation", conversationId: "desktop-conversation-1", threadId: "desktop-thread-1",
        title: "Disposable child", updatedAt: "2026-09-15T09:00:00.000Z", messageCount: 0, availability: "ready",
        authority: {
          activeGeneration: 1, runtimeChannel: "development", generations: [{
            generation: 1, status: "ready", piSessionId: "pi-session-child-1", piSessionFile: "/app/pi-session-child-1.jsonl",
            mirrorConversationId: "399badc9", createdAt: "2026-09-15T09:00:00.000Z", activatedAt: "2026-09-15T09:00:00.000Z",
            activationReceipt: {
              schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1", generation: 1,
              piSessionId: "pi-session-child-1", mirrorConversationId: "399badc9", mode: "mirror",
              commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-15T09:00:00.000Z",
            },
          }],
        },
      }}
      x={20} y={30} returnFocusTo={null}
      onContinue={vi.fn()} onOpenTerminal={vi.fn()} onRename={vi.fn()} onDeleteDesktop={vi.fn()} onDismiss={vi.fn()}
    />);
    expect(html.match(/role="menuitem"/g)).toHaveLength(2);
    expect(html).toContain("Rename Conversation…");
    expect(html).toContain("Delete Conversation…");
    expect(html).not.toContain("Rename in Mirror");
  });

  it("renders an empty authoritative child through the shared detail surface", () => {
    const html = renderToStaticMarkup(<EmptyDesktopConversation
      title="New conversation"
      journeyName="Mirror Desktop"
      onChoose={vi.fn()}
    />);
    expect(html).toContain("Conversation ready · Journey context is active");
    expect(html).toContain("Understand where we are");
    expect(html).toContain("Think out loud");
    expect(html).toContain("Nothing is sent until you decide");
    expect(html).not.toContain("How can I help you?");
  });

  it("uses one detail header for Desktop and Mirror Conversation surfaces", () => {
    const desktop = renderToStaticMarkup(<ConversationDetailHeader entry={{
      kind: "desktop_conversation", conversationId: "desktop-conversation-1", threadId: "desktop-thread-1",
      title: "Planning the next release", updatedAt: "2026-09-15T09:00:00.000Z", messageCount: 4, availability: "ready",
      authority: {
        activeGeneration: 1, runtimeChannel: "development", generations: [{
          generation: 1, status: "ready", piSessionId: "pi-session-child-1", piSessionFile: "/app/pi-session-child-1.jsonl",
          mirrorConversationId: "399badc9", createdAt: "2026-09-15T09:00:00.000Z", activatedAt: "2026-09-15T09:00:00.000Z",
          activationReceipt: {
            schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1", generation: 1,
            piSessionId: "pi-session-child-1", mirrorConversationId: "399badc9", mode: "mirror",
            commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-15T09:00:00.000Z",
          },
        }],
      },
    }} />);
    const mirror = renderToStaticMarkup(<ConversationDetailHeader entry={{
      kind: "mirror_history", conversationId: "mirror-conversation-1", title: "Terminal history",
      updatedAt: "2026-09-15T09:00:00.000Z", messageCount: 12, availability: "available_in_mirror",
    }} />);
    expect(desktop).toContain("Planning the next release");
    expect(desktop).toContain("Desktop Conversation");
    expect(mirror).toContain("Terminal history");
    expect(mirror).toContain("Mirror Core Conversation");
    expect(desktop).toContain("conversation-detail-header");
    expect(mirror).toContain("conversation-detail-header");
  });
});
