export const MAX_FILE_ATTACHMENTS = 32;
export const MAX_PERSISTED_THUMBNAIL_BYTES = 512 * 1024;

export type FileAttachmentThumbnail = {
  schemaVersion: "0.1.0";
  mediaType: "image/png";
  dataUrl: string;
  width: number;
  height: number;
};

export type FileAttachment = {
  schemaVersion: "0.2.0";
  attachmentId: string;
  journeyId: string;
  absolutePath: string;
  displayName: string;
  sizeBytes: number;
  selectedAt: string;
  kind: "file" | "image";
  thumbnail?: FileAttachmentThumbnail;
};

export type AgentFileReference = Pick<FileAttachment, "absolutePath" | "displayName">;

export type FileAttachmentResponse = {
  schemaVersion: "0.2.0";
  maxFiles: number;
  attachments: FileAttachment[];
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is invalid.`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error(`${label} contains unsupported fields.`);
}

function isAbsolutePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && (value.startsWith("/") || value.startsWith("\\\\") || /^[A-Za-z]:[\\/]/.test(value))
    && !value.includes("\0");
}

function normalizeThumbnail(value: unknown): FileAttachmentThumbnail {
  const thumbnail = record(value, "File attachment thumbnail");
  exactKeys(thumbnail, ["schemaVersion", "mediaType", "dataUrl", "width", "height"], "File attachment thumbnail");
  if (thumbnail.schemaVersion !== "0.1.0"
    || thumbnail.mediaType !== "image/png"
    || typeof thumbnail.dataUrl !== "string"
    || !thumbnail.dataUrl.startsWith("data:image/png;base64,")
    || new TextEncoder().encode(thumbnail.dataUrl).byteLength > MAX_PERSISTED_THUMBNAIL_BYTES
    || typeof thumbnail.width !== "number" || !Number.isInteger(thumbnail.width) || thumbnail.width < 1 || thumbnail.width > 512
    || typeof thumbnail.height !== "number" || !Number.isInteger(thumbnail.height) || thumbnail.height < 1 || thumbnail.height > 512) {
    throw new Error("File attachment thumbnail is invalid.");
  }
  return thumbnail as unknown as FileAttachmentThumbnail;
}

export function normalizePersistedFileAttachment(value: unknown, journeyId: string): FileAttachment {
  const item = record(value, "File attachment");
  exactKeys(item, ["schemaVersion", "attachmentId", "journeyId", "absolutePath", "displayName", "sizeBytes", "selectedAt", "kind", "thumbnail"], "File attachment");
  if (item.schemaVersion !== "0.2.0"
    || typeof item.attachmentId !== "string" || !item.attachmentId
    || item.journeyId !== journeyId
    || !isAbsolutePath(item.absolutePath)
    || typeof item.displayName !== "string" || !item.displayName
    || typeof item.sizeBytes !== "number" || !Number.isInteger(item.sizeBytes) || item.sizeBytes < 0
    || typeof item.selectedAt !== "string" || Number.isNaN(Date.parse(item.selectedAt))
    || (item.kind !== "file" && item.kind !== "image")) {
    throw new Error("File attachment is invalid or belongs to another Journey.");
  }
  const thumbnail = item.thumbnail === undefined ? undefined : normalizeThumbnail(item.thumbnail);
  if ((item.kind === "file" && thumbnail) || (item.kind === "image" && !thumbnail)) {
    throw new Error("File attachment image preview is inconsistent.");
  }
  return { ...(item as unknown as FileAttachment), ...(thumbnail ? { thumbnail } : {}) };
}

export function normalizeFileAttachmentResponse(value: unknown, journeyId: string): FileAttachmentResponse {
  const response = record(value, "File attachment response");
  exactKeys(response, ["schemaVersion", "maxFiles", "attachments"], "File attachment response");
  if (response.schemaVersion !== "0.2.0"
    || typeof response.maxFiles !== "number" || !Number.isInteger(response.maxFiles) || response.maxFiles < 1 || response.maxFiles > MAX_FILE_ATTACHMENTS
    || !Array.isArray(response.attachments)) {
    throw new Error("File attachment response is invalid.");
  }
  const attachments = response.attachments.map((item) => normalizePersistedFileAttachment(item, journeyId))
    .sort((left, right) => left.absolutePath.localeCompare(right.absolutePath));
  if (attachments.length > response.maxFiles) throw new Error("File attachment count is invalid.");
  const paths = new Set<string>();
  const ids = new Set<string>();
  for (const attachment of attachments) {
    if (paths.has(attachment.absolutePath) || ids.has(attachment.attachmentId)) {
      throw new Error("File attachment response contains duplicate paths or IDs.");
    }
    paths.add(attachment.absolutePath);
    ids.add(attachment.attachmentId);
  }
  return { schemaVersion: "0.2.0", maxFiles: response.maxFiles, attachments };
}

export function addFileAttachments(current: FileAttachment[], additions: FileAttachment[], journeyId: string, maxFiles: number): FileAttachment[] {
  if ([...current, ...additions].some((item) => item.journeyId !== journeyId)) throw new Error("Pending files belong to another Journey.");
  const byPath = new Map(current.map((item) => [item.absolutePath, item]));
  for (const addition of additions) byPath.set(addition.absolutePath, addition);
  if (byPath.size > maxFiles) throw new Error(`Attach no more than ${maxFiles} files to one message.`);
  return [...byPath.values()].sort((left, right) => left.absolutePath.localeCompare(right.absolutePath));
}

export function removeFileAttachment(current: FileAttachment[], attachmentId: string): FileAttachment[] {
  return current.filter((item) => item.attachmentId !== attachmentId);
}

export function toAgentFileReferences(attachments: FileAttachment[]): AgentFileReference[] {
  return attachments.map(({ absolutePath, displayName }) => ({ absolutePath, displayName }));
}
