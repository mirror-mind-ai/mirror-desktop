import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { createDesktopConversation, loadDesktopConversationCatalog } from "../app/conversationSpaceStorage";
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
    });
    await expect(createDesktopConversation({
      journeyId: "mirror-desktop",
      journeyName: "Mirror Desktop",
      sourceConversationId: "source-conversation-1234567890",
      sourceMessageLimit: 30,
    })).resolves.toMatchObject({ kind: "desktop_conversation", conversationId: "conversation-1234567890" });
    expect(invoke).toHaveBeenCalledWith("create_desktop_conversation", expect.objectContaining({ journeyId: "mirror-desktop" }));
  });

  it("keeps authority creation and publication inside native lifecycle code", () => {
    expect(tauriSource).toContain("async fn create_desktop_conversation");
    expect(tauriSource).toContain("desktop_conversation_catalog_path");
    expect(tauriSource).toContain("provision_pi_session");
    expect(tauriSource).toContain("provision_mirror_conversation");
    expect(tauriSource).toContain('"sourceMessageLimit"');
  });
});
