import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  parseVoiceComponentCatalog,
  parseVoiceComponentStatus,
  parseVoiceInstallProgress,
  parseVoiceTranscript,
  VOICE_MAX_WAV_BYTES,
  type VoiceComponentCatalog,
  type VoiceComponentStatus,
  type VoiceInstallProgress,
  type VoiceTranscript,
} from "../domain/voiceTranscription";

export const VOICE_INSTALL_PROGRESS_EVENT = "voice-transcription-progress";

function requireStatus(value: unknown): VoiceComponentStatus {
  const status = parseVoiceComponentStatus(value);
  if (!status) throw new Error("voice_component_unavailable");
  return status;
}

export async function loadVoiceComponentStatus(): Promise<VoiceComponentStatus> {
  return requireStatus(await invoke<unknown>("voice_transcription_status"));
}

/** Read-only: reports the models the manifest offers. Installs nothing. */
export async function loadVoiceComponentCatalog(): Promise<VoiceComponentCatalog> {
  const catalog = parseVoiceComponentCatalog(await invoke<unknown>("voice_transcription_catalog"));
  if (!catalog) throw new Error("voice_manifest_invalid");
  return catalog;
}

/**
 * Install the managed local transcription component after explicit consent.
 * The native side fetches the Mirror-controlled manifest, verifies checksums
 * and installs under channel-scoped app data; it never starts a recording.
 * Installing a different model replaces the previous one.
 */
export async function installVoiceComponent(onProgress?: (progress: VoiceInstallProgress) => void, modelId?: string): Promise<VoiceComponentStatus> {
  const unlisten = onProgress
    ? await listen<unknown>(VOICE_INSTALL_PROGRESS_EVENT, (event) => {
        const progress = parseVoiceInstallProgress(event.payload);
        if (progress) onProgress(progress);
      })
    : () => undefined;
  try {
    return requireStatus(await invoke<unknown>("voice_transcription_install", { modelId: modelId ?? null }));
  } finally {
    unlisten();
  }
}

export async function removeVoiceComponent(): Promise<VoiceComponentStatus> {
  return requireStatus(await invoke<unknown>("voice_transcription_remove"));
}

/**
 * Transcribe bounded 16 kHz mono PCM16 WAV bytes locally. Only audio bytes and
 * an optional two-letter language hint cross the boundary; no paths, no
 * arguments, no destination identity.
 */
export async function transcribeVoiceWav(wav: Uint8Array, language?: string): Promise<VoiceTranscript> {
  if (wav.byteLength === 0) throw new Error("voice_recording_empty");
  if (wav.byteLength > VOICE_MAX_WAV_BYTES) throw new Error("voice_audio_too_long");
  const transcript = parseVoiceTranscript(await invoke<unknown>("voice_transcription_transcribe", { wav: Array.from(wav), language: language ?? null }));
  if (!transcript) throw new Error("voice_transcription_failed");
  return transcript;
}
