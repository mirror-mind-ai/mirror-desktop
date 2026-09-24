import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateVoiceManifest, sha256Hex } from "../../scripts/voice_component_manifest.mjs";

describe("voice component manifest helper", () => {
  it("generates the native manifest contract with sizes and lowercase sha256 digests", () => {
    const directory = mkdtempSync(join(tmpdir(), "voice-manifest-"));
    const executable = join(directory, "whisper-cli");
    const model = join(directory, "ggml-base-q5_1.bin");
    writeFileSync(executable, "binary");
    writeFileSync(model, "model");
    const manifest = generateVoiceManifest({
      componentVersion: "1.8.3",
      baseUrl: "https://updates.mirrormind.sh/mirror-desktop/voice/",
      executables: [{ platform: "macos", architecture: "x64", path: executable }],
      models: [{ id: "base-q5_1", path: model }],
      defaultModel: "base-q5_1",
    });
    expect(manifest.schemaVersion).toBe("1.0.0");
    expect(manifest.product).toBe("Mirror Desktop");
    expect(manifest.component).toBe("whisper.cpp");
    expect(manifest.executables[0]).toEqual({
      platform: "macos", architecture: "x64", fileName: "whisper-cli",
      url: "https://updates.mirrormind.sh/mirror-desktop/voice/whisper-cli", sha256: sha256Hex("binary"), sizeBytes: 6,
    });
    expect(manifest.models[0].url).toBe("https://updates.mirrormind.sh/mirror-desktop/voice/ggml-base-q5_1.bin");
    expect(manifest.defaultModel).toBe("base-q5_1");
  });

  it("refuses non-https hosts outside loopback rehearsal and unknown default models", () => {
    const directory = mkdtempSync(join(tmpdir(), "voice-manifest-"));
    const file = join(directory, "whisper-cli");
    writeFileSync(file, "x");
    const base = { componentVersion: "1.8.3", executables: [{ platform: "macos", architecture: "x64", path: file }], models: [{ id: "m", path: file }], defaultModel: "m" };
    expect(() => generateVoiceManifest({ ...base, baseUrl: "http://example.com/" })).toThrow("https");
    expect(() => generateVoiceManifest({ ...base, baseUrl: "http://127.0.0.1:8765/" })).not.toThrow();
    expect(() => generateVoiceManifest({ ...base, baseUrl: "https://example.com/", defaultModel: "other" })).toThrow("defaultModel");
  });
});
