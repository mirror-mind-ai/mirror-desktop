// CV-008.DS-005 — WebView microphone capture.
//
// Recording starts only from an explicit user action. The captured audio stays
// in memory, is converted to 16 kHz mono WAV in TypeScript and is handed to
// the native boundary once. Cancel discards it without transcription.

import { pcm16WavFromDecodedAudio } from "../domain/voiceAudio";
import { VOICE_MAX_RECORDING_MS } from "../domain/voiceTranscription";

export type VoiceCaptureHandle = {
  /** Stop recording and resolve with the captured audio. */
  stop: () => Promise<Blob>;
  /** Stop recording and discard everything captured. */
  cancel: () => void;
};

export type VoiceCaptureOptions = {
  maxDurationMs?: number;
  /** Called when the duration limit stops the recording automatically. */
  onLimitReached?: () => void;
  mediaDevices?: Pick<MediaDevices, "getUserMedia">;
};

export function microphoneCaptureSupported(scope: { mediaDevices?: Pick<MediaDevices, "getUserMedia"> } = navigator): boolean {
  return typeof scope.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined";
}

export function classifyMicrophoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "voice_permission_denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") return "voice_capture_unsupported";
  return error instanceof Error && error.message ? error.message : "voice_capture_unsupported";
}

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
}

export async function startVoiceCapture(options: VoiceCaptureOptions = {}): Promise<VoiceCaptureHandle> {
  const mediaDevices = options.mediaDevices ?? navigator.mediaDevices;
  if (!microphoneCaptureSupported({ mediaDevices })) throw new Error("voice_capture_unsupported");
  let stream: MediaStream;
  try {
    stream = await mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (error) {
    throw new Error(classifyMicrophoneError(error));
  }
  const mimeType = preferredMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  let settled = false;
  let resolveStop: ((blob: Blob) => void) | undefined;
  let rejectStop: ((error: Error) => void) | undefined;
  const stopped = new Promise<Blob>((resolve, reject) => {
    resolveStop = resolve;
    rejectStop = reject;
  });

  function releaseStream() {
    for (const track of stream.getTracks()) track.stop();
  }

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.addEventListener("stop", () => {
    releaseStream();
    if (settled) return;
    settled = true;
    resolveStop?.(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
  });
  recorder.addEventListener("error", () => {
    releaseStream();
    if (settled) return;
    settled = true;
    rejectStop?.(new Error("voice_capture_unsupported"));
  });

  const limit = setTimeout(() => {
    if (recorder.state === "recording") {
      options.onLimitReached?.();
      recorder.stop();
    }
  }, options.maxDurationMs ?? VOICE_MAX_RECORDING_MS);

  recorder.start();

  return {
    stop() {
      clearTimeout(limit);
      if (recorder.state === "recording") recorder.stop();
      return stopped;
    },
    cancel() {
      clearTimeout(limit);
      settled = true;
      chunks.length = 0;
      if (recorder.state === "recording") recorder.stop();
      releaseStream();
    },
  };
}

/** Decode the captured container through the WebView and return 16 kHz mono PCM16 WAV bytes. */
export async function recordingToPcm16Wav(recording: Blob): Promise<Uint8Array> {
  if (recording.size === 0) throw new Error("voice_recording_empty");
  const AudioContextConstructor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("voice_capture_unsupported");
  const context = new AudioContextConstructor();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    return pcm16WavFromDecodedAudio(decoded);
  } catch (error) {
    throw error instanceof Error && error.message === "voice_recording_empty" ? error : new Error("voice_audio_invalid");
  } finally {
    void context.close().catch(() => undefined);
  }
}
