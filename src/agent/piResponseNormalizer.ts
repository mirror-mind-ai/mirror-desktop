import type { MissionDraft } from "./piTaskPacket";

export type NormalizedPiResponse = {
  assistantMessage: string;
  missionDraft?: MissionDraft;
  openQuestions: string[];
  diagnostics: string[];
  safety?: {
    execution?: string;
    filesMutated?: boolean;
    mirrorInvoked?: boolean;
  };
};

type LoosePiPayload = {
  assistantMessage?: unknown;
  missionDraft?: unknown;
};

export function normalizePiResponse(rawOutput: string, diagnostics: string[] = []): NormalizedPiResponse {
  const jsonText = extractJsonFromMarkdownFence(rawOutput) ?? extractFirstJsonObject(rawOutput);
  const payload = jsonText ? parseJsonPayload(jsonText) : undefined;

  if (!payload || !jsonText) {
    return {
      assistantMessage: cleanPlainText(rawOutput) || "Pi returned no readable response.",
      openQuestions: [],
      diagnostics,
    };
  }

  const missionDraft = normalizeMissionDraft(payload.missionDraft);
  const assistantMessage = normalizeAssistantMessage(payload.assistantMessage) || cleanPlainText(removeJsonPayload(rawOutput, jsonText));

  return {
    assistantMessage: assistantMessage || "Pi returned a structured response without assistant prose.",
    missionDraft,
    openQuestions: extractOpenQuestions(payload.missionDraft),
    safety: extractSafety(payload.missionDraft),
    diagnostics,
  };
}

function extractJsonFromMarkdownFence(value: string): string | undefined {
  const match = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim();
}

function extractFirstJsonObject(value: string): string | undefined {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return undefined;
  }
  return value.slice(start, end + 1);
}

function parseJsonPayload(value: string): LoosePiPayload | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as LoosePiPayload;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizeMissionDraft(value: unknown): MissionDraft | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const draft = value as Record<string, unknown>;
  const status = draft.status === "formulated" ? "formulated" : "draft";
  const title = typeof draft.title === "string" && draft.title.trim() ? draft.title : undefined;
  const purpose = typeof draft.purpose === "string" && draft.purpose.trim() ? draft.purpose : normalizeString(draft.intention);

  return {
    id: normalizeString(draft.id),
    title,
    purpose,
    status,
  };
}

function normalizeAssistantMessage(value: unknown): string | undefined {
  const message = normalizeString(value);
  return message ? formatAssistantMessage(message) : undefined;
}

function extractOpenQuestions(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  const questions = (value as Record<string, unknown>).openQuestions;
  if (!Array.isArray(questions)) {
    return [];
  }
  return questions.filter((question): question is string => typeof question === "string" && question.trim().length > 0);
}

function extractSafety(value: unknown): NormalizedPiResponse["safety"] {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const safety = (value as Record<string, unknown>).safety;
  if (!safety || typeof safety !== "object") {
    return undefined;
  }
  const record = safety as Record<string, unknown>;
  return {
    execution: normalizeString(record.execution),
    filesMutated: typeof record.filesMutated === "boolean" ? record.filesMutated : undefined,
    mirrorInvoked: typeof record.mirrorInvoked === "boolean" ? record.mirrorInvoked : undefined,
  };
}

function removeJsonPayload(rawOutput: string, jsonText: string): string {
  return rawOutput.replace(/```(?:json)?\s*[\s\S]*?```/i, "").replace(jsonText, "");
}

function cleanPlainText(value: string): string {
  return formatAssistantMessage(
    value
      .replace(/^⏳ .*$/gm, "")
      .replace(/^⚠️ .*$/gm, "")
      .trim(),
  );
}

function formatAssistantMessage(value: string): string {
  const text = value.trim();
  if (!text) {
    return text;
  }

  if (text.includes("\n")) {
    return normalizeLineBreaks(text);
  }

  return normalizeLineBreaks(
    text
      .replace(/\s+(#{1,6}\s+)/g, "\n\n$1")
      .replace(/\s+([-*]\s+)/g, "\n$1")
      .replace(/\s+(\d+[.)]\s+)/g, "\n$1")
      .replace(/([.!?])\s+([A-ZÀ-Ý][^.!?]{36,}:)/g, "$1\n\n$2"),
  );
}

function normalizeLineBreaks(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
