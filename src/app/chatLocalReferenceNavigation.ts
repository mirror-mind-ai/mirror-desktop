import { invoke } from "@tauri-apps/api/core";

export type ChatLocalReferenceDisposition =
  | { kind: "journey_document"; relativePath: string }
  | { kind: "external_file" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeChatLocalReferenceDisposition(value: unknown): ChatLocalReferenceDisposition {
  if (!isRecord(value) || !["journey_document", "external_file"].includes(String(value.kind))) {
    throw new Error("Local file routing returned invalid evidence.");
  }
  if (value.kind === "external_file") {
    if (Object.keys(value).some((key) => !["kind"].includes(key))) {
      throw new Error("Local file routing returned invalid evidence.");
    }
    return { kind: "external_file" };
  }
  if (typeof value.relativePath !== "string"
    || !value.relativePath
    || value.relativePath.startsWith("/")
    || value.relativePath.split(/[\\/]/).some((part) => !part || part === "." || part === "..")) {
    throw new Error("Local file routing returned invalid evidence.");
  }
  return { kind: "journey_document", relativePath: value.relativePath };
}

export async function classifyChatLocalReference(
  journeyId: string,
  path: string,
): Promise<ChatLocalReferenceDisposition> {
  return normalizeChatLocalReferenceDisposition(
    await invoke<unknown>("classify_chat_local_reference", { journeyId, path }),
  );
}

export async function openExternalChatLocalReference(path: string, basePath?: string): Promise<void> {
  await invoke("open_local_reference", { path, basePath });
}

export async function openJourneyDocument(journeyId: string, relativePath: string): Promise<void> {
  await invoke("open_journey_document", { journeyId, relativePath });
}
