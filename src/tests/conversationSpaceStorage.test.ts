import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import {
  createDesktopConversation, deleteDesktopConversation, loadDesktopConversationCatalog, reconcileDesktopConversationCatalogEntry,
} from "../app/conversationSpaceStorage";
import { loadDedicatedJourneyConversation } from "../app/journeyConversationStorage";
import tauriSource from "../../src-tauri/src/main.rs?raw";

describe("native Desktop conversation lifecycle", () => {
  beforeEach(() => invoke.mockReset());

  it("loads a bounded Journey-scoped catalog", async () => {
    invoke.mockResolvedValue({ schemaVersion: "1.0.0", journeyId: "mirror-desktop", entries: [] });
    await expect(loadDesktopConversationCatalog("mirror-desktop")).resolves.toEqual([]);
    expect(invoke).toHaveBeenCalledWith("load_desktop_conversation_catalog", { journeyId: "mirror-desktop" });
  });

  it("rejects native responses that resolve to another Journey", async () => {
    invoke.mockResolvedValue({ schemaVersion: "1.0.0", journeyId: "other-journey", entries: [] });
    await expect(loadDesktopConversationCatalog("mirror-desktop")).rejects.toThrow("Journey authority");
  });

  it("creates authority before returning a handoff destination", async () => {
    invoke.mockResolvedValue({
      schemaVersion: "1.0.0",
      kind: "desktop_conversation",
      journeyId: "mirror-desktop",
      conversationId: "conversation-1234567890",
      threadId: "desktop-thread-1234567890",
      title: "New conversation",
      updatedAt: "2026-09-14T00:00:00.000Z",
      messageCount: 0,
      availability: "ready",
      authority: {
        activeGeneration: 1, runtimeChannel: "development", generations: [{
          generation: 1, status: "ready", piSessionId: "pi-session-1234567890", piSessionFile: "/app/pi-session-1234567890.jsonl",
          mirrorConversationId: "mirror-generation-1234567890", createdAt: "2026-09-14T00:00:00.000Z", activatedAt: "2026-09-14T00:00:00.000Z",
          activationReceipt: {
            schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1234567890", generation: 1,
            piSessionId: "pi-session-1234567890", mirrorConversationId: "mirror-generation-1234567890", mode: "mirror",
            commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-14T00:00:00.000Z",
          },
        }],
      },
    });
    await expect(createDesktopConversation({
      journeyId: "mirror-desktop",
      journeyName: "Mirror Desktop",
      sourceConversationId: "source-conversation-1234567890",
      sourceMessageLimit: 30,
    })).resolves.toMatchObject({ kind: "desktop_conversation", conversationId: "conversation-1234567890" });
    expect(invoke).toHaveBeenCalledWith("create_desktop_conversation", expect.objectContaining({ journeyId: "mirror-desktop" }));
  });

  it("deletes a Desktop child only through exact native Journey authority", async () => {
    invoke.mockResolvedValue(undefined);
    const input = { journeyId: "mirror-desktop", conversationId: "conversation-1234567890" };
    await expect(deleteDesktopConversation(input)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("delete_desktop_conversation", input);
    expect(tauriSource).toContain("recover_pending_desktop_conversation_deletion");
    expect(tauriSource).toContain('"kind":"desktop_conversation_deletion"');
  });

  it("reconciles settlement metadata only through exact child generation authority", async () => {
    invoke.mockResolvedValue({
      schemaVersion: "1.0.0", kind: "desktop_conversation", journeyId: "mirror-desktop",
      conversationId: "conversation-1234567890", threadId: "desktop-thread-1234567890",
      title: "Conversation", updatedAt: "2026-09-15T00:00:00.000Z", messageCount: 42, availability: "ready",
      authority: { activeGeneration: 2, runtimeChannel: "development", generations: [{
        generation: 1, status: "inactive", piSessionId: "pi-session-prior-123", piSessionFile: "/app/pi-prior.jsonl",
        mirrorConversationId: "mirror-conversation-prior-123", createdAt: "2026-09-13T00:00:00.000Z",
        activatedAt: "2026-09-13T00:00:00.000Z", closedAt: "2026-09-14T00:00:00.000Z", activationReceipt: {
          schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1234567890", generation: 1,
          piSessionId: "pi-session-prior-123", mirrorConversationId: "mirror-conversation-prior-123", mode: "mirror",
          commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-13T00:00:00.000Z",
        },
      }, {
        generation: 2, status: "ready", piSessionId: "pi-session-1234567890", piSessionFile: "/app/pi-session.jsonl",
        mirrorConversationId: "mirror-conversation-1234567890", createdAt: "2026-09-14T00:00:00.000Z",
        activatedAt: "2026-09-14T00:00:00.000Z", activationReceipt: {
          schemaVersion: "1.0.0", journeyId: "mirror-desktop", threadId: "desktop-thread-1234567890", generation: 2,
          piSessionId: "pi-session-1234567890", mirrorConversationId: "mirror-conversation-1234567890", mode: "mirror",
          commandAuthority: "installed", runtimeChannel: "development", activatedAt: "2026-09-14T00:00:00.000Z",
        },
      }] },
    });
    const input = { journeyId: "mirror-desktop", threadId: "desktop-thread-1234567890", generation: 2,
      updatedAt: "2026-09-15T00:00:00.000Z", messageCount: 42 };
    await expect(reconcileDesktopConversationCatalogEntry(input)).resolves.toMatchObject({ messageCount: 42 });
    expect(invoke).toHaveBeenCalledWith("reconcile_desktop_conversation_catalog_entry", input);
  });

  it("loads child projections by exact thread without changing the Journey", async () => {
    invoke.mockResolvedValue(null);
    await expect(loadDedicatedJourneyConversation("mirror-desktop", 1, "desktop-thread-1234567890")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("load_dedicated_journey_conversation", {
      journeyId: "mirror-desktop", generation: 1, threadId: "desktop-thread-1234567890",
    });
  });

  it("keeps authority creation and publication inside native lifecycle code", () => {
    const creation = tauriSource.slice(
      tauriSource.indexOf("async fn create_desktop_conversation"),
      tauriSource.indexOf("async fn restart_desktop_conversation"),
    );
    expect(tauriSource).toContain("async fn create_desktop_conversation");
    expect(tauriSource).toContain("async fn restart_desktop_conversation");
    expect(tauriSource).toContain("desktop_conversation_catalog_path");
    expect(tauriSource).toContain("provision_pi_session");
    expect(tauriSource).toContain("provision_mirror_conversation");
    expect(tauriSource).toContain('"sourceMessageLimit"');
    expect(tauriSource).toContain('"kind": "desktop_conversation_creation", "phase": "reserved"');
    expect(tauriSource).toContain("recover_pending_desktop_conversation_creation");
    expect(creation.indexOf("write_desktop_conversation_creation(&operation_path, &operation"))
      .toBeLessThan(creation.indexOf("tauri::async_runtime::spawn_blocking"));
    const reset = tauriSource.slice(
      tauriSource.indexOf("async fn restart_desktop_conversation"),
      tauriSource.indexOf("fn reconcile_desktop_conversation_catalog_entry"),
    );
    expect(reset.indexOf("write_desktop_conversation_reset(&operation_path, &operation"))
      .toBeLessThan(reset.indexOf("tauri::async_runtime::spawn_blocking"));
  });
});
