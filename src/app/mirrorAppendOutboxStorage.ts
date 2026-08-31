import { invoke } from "@tauri-apps/api/core";
import type { MirrorAppendOutboxItem, MirrorAppendReceipt } from "../domain/mirrorAppendOutbox";
import { parseMirrorAppendReceipt } from "../domain/mirrorAppendOutbox";
import type { JourneySettlementAuthority } from "../domain/journeySettlementAuthority";

export type MirrorAppendOutboxSummary = {
  schemaVersion: "1.0.0";
  itemId: string;
  journeyId: string;
  threadId: string;
  generation: number;
  conversationId: string;
  createdAt: string;
};

function validateItemAuthority(item: MirrorAppendOutboxItem, authority: JourneySettlementAuthority): void {
  if (item.itemId !== authority.turnId
    || item.journeyId !== authority.journeyId
    || item.threadId !== authority.threadId
    || item.generation !== authority.generation
    || item.conversationId !== authority.mirrorConversationId
    || item.messages[0].id !== authority.harnessUserMessageId
    || item.messages[1].id !== authority.harnessAssistantMessageId) {
    throw new Error("mirror_append_item_authority_mismatch");
  }
}

export async function enqueueMirrorAppendItem(
  item: MirrorAppendOutboxItem,
  authority: JourneySettlementAuthority,
): Promise<void> {
  validateItemAuthority(item, authority);
  await invoke("enqueue_mirror_append_item", {
    payload: JSON.stringify(item),
    runAuthority: authority.runAuthority,
  });
}

export async function listMirrorAppendOutbox(journeyId: string): Promise<MirrorAppendOutboxSummary[]> {
  return invoke<MirrorAppendOutboxSummary[]>("list_mirror_append_outbox", { journeyId });
}

export async function appendMirrorOutboxItem(
  itemId: string,
  authority: JourneySettlementAuthority,
): Promise<MirrorAppendReceipt> {
  if (itemId !== authority.turnId) throw new Error("mirror_append_item_authority_mismatch");
  const receipt = parseMirrorAppendReceipt(await invoke<unknown>("append_mirror_outbox_item", {
    itemId,
    runAuthority: authority.runAuthority,
  }));
  if (!receipt
    || receipt.journeyId !== authority.journeyId
    || receipt.conversationId !== authority.mirrorConversationId
    || receipt.messages[0]?.id !== authority.harnessUserMessageId
    || receipt.messages[1]?.id !== authority.harnessAssistantMessageId) {
    throw new Error("mirror_append_invalid_receipt");
  }
  return receipt;
}

export type MirrorAppendAcknowledgement = {
  status: "acknowledged" | "already_acknowledged";
};

export async function acknowledgeMirrorAppendItem(
  itemId: string,
  conversationId: string,
  authority: JourneySettlementAuthority,
): Promise<MirrorAppendAcknowledgement> {
  if (itemId !== authority.turnId || conversationId !== authority.mirrorConversationId) {
    throw new Error("mirror_append_acknowledgement_authority_mismatch");
  }
  const result = await invoke<unknown>("acknowledge_mirror_append_item", {
    itemId,
    conversationId,
    runAuthority: authority.runAuthority,
  });
  if (!result || typeof result !== "object"
    || ((result as { status?: unknown }).status !== "acknowledged"
      && (result as { status?: unknown }).status !== "already_acknowledged")) {
    throw new Error("mirror_append_acknowledgement_invalid");
  }
  return result as MirrorAppendAcknowledgement;
}
