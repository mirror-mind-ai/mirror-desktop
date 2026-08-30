import { invoke } from "@tauri-apps/api/core";
import type { MirrorAppendOutboxItem, MirrorAppendReceipt } from "../domain/mirrorAppendOutbox";
import { parseMirrorAppendReceipt } from "../domain/mirrorAppendOutbox";

export type MirrorAppendOutboxSummary = {
  schemaVersion: "1.0.0";
  itemId: string;
  journeyId: string;
  threadId: string;
  generation: number;
  conversationId: string;
  createdAt: string;
};

export async function enqueueMirrorAppendItem(item: MirrorAppendOutboxItem): Promise<void> {
  await invoke("enqueue_mirror_append_item", { payload: JSON.stringify(item) });
}

export async function listMirrorAppendOutbox(journeyId: string): Promise<MirrorAppendOutboxSummary[]> {
  return invoke<MirrorAppendOutboxSummary[]>("list_mirror_append_outbox", { journeyId });
}

export async function appendMirrorOutboxItem(itemId: string): Promise<MirrorAppendReceipt> {
  const receipt = parseMirrorAppendReceipt(await invoke<unknown>("append_mirror_outbox_item", { itemId }));
  if (!receipt) throw new Error("mirror_append_invalid_receipt");
  return receipt;
}

export async function acknowledgeMirrorAppendItem(itemId: string, conversationId: string): Promise<void> {
  await invoke("acknowledge_mirror_append_item", { itemId, conversationId });
}
