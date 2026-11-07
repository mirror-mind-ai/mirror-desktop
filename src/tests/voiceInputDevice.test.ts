// The microphone a recording uses: chosen in Settings, kept with the home's preferences, honoured
// at recording time, and replaced by the system default when the chosen one is gone.
import { describe, expect, it, vi } from "vitest";
import { listAudioInputs, startVoiceCapture } from "../app/voiceCapture";
import { createPersistedJourneyPreferences, defaultJourneyPreferenceState, parsePersistedJourneyPreferences, sanitizeJourneyPreferenceState } from "../domain/journeyPreferencePersistence";
import type { JourneyRegistry } from "../domain/journeyRegistry";

function fakeStream(label: string): MediaStream {
  const track = { kind: "audio", label, stop: vi.fn(), readyState: "live" } as unknown as MediaStreamTrack;
  return { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
}

class FakeRecorder {
  static isTypeSupported = () => true;
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  listeners = new Map<string, () => void>();
  constructor(public stream: MediaStream) {}
  addEventListener(type: string, listener: () => void) { this.listeners.set(type, listener); }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.listeners.get("stop")?.(); }
}

describe("the microphone a recording uses", () => {
  const withRecorder = async (run: () => Promise<void>) => {
    const previous = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = FakeRecorder;
    try { await run(); } finally { (globalThis as { MediaRecorder?: unknown }).MediaRecorder = previous; }
  };

  it("lists audio inputs only, with whatever labels the browser gives", async () => {
    const enumerateDevices = vi.fn(async () => [
      { kind: "audioinput", deviceId: "default", label: "Default - Microphone Array" },
      { kind: "videoinput", deviceId: "cam", label: "HD Pro Webcam C920" },
      { kind: "audioinput", deviceId: "131b4ad0", label: "Microphone (HD Pro Webcam C920)" },
      { kind: "audioinput", deviceId: "", label: "" },
    ] as MediaDeviceInfo[]);
    expect(await listAudioInputs({ mediaDevices: { enumerateDevices } })).toEqual([
      { deviceId: "default", label: "Default - Microphone Array" },
      { deviceId: "131b4ad0", label: "Microphone (HD Pro Webcam C920)" },
    ]);
    expect(await listAudioInputs({})).toEqual([]);
  });

  it("asks for the chosen microphone exactly, and for the default when none is chosen", async () => {
    await withRecorder(async () => {
      const getUserMedia = vi.fn(async () => fakeStream("C920"));
      const capture = await startVoiceCapture({ mediaDevices: { getUserMedia }, inputDeviceId: "131b4ad0" });
      expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: "131b4ad0" } }, video: false });
      capture.cancel();
      const plain = await startVoiceCapture({ mediaDevices: { getUserMedia } });
      expect(getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: false });
      plain.cancel();
    });
  });

  it("falls back to the system default when the chosen microphone is not connected", async () => {
    await withRecorder(async () => {
      const getUserMedia = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error("gone"), { name: "OverconstrainedError" }))
        .mockResolvedValueOnce(fakeStream("Array"));
      const capture = await startVoiceCapture({ mediaDevices: { getUserMedia }, inputDeviceId: "unplugged" });
      expect(getUserMedia).toHaveBeenCalledTimes(2);
      expect(getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: false });
      capture.cancel();
      // A denied microphone is reported, never retried.
      const denied = vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name: "NotAllowedError" }));
      await expect(startVoiceCapture({ mediaDevices: { getUserMedia: denied }, inputDeviceId: "131b4ad0" })).rejects.toThrow("voice_permission_denied");
      expect(denied).toHaveBeenCalledTimes(1);
    });
  });

  it("is kept with the preferences, and a malformed value means the system default", () => {
    const registry: JourneyRegistry = { schemaVersion: "0.2.0", source: "fixture", syncedAt: "2026-11-07T00:00:00.000Z", roots: [] };
    const base = createPersistedJourneyPreferences({ ...defaultJourneyPreferenceState, voiceLanguage: "pt" });
    const chosen = parsePersistedJourneyPreferences({ ...base, preferences: { ...base.preferences, voiceInputDeviceId: "131b4ad0" } });
    expect(chosen?.preferences.voiceInputDeviceId).toBe("131b4ad0");
    expect(sanitizeJourneyPreferenceState(chosen!.preferences, registry).voiceInputDeviceId).toBe("131b4ad0");
    expect(parsePersistedJourneyPreferences(base)?.preferences.voiceInputDeviceId).toBeUndefined();
    expect(parsePersistedJourneyPreferences({ ...base, preferences: { ...base.preferences, voiceInputDeviceId: 42 } })?.preferences.voiceInputDeviceId).toBeUndefined();
    expect(parsePersistedJourneyPreferences({ ...base, preferences: { ...base.preferences, voiceInputDeviceId: "" } })?.preferences.voiceInputDeviceId).toBeUndefined();
  });
});
