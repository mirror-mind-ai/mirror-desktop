export type ContextAttachmentMediaType = "text/markdown" | "text/plain";

export type ContextAttachmentLimits = {
  maxFiles: number;
  maxFileBytes: number;
  maxAggregateBytes: number;
};

export type ContextAttachmentSnapshot = {
  schemaVersion: "0.1.0";
  attachmentId: string;
  journeyId: string;
  relativePath: string;
  displayName: string;
  mediaType: ContextAttachmentMediaType;
  sizeBytes: number;
  sha256: string;
  capturedAt: string;
  content: string;
};

export type ConversationAttachmentProvenance = Omit<ContextAttachmentSnapshot, "content">;

export type ContextAttachmentSnapshotResponse = {
  schemaVersion: "0.1.0";
  limits: ContextAttachmentLimits;
  snapshots: ContextAttachmentSnapshot[];
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error(`${label} contains unsupported fields.`);
}

function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) throw new Error(`${label} is invalid.`);
  return value;
}

export function isSafeContextRelativePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && value.split(/[\\/]/).every((part) => part.length > 0 && part !== "." && part !== "..");
}

function normalizeLimits(value: unknown): ContextAttachmentLimits {
  const limits = record(value, "Context attachment limits");
  exactKeys(limits, ["maxFiles", "maxFileBytes", "maxAggregateBytes"], "Context attachment limits");
  return {
    maxFiles: positiveInteger(limits.maxFiles, "Context attachment file limit"),
    maxFileBytes: positiveInteger(limits.maxFileBytes, "Context attachment per-file limit"),
    maxAggregateBytes: positiveInteger(limits.maxAggregateBytes, "Context attachment aggregate limit"),
  };
}

function normalizeSnapshot(value: unknown, journeyId: string): ContextAttachmentSnapshot {
  const item = record(value, "Context attachment snapshot");
  exactKeys(item, ["schemaVersion", "attachmentId", "journeyId", "relativePath", "displayName", "mediaType", "sizeBytes", "sha256", "capturedAt", "content"], "Context attachment snapshot");
  if (item.schemaVersion !== "0.1.0"
    || typeof item.attachmentId !== "string" || !item.attachmentId
    || item.journeyId !== journeyId
    || !isSafeContextRelativePath(item.relativePath)
    || typeof item.displayName !== "string" || !item.displayName
    || !["text/markdown", "text/plain"].includes(String(item.mediaType))
    || typeof item.sizeBytes !== "number" || !Number.isInteger(item.sizeBytes) || item.sizeBytes < 0
    || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256)
    || typeof item.capturedAt !== "string" || Number.isNaN(Date.parse(item.capturedAt))
    || typeof item.content !== "string"
    || new TextEncoder().encode(item.content).byteLength !== item.sizeBytes) {
    throw new Error("Context attachment snapshot is invalid or belongs to another Journey.");
  }
  return item as unknown as ContextAttachmentSnapshot;
}

export function normalizeContextSnapshotResponse(value: unknown, journeyId: string): ContextAttachmentSnapshotResponse {
  const response = record(value, "Context attachment response");
  exactKeys(response, ["schemaVersion", "limits", "snapshots"], "Context attachment response");
  if (response.schemaVersion !== "0.1.0" || !Array.isArray(response.snapshots)) {
    throw new Error("Context attachment response is invalid.");
  }
  const limits = normalizeLimits(response.limits);
  const snapshots = response.snapshots.map((item) => normalizeSnapshot(item, journeyId))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  if (snapshots.length === 0 || snapshots.length > limits.maxFiles) throw new Error("Context attachment count is invalid.");
  const paths = new Set<string>();
  const ids = new Set<string>();
  let total = 0;
  for (const snapshot of snapshots) {
    if (paths.has(snapshot.relativePath) || ids.has(snapshot.attachmentId)) throw new Error("Context attachment response contains duplicate paths or IDs.");
    paths.add(snapshot.relativePath);
    ids.add(snapshot.attachmentId);
    if (snapshot.sizeBytes > limits.maxFileBytes) throw new Error("Context attachment exceeds the per-file byte limit.");
    total += snapshot.sizeBytes;
  }
  if (total > limits.maxAggregateBytes) throw new Error("Context attachments exceed the aggregate byte limit.");
  return { schemaVersion: "0.1.0", limits, snapshots };
}

export function addContextSnapshots(
  current: ContextAttachmentSnapshot[],
  additions: ContextAttachmentSnapshot[],
  journeyId: string,
): ContextAttachmentSnapshot[] {
  if ([...current, ...additions].some((item) => item.journeyId !== journeyId)) {
    throw new Error("Pending context must belong to the selected Journey.");
  }
  const byPath = new Map(current.map((item) => [item.relativePath, item]));
  for (const item of additions) {
    if (byPath.has(item.relativePath)) throw new Error("Context path is already attached; remove it before capturing a replacement.");
    byPath.set(item.relativePath, item);
  }
  return [...byPath.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function removeContextSnapshot(current: ContextAttachmentSnapshot[], attachmentId: string): ContextAttachmentSnapshot[] {
  return current.filter((item) => item.attachmentId !== attachmentId);
}

export function clearContextSnapshots(_current: ContextAttachmentSnapshot[]): ContextAttachmentSnapshot[] {
  return [];
}

export function provenanceFromSnapshot(snapshot: ContextAttachmentSnapshot): ConversationAttachmentProvenance {
  const { content: _content, ...provenance } = snapshot;
  return provenance;
}

export function normalizeConversationAttachmentProvenance(
  value: unknown,
  journeyId: string,
): ConversationAttachmentProvenance {
  const item = record(value, "Conversation attachment provenance");
  exactKeys(item, ["schemaVersion", "attachmentId", "journeyId", "relativePath", "displayName", "mediaType", "sizeBytes", "sha256", "capturedAt"], "Conversation attachment provenance");
  if (item.schemaVersion !== "0.1.0"
    || typeof item.attachmentId !== "string" || !item.attachmentId
    || item.journeyId !== journeyId
    || !isSafeContextRelativePath(item.relativePath)
    || typeof item.displayName !== "string" || !item.displayName
    || !["text/markdown", "text/plain"].includes(String(item.mediaType))
    || typeof item.sizeBytes !== "number" || !Number.isInteger(item.sizeBytes) || item.sizeBytes < 0
    || typeof item.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256)
    || typeof item.capturedAt !== "string" || Number.isNaN(Date.parse(item.capturedAt))
    || "content" in item) {
    throw new Error("Conversation attachment provenance is invalid or belongs to another Journey.");
  }
  return item as unknown as ConversationAttachmentProvenance;
}

export function validateContextSnapshotsForSend(
  snapshots: ContextAttachmentSnapshot[],
  journeyId: string,
  limits: ContextAttachmentLimits,
): string[] {
  const errors: string[] = [];
  if (snapshots.some((item) => item.journeyId !== journeyId)) errors.push("Pending context belongs to another Journey.");
  if (snapshots.length > limits.maxFiles) errors.push("Pending context exceeds the file-count limit.");
  if (snapshots.some((item) => item.sizeBytes > limits.maxFileBytes)) errors.push("Pending context exceeds the per-file byte limit.");
  if (snapshots.reduce((total, item) => total + item.sizeBytes, 0) > limits.maxAggregateBytes) errors.push("Pending context exceeds the aggregate byte limit.");
  if (snapshots.some((item) => new TextEncoder().encode(item.content).byteLength !== item.sizeBytes || !/^[a-f0-9]{64}$/.test(item.sha256))) {
    errors.push("Pending context integrity is invalid.");
  }
  return errors;
}
