// Read-only compatibility for conversations written by DS-007 schema 0.6.0.
export type ConversationAttachmentProvenance = {
  schemaVersion: "0.1.0";
  attachmentId: string;
  journeyId: string;
  relativePath: string;
  displayName: string;
  mediaType: "text/markdown" | "text/plain";
  sizeBytes: number;
  sha256: string;
  capturedAt: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Legacy attachment provenance is invalid.");
  return value as Record<string, unknown>;
}

export function normalizeConversationAttachmentProvenance(value: unknown, journeyId: string): ConversationAttachmentProvenance {
  const item = record(value);
  const keys = new Set(["schemaVersion", "attachmentId", "journeyId", "relativePath", "displayName", "mediaType", "sizeBytes", "sha256", "capturedAt"]);
  if (Object.keys(item).some((key) => !keys.has(key))
    || item.schemaVersion !== "0.1.0"
    || typeof item.attachmentId !== "string" || !item.attachmentId
    || item.journeyId !== journeyId
    || typeof item.relativePath !== "string" || !item.relativePath
    || typeof item.displayName !== "string" || !item.displayName
    || !["text/markdown", "text/plain"].includes(String(item.mediaType))
    || typeof item.sizeBytes !== "number" || !Number.isInteger(item.sizeBytes) || item.sizeBytes < 0
    || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256)
    || typeof item.capturedAt !== "string" || Number.isNaN(Date.parse(item.capturedAt))) {
    throw new Error("Legacy attachment provenance is invalid or belongs to another Journey.");
  }
  return item as unknown as ConversationAttachmentProvenance;
}
