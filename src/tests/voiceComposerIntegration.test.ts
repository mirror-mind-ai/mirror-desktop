import { describe, expect, it } from "vitest";
import appSource from "../app/App.tsx?raw";
import captureSource from "../app/voiceCapture.ts?raw";
import storageSource from "../app/voiceTranscriptionStorage.ts?raw";
import nativeSource from "../../src-tauri/src/voice_transcription.rs?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";
import plistSource from "../../src-tauri/Info.plist?raw";
import cargoSource from "../../src-tauri/Cargo.toml?raw";

describe("CV-008.DS-005 voice prompt composition integration", () => {
  it("captures the destination draft key at recording start and appends to that exact draft", () => {
    expect(appSource).toContain("voiceOriginRef.current = { draftKey, label: currentComposerDestinationLabel() }");
    expect(appSource).toContain("appendTranscriptToDraft(current[origin.draftKey] ?? \"\", transcript.text)");
    expect(appSource).toContain("updateComposerDraft(current, origin.draftKey, merged)");
    expect(appSource).toContain("if (visibleDraftKey === origin.draftKey) setDraft(merged)");
    expect(appSource).toContain("transcriptDestinationNotice(origin.draftKey, visibleDraftKey, origin.label)");
  });

  it("never sends, steers or starts an agent turn from a transcript", () => {
    const start = appSource.indexOf("async function stopVoiceRecording()");
    const end = appSource.indexOf("function cancelVoiceRecording()", start);
    const body = appSource.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(body).not.toContain("generatePacket(");
    expect(body).not.toContain("submitActiveSteering(");
    expect(body).not.toContain("enqueueMirrorAppend");
  });

  it("keeps installation consent and microphone consent as separate actions", () => {
    expect(appSource).toContain('if (intent === "install") setVoiceInstallDialogOpen(true)');
    expect(appSource).toContain('else if (intent === "record") void startVoiceRecording()');
    const install = appSource.slice(appSource.indexOf("async function installVoice()"), appSource.indexOf("async function removeVoice()"));
    expect(install).not.toContain("startVoiceRecording");
    expect(install).not.toContain("startVoiceCapture");
  });

  it("requests the microphone only when recording starts and discards audio on cancel", () => {
    expect(captureSource).toContain("mediaDevices.getUserMedia({ audio: true, video: false })");
    expect(captureSource).toContain("chunks.length = 0;");
    expect(captureSource).toContain("track.stop()");
    expect(captureSource).toContain("VOICE_MAX_RECORDING_MS");
    expect(appSource).toContain("useEffect(() => () => { voiceCaptureRef.current?.cancel(); }, [])");
  });

  it("crosses the native boundary with audio bytes only, never paths or arguments", () => {
    expect(storageSource).toContain('invoke<unknown>("voice_transcription_transcribe", { wav: Array.from(wav), language: language ?? null })');
    expect(storageSource).not.toMatch(/invoke<unknown>\([^)]*path/iu);
    expect(nativeSource).toContain("pub async fn voice_transcription_transcribe(app: AppHandle, wav: Vec<u8>, language: Option<String>)");
    expect(nativeSource).toContain("impl Drop for TempAudio");
    expect(nativeSource).toContain("\"--no-timestamps\"");
    expect(nativeSource).not.toContain("openrouter");
    expect(nativeSource).not.toContain("memory ");
  });

  it("installs only from a Mirror-controlled https manifest with verified checksums", () => {
    expect(nativeSource).toContain('pub const DEFAULT_MANIFEST_URL: &str = "https://updates.mirrormind.sh/mirror-desktop/voice/manifest.json"');
    expect(nativeSource).toContain("voice_artifact_checksum_mismatch");
    expect(nativeSource).toContain("if channel == RuntimeChannel::Development");
    expect(cargoSource).toContain('reqwest = { version = "0.13", default-features = false, features = ["rustls-no-provider", "system-proxy"] }');
  });

  it("registers the four native commands and the macOS microphone usage description", () => {
    for (const command of ["voice_transcription_status", "voice_transcription_install", "voice_transcription_remove", "voice_transcription_transcribe"]) {
      expect(mainSource).toContain(`            ${command},`);
    }
    expect(plistSource).toContain("NSMicrophoneUsageDescription");
  });

  it("exposes the control, session status, install dialog and Settings panel", () => {
    expect(appSource).toContain("<VoiceComposerControl");
    expect(appSource).toContain("<VoiceSessionStatus session={voiceSession}");
    expect(appSource).toContain("<VoiceInstallDialog");
    expect(appSource).toContain("<VoiceSettingsPanel");
    expect(appSource).toContain('settingsTab === "voice"');
  });
});
