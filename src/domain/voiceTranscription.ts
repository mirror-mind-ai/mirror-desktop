// CV-008.DS-005 — voice prompt composition domain contract.
//
// Voice is a Mirror Desktop input capability. Nothing here starts an agent
// turn, touches Mirror Core or sends audio anywhere. The frontend only knows
// component readiness, a bounded recording session and how a transcript merges
// into the draft owned by the destination captured at recording start.

import { COMPOSER_DRAFT_MAX_CHARS } from "./composerDrafts";

export const VOICE_SAMPLE_RATE = 16_000;
export const VOICE_MAX_RECORDING_MS = 300_000;
/** Mirrors the native bound: five minutes of 16 kHz mono PCM16 plus header slack. */
export const VOICE_MAX_WAV_BYTES = VOICE_SAMPLE_RATE * 2 * (VOICE_MAX_RECORDING_MS / 1000) + 4096;
export const VOICE_TRANSCRIPT_SEPARATOR = "\n\n";

export type VoiceComponentState = "not_installed" | "ready" | "damaged" | "unsupported";

export type VoiceComponentStatus = {
  state: VoiceComponentState;
  platform: string;
  architecture: string;
  manifestUrl: string;
  componentVersion?: string;
  modelId?: string;
  sizeBytes?: number;
  installedAt?: string;
  message?: string;
};

export type VoiceTranscript = {
  text: string;
  audioSeconds: number;
  durationMs: number;
  modelId: string;
  componentVersion: string;
};

export type VoiceModelChoice = {
  id: string;
  sizeBytes: number;
};

export type VoiceComponentCatalog = {
  componentVersion: string;
  defaultModel: string;
  models: VoiceModelChoice[];
};

export type VoiceInstallProgress = {
  phase: "manifest" | "executable" | "model" | "verifying" | "ready";
  receivedBytes?: number;
  totalBytes?: number;
};

export type VoiceSession =
  | { kind: "idle" }
  | { kind: "requesting_permission"; draftKey: string }
  | { kind: "recording"; draftKey: string; startedAt: number }
  | { kind: "transcribing"; draftKey: string };

export const idleVoiceSession: VoiceSession = { kind: "idle" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function parseVoiceComponentStatus(value: unknown): VoiceComponentStatus | undefined {
  if (!isRecord(value)) return undefined;
  const state = value.state;
  if (state !== "not_installed" && state !== "ready" && state !== "damaged" && state !== "unsupported") return undefined;
  const platform = optionalString(value.platform);
  const architecture = optionalString(value.architecture);
  if (!platform || !architecture || typeof value.manifestUrl !== "string") return undefined;
  const status: VoiceComponentStatus = { state, platform, architecture, manifestUrl: value.manifestUrl };
  const componentVersion = optionalString(value.componentVersion);
  const modelId = optionalString(value.modelId);
  const sizeBytes = optionalNonNegativeNumber(value.sizeBytes);
  const installedAt = optionalString(value.installedAt);
  const message = optionalString(value.message);
  if (state === "ready" && (!componentVersion || !modelId || sizeBytes === undefined)) return undefined;
  if (componentVersion) status.componentVersion = componentVersion;
  if (modelId) status.modelId = modelId;
  if (sizeBytes !== undefined) status.sizeBytes = sizeBytes;
  if (installedAt) status.installedAt = installedAt;
  if (message) status.message = message;
  return status;
}

export function parseVoiceTranscript(value: unknown): VoiceTranscript | undefined {
  if (!isRecord(value) || typeof value.text !== "string") return undefined;
  const audioSeconds = optionalNonNegativeNumber(value.audioSeconds);
  const durationMs = optionalNonNegativeNumber(value.durationMs);
  const modelId = optionalString(value.modelId);
  const componentVersion = optionalString(value.componentVersion);
  if (audioSeconds === undefined || durationMs === undefined || !modelId || !componentVersion) return undefined;
  return { text: value.text, audioSeconds, durationMs, modelId, componentVersion };
}

export function parseVoiceComponentCatalog(value: unknown): VoiceComponentCatalog | undefined {
  if (!isRecord(value) || !Array.isArray(value.models)) return undefined;
  const componentVersion = optionalString(value.componentVersion);
  const defaultModel = optionalString(value.defaultModel);
  if (!componentVersion || !defaultModel) return undefined;
  const models: VoiceModelChoice[] = [];
  for (const entry of value.models) {
    if (!isRecord(entry)) return undefined;
    const id = optionalString(entry.id);
    const sizeBytes = optionalNonNegativeNumber(entry.sizeBytes);
    if (!id || sizeBytes === undefined) return undefined;
    models.push({ id, sizeBytes });
  }
  if (!models.some((model) => model.id === defaultModel)) return undefined;
  return { componentVersion, defaultModel, models };
}

/**
 * Accuracy and speed trade off sharply by model, and the right choice depends
 * on the machine. TS-1 measured a 2019 Intel i7 without Metal: `base` mistook
 * ordinary Portuguese words, `small` recovered them at roughly three times
 * real time, and `large-v3-turbo` was accurate at roughly nine times real time.
 */
export function describeVoiceModel(id: string): { label: string; detail: string } {
  if (id.includes("tiny")) return { label: "Tiny", detail: "Fastest. English only in practice; unreliable for Portuguese." };
  if (id.includes("base")) return { label: "Base", detail: "Fast. Good English; misses Portuguese words and proper nouns." };
  if (id.includes("small")) return { label: "Small", detail: "Balanced. Reliable Portuguese and English for dictation." };
  if (id.includes("medium")) return { label: "Medium", detail: "Accurate and slow." };
  if (id.includes("turbo")) return { label: "Large turbo", detail: "Most accurate Portuguese. Slow without a GPU." };
  if (id.includes("large")) return { label: "Large", detail: "Most accurate. Slowest." };
  return { label: id, detail: "" };
}

export function parseVoiceInstallProgress(value: unknown): VoiceInstallProgress | undefined {
  if (!isRecord(value)) return undefined;
  const phase = value.phase;
  if (phase !== "manifest" && phase !== "executable" && phase !== "model" && phase !== "verifying" && phase !== "ready") return undefined;
  const progress: VoiceInstallProgress = { phase };
  const receivedBytes = optionalNonNegativeNumber(value.receivedBytes);
  const totalBytes = optionalNonNegativeNumber(value.totalBytes);
  if (receivedBytes !== undefined) progress.receivedBytes = receivedBytes;
  if (totalBytes !== undefined) progress.totalBytes = totalBytes;
  return progress;
}

/**
 * Append a transcript to the draft owned by the destination captured at
 * recording start. Existing text is never replaced; the transcript is bounded
 * by the composer limit so the merge can never exceed what the draft store
 * accepts. An empty transcript leaves the draft untouched.
 */
export function appendTranscriptToDraft(
  existing: string,
  transcript: string,
  maxChars = COMPOSER_DRAFT_MAX_CHARS,
): string {
  const spoken = transcript.trim();
  if (!spoken) return existing;
  const base = existing.replace(/\s+$/u, "");
  const merged = base ? `${base}${VOICE_TRANSCRIPT_SEPARATOR}${spoken}` : spoken;
  return merged.slice(0, maxChars);
}

/**
 * The microphone control is one entry point for two consents. When the
 * component is absent it opens installation consent; when ready it starts a
 * recording. Damaged or unsupported components explain instead of recording.
 */
export type VoiceControlIntent = "install" | "record" | "stop" | "explain" | "blocked";

export function voiceControlIntent(
  status: VoiceComponentStatus | undefined,
  session: VoiceSession,
  options: { installing: boolean; composerBusy: boolean },
): VoiceControlIntent {
  if (session.kind === "recording") return "stop";
  if (session.kind !== "idle" || options.installing || options.composerBusy || !status) return "blocked";
  if (status.state === "ready") return "record";
  if (status.state === "not_installed") return "install";
  return "explain";
}

export function voiceControlLabel(intent: VoiceControlIntent, session: VoiceSession, installing: boolean): string {
  if (session.kind === "recording") return "Stop recording";
  if (session.kind === "transcribing") return "Transcribing…";
  if (session.kind === "requesting_permission") return "Waiting for microphone permission";
  if (installing) return "Installing local transcription";
  if (intent === "install") return "Install local transcription";
  if (intent === "explain") return "Local transcription needs attention";
  return "Record a voice prompt";
}

export function formatComponentSize(bytes: number | undefined): string {
  if (bytes === undefined) return "unknown size";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function describeInstallProgress(progress: VoiceInstallProgress | undefined): string {
  if (!progress) return "Preparing installation…";
  const amount = progress.receivedBytes !== undefined
    ? progress.totalBytes
      ? ` (${formatComponentSize(progress.receivedBytes)} of ${formatComponentSize(progress.totalBytes)})`
      : ` (${formatComponentSize(progress.receivedBytes)})`
    : "";
  switch (progress.phase) {
    case "manifest": return "Reading the component manifest…";
    case "executable": return `Downloading the transcription engine${amount}…`;
    case "model": return `Downloading the speech model${amount}…`;
    case "verifying": return "Verifying checksums and installing…";
    case "ready": return "Local transcription is ready.";
  }
}

const voiceErrorMessages: Record<string, string> = {
  voice_manifest_invalid: "The voice component manifest could not be validated. Installation was not started.",
  voice_model_unknown: "That speech model is not offered by the component manifest.",
  voice_platform_unsupported: "Local transcription is not available for this platform yet.",
  voice_download_failed: "The voice component could not be downloaded. Check the connection and try again.",
  voice_artifact_checksum_mismatch: "A downloaded file failed checksum verification, so nothing was installed.",
  voice_component_unavailable: "The voice component storage could not be prepared.",
  voice_component_damaged: "The installed transcription component is incomplete. Remove it and install again.",
  voice_component_not_installed: "Local transcription is not installed.",
  voice_audio_invalid: "The recording could not be prepared for transcription.",
  voice_audio_unsupported_format: "The recording format is not supported for local transcription.",
  voice_audio_too_long: "The recording exceeds the five-minute limit.",
  voice_language_invalid: "The language hint is invalid.",
  voice_transcription_failed: "Local transcription failed. The draft was left unchanged.",
  voice_transcription_timeout: "Local transcription took too long and was stopped. The draft was left unchanged.",
  voice_permission_denied: "Microphone access was denied. Allow the microphone in System Settings and try again.",
  voice_capture_unsupported: "This window cannot capture audio. Local transcription is unavailable here.",
  voice_recording_empty: "No audio was captured.",
};

export function voiceErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return voiceErrorMessages[code] ?? (code ? `Voice transcription failed: ${code}` : "Voice transcription failed.");
}

export function transcriptDestinationNotice(
  originDraftKey: string,
  visibleDraftKey: string,
  originLabel: string,
): string | undefined {
  if (originDraftKey === visibleDraftKey) return undefined;
  return `The voice transcript was added to the draft for ${originLabel}, where the recording started.`;
}
