import { describe, expect, it } from "vitest";
import { downmixToMono, encodePcm16Wav, pcm16WavFromDecodedAudio, resampleLinear, resampleSinc } from "../domain/voiceAudio";

function tone(frequency: number, sampleRate: number, seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(sampleRate * seconds));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequency * index) / sampleRate);
  }
  return samples;
}

/** Peak amplitude away from the edges, where any finite kernel tapers. */
function steadyPeak(samples: Float32Array): number {
  let peak = 0;
  const margin = Math.floor(samples.length * 0.2);
  for (let index = margin; index < samples.length - margin; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  return peak;
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);
}

function u16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint16(offset, true);
}

describe("Voice audio conversion", () => {
  it("averages channels into mono", () => {
    const mono = downmixToMono([new Float32Array([1, 0.5]), new Float32Array([0, -0.5])]);
    expect(Array.from(mono)).toEqual([0.5, 0]);
    expect(downmixToMono([new Float32Array([0.25])])).toEqual(new Float32Array([0.25]));
    expect(downmixToMono([])).toHaveLength(0);
  });

  it("resamples linearly to the target rate and keeps identity for equal rates", () => {
    const source = new Float32Array([0, 1, 0, 1, 0, 1, 0, 1]);
    expect(resampleLinear(source, 48_000, 48_000)).toBe(source);
    const halved = resampleLinear(source, 32_000, 16_000);
    expect(halved).toHaveLength(4);
    expect(Array.from(halved)).toEqual([0, 0, 0, 0]);
    const doubled = resampleLinear(new Float32Array([0, 1]), 8_000, 16_000);
    expect(doubled).toHaveLength(4);
    expect(doubled[2]).toBeCloseTo(1, 5);
    expect(() => resampleLinear(source, 0, 16_000)).toThrow("voice_audio_invalid");
  });

  it("band-limits before decimating so content above the target Nyquist cannot alias", () => {
    // 12 kHz cannot exist at 16 kHz; plain interpolation folds it onto 4 kHz.
    const aliasing = resampleLinear(tone(12_000, 48_000, 0.25), 48_000, 16_000);
    expect(steadyPeak(aliasing)).toBeGreaterThan(0.5);

    const bandLimited = resampleSinc(tone(12_000, 48_000, 0.25), 48_000, 16_000);
    expect(steadyPeak(bandLimited)).toBeLessThan(0.02);

    // Speech-band content must survive essentially untouched.
    const speech = resampleSinc(tone(1_000, 48_000, 0.25), 48_000, 16_000);
    expect(steadyPeak(speech)).toBeGreaterThan(0.98);
    expect(resampleSinc(speech, 16_000, 16_000)).toBe(speech);
    expect(() => resampleSinc(speech, 16_000, 0)).toThrow("voice_audio_invalid");
  });

  it("matches the direct kernel when rates force the phase-table fallback", () => {
    // A prime target rate pushes the phase count past the table limit.
    const source = tone(1_000, 48_000, 0.05);
    const tabled = resampleSinc(source, 48_000, 16_000);
    const untabled = resampleSinc(source, 48_000 * 1_048_573, 16_000 * 1_048_573);
    expect(untabled).toHaveLength(tabled.length);
    for (let index = 0; index < tabled.length; index += 1) {
      expect(untabled[index]).toBeCloseTo(tabled[index], 5);
    }
  });

  it("encodes a canonical 16 kHz mono PCM16 WAV header the native boundary accepts", () => {
    const wav = encodePcm16Wav(new Float32Array([0, 1, -1, 2]), 16_000);
    expect(wav).toHaveLength(44 + 8);
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(u32(wav, 4)).toBe(36 + 8);
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 12, 4)).toBe("fmt ");
    expect(u16(wav, 20)).toBe(1);
    expect(u16(wav, 22)).toBe(1);
    expect(u32(wav, 24)).toBe(16_000);
    expect(u32(wav, 28)).toBe(32_000);
    expect(u16(wav, 32)).toBe(2);
    expect(u16(wav, 34)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe("data");
    expect(u32(wav, 40)).toBe(8);
    const view = new DataView(wav.buffer);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });

  it("converts decoded stereo 48 kHz audio into bounded 16 kHz mono WAV", () => {
    const length = 48_000;
    const left = new Float32Array(length).fill(0.5);
    const right = new Float32Array(length).fill(-0.5);
    const wav = pcm16WavFromDecodedAudio({ numberOfChannels: 2, sampleRate: 48_000, length, getChannelData: (channel) => (channel === 0 ? left : right) });
    expect(u32(wav, 24)).toBe(16_000);
    expect(u32(wav, 40)).toBe(16_000 * 2);
    expect(() => pcm16WavFromDecodedAudio({ numberOfChannels: 1, sampleRate: 48_000, length: 0, getChannelData: () => new Float32Array(0) })).toThrow("voice_recording_empty");
  });
});
