import { describe, expect, it } from "vitest";
import { COMPOSER_DRAFT_MAX_CHARS } from "../domain/composerDrafts";
import {
  appendTranscriptToDraft,
  defaultVoiceLanguage,
  describeInstallProgress,
  formatComponentSize,
  idleVoiceSession,
  parseVoiceComponentStatus,
  parseVoiceInstallProgress,
  parseVoiceTranscript,
  transcriptDestinationNotice,
  VOICE_MAX_RECORDING_MS,
  VOICE_MAX_WAV_BYTES,
  parseVoiceLanguage,
  voiceControlIntent,
  voiceControlLabel,
  voiceErrorMessage,
  voiceLanguageLabel,
  voiceLanguages,
  type VoiceComponentStatus,
} from "../domain/voiceTranscription";
import { createPersistedJourneyPreferences, defaultJourneyPreferenceState, parsePersistedJourneyPreferences } from "../domain/journeyPreferencePersistence";

const ready: VoiceComponentStatus = {
  state: "ready",
  platform: "macos",
  architecture: "x64",
  manifestUrl: "https://updates.mirrormind.sh/mirror-desktop/voice/manifest.json",
  componentVersion: "1.7.5",
  modelId: "base-q5_1",
  sizeBytes: 60 * 1024 * 1024,
};

const notInstalled: VoiceComponentStatus = { state: "not_installed", platform: "macos", architecture: "x64", manifestUrl: ready.manifestUrl };

describe("Voice transcription contract", () => {
  it("mirrors the native five-minute bound", () => {
    expect(VOICE_MAX_RECORDING_MS).toBe(300_000);
    expect(VOICE_MAX_WAV_BYTES).toBe(16_000 * 2 * 300 + 4096);
  });

  it("parses native status, transcript and progress transports and rejects malformed shapes", () => {
    expect(parseVoiceComponentStatus({ ...ready })).toEqual(ready);
    expect(parseVoiceComponentStatus({ ...ready, modelId: undefined })).toBeUndefined();
    expect(parseVoiceComponentStatus({ state: "ready" })).toBeUndefined();
    expect(parseVoiceComponentStatus({ state: "damaged", platform: "macos", architecture: "x64", manifestUrl: "", message: "broken" })?.message).toBe("broken");
    expect(parseVoiceTranscript({ text: "olá", audioSeconds: 3, durationMs: 900, modelId: "base-q5_1", componentVersion: "1.7.5" })?.text).toBe("olá");
    expect(parseVoiceTranscript({ text: "olá" })).toBeUndefined();
    expect(parseVoiceInstallProgress({ phase: "model", receivedBytes: 10, totalBytes: 20 })).toEqual({ phase: "model", receivedBytes: 10, totalBytes: 20 });
    expect(parseVoiceInstallProgress({ phase: "unknown" })).toBeUndefined();
  });

  it("appends the transcript to existing draft text without replacing it", () => {
    expect(appendTranscriptToDraft("", "  Quero revisar o roadmap. ")).toBe("Quero revisar o roadmap.");
    expect(appendTranscriptToDraft("Contexto anterior\n", "Nova fala")).toBe("Contexto anterior\n\nNova fala");
    expect(appendTranscriptToDraft("Mantido", "   ")).toBe("Mantido");
    expect(appendTranscriptToDraft("x".repeat(COMPOSER_DRAFT_MAX_CHARS - 3), "abcdef")).toHaveLength(COMPOSER_DRAFT_MAX_CHARS);
  });

  it("routes the microphone control to install, record, stop, explain or blocked", () => {
    expect(voiceControlIntent(notInstalled, idleVoiceSession, { installing: false, composerBusy: false })).toBe("install");
    expect(voiceControlIntent(ready, idleVoiceSession, { installing: false, composerBusy: false })).toBe("record");
    expect(voiceControlIntent(ready, { kind: "recording", draftKey: "j", startedAt: 1 }, { installing: false, composerBusy: true })).toBe("stop");
    expect(voiceControlIntent(ready, { kind: "transcribing", draftKey: "j" }, { installing: false, composerBusy: false })).toBe("blocked");
    expect(voiceControlIntent(ready, idleVoiceSession, { installing: true, composerBusy: false })).toBe("blocked");
    expect(voiceControlIntent(undefined, idleVoiceSession, { installing: false, composerBusy: false })).toBe("blocked");
    expect(voiceControlIntent({ ...notInstalled, state: "damaged" }, idleVoiceSession, { installing: false, composerBusy: false })).toBe("explain");
    expect(voiceControlIntent({ ...notInstalled, state: "unsupported" }, idleVoiceSession, { installing: false, composerBusy: false })).toBe("explain");
  });

  it("labels the control by session and intent", () => {
    expect(voiceControlLabel("install", idleVoiceSession, false)).toBe("Install local transcription");
    expect(voiceControlLabel("record", idleVoiceSession, false)).toBe("Record a voice prompt");
    expect(voiceControlLabel("stop", { kind: "recording", draftKey: "j", startedAt: 1 }, false)).toBe("Stop recording");
    expect(voiceControlLabel("blocked", { kind: "transcribing", draftKey: "j" }, false)).toBe("Transcribing…");
    expect(voiceControlLabel("blocked", idleVoiceSession, true)).toBe("Installing local transcription");
  });

  it("explains installation progress and sizes in human terms", () => {
    expect(formatComponentSize(60 * 1024 * 1024)).toBe("60 MB");
    expect(formatComponentSize(undefined)).toBe("unknown size");
    expect(describeInstallProgress({ phase: "model", receivedBytes: 30 * 1024 * 1024, totalBytes: 60 * 1024 * 1024 })).toBe("Downloading the speech model (30 MB of 60 MB)…");
    expect(describeInstallProgress({ phase: "ready" })).toBe("Local transcription is ready.");
    expect(describeInstallProgress(undefined)).toBe("Preparing installation…");
  });

  it("maps native error codes to honest, draft-preserving messages", () => {
    expect(voiceErrorMessage("voice_transcription_timeout")).toContain("draft was left unchanged");
    expect(voiceErrorMessage(new Error("voice_artifact_checksum_mismatch"))).toContain("nothing was installed");
    expect(voiceErrorMessage("voice_permission_denied")).toContain("Microphone access was denied");
    expect(voiceErrorMessage("something_else")).toBe("Voice transcription failed: something_else");
  });

  it("notifies only when the transcript landed in a destination that is no longer visible", () => {
    expect(transcriptDestinationNotice("a", "a", "Journey A")).toBeUndefined();
    expect(transcriptDestinationNotice("a", "b", "Journey A")).toBe("The voice transcript was added to the draft for Journey A, where the recording started.");
  });

  it("round-trips the spoken-language preference and rejects unsupported codes", () => {
    expect(defaultVoiceLanguage).toBe("auto");
    expect(voiceLanguages.map((entry) => entry.id)).toContain("pt");
    expect(voiceLanguageLabel("pt")).toBe("Portuguese");
    expect(parseVoiceLanguage("pt")).toBe("pt");
    expect(parseVoiceLanguage("auto")).toBe("auto");
    // The native boundary accepts only "auto" or two lowercase letters.
    expect(parseVoiceLanguage("PT")).toBeUndefined();
    expect(parseVoiceLanguage("pt-BR")).toBeUndefined();
    expect(parseVoiceLanguage(undefined)).toBeUndefined();
    expect(voiceLanguages.every((entry) => entry.id === "auto" || /^[a-z]{2}$/.test(entry.id))).toBe(true);

    const persisted = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, voiceLanguage: "pt" });
    expect(parsePersistedJourneyPreferences(JSON.parse(JSON.stringify(persisted)))?.preferences.voiceLanguage).toBe("pt");
    // An unreadable stored value must fail the whole payload rather than silently
    // transcribing in a language the Navigator never chose.
    const corrupted = JSON.parse(JSON.stringify(persisted));
    corrupted.preferences.voiceLanguage = "klingon";
    expect(parsePersistedJourneyPreferences(corrupted)).toBeUndefined();
    // Preferences written before this setting existed keep detecting.
    const legacy = JSON.parse(JSON.stringify(persisted));
    delete legacy.preferences.voiceLanguage;
    expect(parsePersistedJourneyPreferences(legacy)?.preferences.voiceLanguage).toBe("auto");
  });
});
