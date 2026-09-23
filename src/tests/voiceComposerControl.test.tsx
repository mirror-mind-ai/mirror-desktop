import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VoiceComposerControl, VoiceInstallDialog, VoiceSessionStatus, VoiceSettingsPanel } from "../app/VoiceComposerControl";
import { idleVoiceSession, type VoiceComponentStatus } from "../domain/voiceTranscription";

const ready: VoiceComponentStatus = {
  state: "ready", platform: "macos", architecture: "x64", manifestUrl: "https://updates.mirrormind.sh/mirror-desktop/voice/manifest.json",
  componentVersion: "1.7.5", modelId: "base-q5_1", sizeBytes: 60 * 1024 * 1024, installedAt: "2026-09-23T12:00:00.000Z",
};
const notInstalled: VoiceComponentStatus = { state: "not_installed", platform: "macos", architecture: "x64", manifestUrl: ready.manifestUrl };

describe("Voice composer surfaces", () => {
  it("renders the microphone with the intent it will perform", () => {
    const install = renderToStaticMarkup(<VoiceComposerControl status={notInstalled} session={idleVoiceSession} installing={false} composerBusy={false} onIntent={() => undefined} />);
    expect(install).toContain('data-voice-intent="install"');
    expect(install).toContain('aria-label="Install local transcription"');
    const record = renderToStaticMarkup(<VoiceComposerControl status={ready} session={idleVoiceSession} installing={false} composerBusy={false} onIntent={() => undefined} />);
    expect(record).toContain('data-voice-intent="record"');
    expect(record).toContain("<svg");
    expect(record).toContain('stroke="currentColor"');
    expect(record).not.toContain("🎤");
    const stop = renderToStaticMarkup(<VoiceComposerControl status={ready} session={{ kind: "recording", draftKey: "j", startedAt: 1 }} installing={false} composerBusy={false} onIntent={() => undefined} />);
    expect(stop).toContain('aria-pressed="true"');
    expect(stop).toContain("is-recording");
    expect(stop).toContain('fill="currentColor"');
    const blocked = renderToStaticMarkup(<VoiceComposerControl status={ready} session={{ kind: "transcribing", draftKey: "j" }} installing={false} composerBusy={false} onIntent={() => undefined} />);
    expect(blocked).toContain("disabled");
  });

  it("shows recording elapsed time with the limit and a cancel action", () => {
    const html = renderToStaticMarkup(<VoiceSessionStatus session={{ kind: "recording", draftKey: "j", startedAt: 1 }} elapsedSeconds={65} onCancel={() => undefined} />);
    expect(html).toContain("Recording · 1:05 · limit 5:00");
    expect(html).toContain("Cancel");
    expect(renderToStaticMarkup(<VoiceSessionStatus session={idleVoiceSession} onCancel={() => undefined} />)).toBe("");
  });

  it("explains local processing, size and removability before installation and never records afterwards", () => {
    const html = renderToStaticMarkup(<VoiceInstallDialog status={notInstalled} installing={false} onConfirm={() => undefined} onClose={() => undefined} />);
    expect(html).toContain("Install local transcription?");
    expect(html).toContain("never uploaded");
    expect(html).toContain("roughly 100 MB");
    expect(html).toContain("Installing does not turn on the microphone");
    expect(html).toContain("Not now");
    const done = renderToStaticMarkup(<VoiceInstallDialog status={ready} installing={false} onConfirm={() => undefined} onClose={() => undefined} />);
    expect(done).toContain("Local transcription is ready");
    expect(done).toContain("Nothing was recorded during installation");
  });

  it("exposes version, model, size and removal in Settings", () => {
    const html = renderToStaticMarkup(<VoiceSettingsPanel status={ready} installing={false} removing={false} sessionActive={false} onInstall={() => undefined} onRemove={() => undefined} />);
    expect(html).toContain("whisper.cpp 1.7.5");
    expect(html).toContain("base-q5_1");
    expect(html).toContain("60 MB");
    expect(html).toContain("Remove local transcription");
    const absent = renderToStaticMarkup(<VoiceSettingsPanel status={notInstalled} installing={false} removing={false} sessionActive={false} onInstall={() => undefined} onRemove={() => undefined} />);
    expect(absent).toContain("Install local transcription");
    expect(absent).not.toContain("Remove local transcription");
  });
});
