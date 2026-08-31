import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeMirrorAppendItem, appendMirrorOutboxItem } from "../app/mirrorAppendOutboxStorage";
import { createDedicatedJourneyConversation } from "../domain/journeyConversation";
import { createDedicatedTurnAuthority } from "../domain/dedicatedTurnAuthority";
import { createJourneySettlementAuthority } from "../domain/journeySettlementAuthority";
import { createRunAuthority } from "../domain/runAuthority";
import { readyThread } from "./fixtures/readyThread";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

function authority() {
  const thread = readyThread("journey-one");
  const conversation = createDedicatedJourneyConversation({ thread, initialMessages: [] });
  const correlation = createDedicatedTurnAuthority(thread, "run-one", "turn-one", "user-one", "assistant-one");
  return createJourneySettlementAuthority(createRunAuthority(correlation, conversation.liveIdentity, thread.generations[0]));
}

describe("Mirror append storage authority", () => {
  beforeEach(() => invoke.mockReset());

  it("accepts acknowledged and already_acknowledged only with exact authority", async () => {
    const exact = authority();
    invoke.mockResolvedValueOnce({ status: "acknowledged" }).mockResolvedValueOnce({ status: "already_acknowledged" });
    await expect(acknowledgeMirrorAppendItem("turn-one", exact.mirrorConversationId, exact))
      .resolves.toEqual({ status: "acknowledged" });
    await expect(acknowledgeMirrorAppendItem("turn-one", exact.mirrorConversationId, exact))
      .resolves.toEqual({ status: "already_acknowledged" });
    expect(invoke).toHaveBeenCalledWith("acknowledge_mirror_append_item", expect.objectContaining({
      itemId: "turn-one", conversationId: exact.mirrorConversationId, runAuthority: exact.runAuthority,
    }));
  });

  it("fails closed before invoke for contradictory acknowledgement authority", async () => {
    const exact = authority();
    await expect(acknowledgeMirrorAppendItem("turn-a2", exact.mirrorConversationId, exact))
      .rejects.toThrow("mirror_append_acknowledgement_authority_mismatch");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("validates inserted/existing receipts against the complete authority", async () => {
    const exact = authority();
    invoke.mockResolvedValue({
      schemaVersion: "1.0.0", status: "accepted", conversationId: exact.mirrorConversationId,
      journeyId: exact.journeyId, insertedCount: 0, existingCount: 2,
      messages: [{ id: exact.harnessUserMessageId, state: "existing" },
        { id: exact.harnessAssistantMessageId, state: "existing" }],
    });
    await expect(appendMirrorOutboxItem(exact.turnId, exact)).resolves.toMatchObject({ existingCount: 2 });
    expect(invoke).toHaveBeenCalledWith("append_mirror_outbox_item", {
      itemId: exact.turnId,
      runAuthority: exact.runAuthority,
    });
    invoke.mockResolvedValueOnce({
      schemaVersion: "1.0.0", status: "accepted", conversationId: exact.mirrorConversationId,
      journeyId: "journey-b", insertedCount: 2, existingCount: 0,
      messages: [{ id: exact.harnessUserMessageId, state: "inserted" },
        { id: exact.harnessAssistantMessageId, state: "inserted" }],
    });
    await expect(appendMirrorOutboxItem(exact.turnId, exact)).rejects.toThrow("mirror_append_invalid_receipt");
  });
});
