// CV-008.DS-005 — pure audio conversion so the app never bundles ffmpeg.
//
// Captured audio (any channel count or sample rate) becomes 16 kHz mono PCM16
// WAV, the only format the native transcription boundary accepts.

import { VOICE_SAMPLE_RATE } from "./voiceTranscription";

export type DecodedAudio = {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  getChannelData: (channel: number) => Float32Array;
};

export function downmixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const mono = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    let sum = 0;
    for (const channel of channels) sum += channel[index] ?? 0;
    mono[index] = sum / channels.length;
  }
  return mono;
}

const SINC_ZERO_CROSSINGS = 16;
/** Above this, phase tables stop paying for themselves and taps are computed directly. */
const MAX_SINC_PHASES = 1024;

function sinc(value: number): number {
  if (value === 0) return 1;
  const scaled = Math.PI * value;
  return Math.sin(scaled) / scaled;
}

function windowedTap(offset: number): number {
  if (offset <= -SINC_ZERO_CROSSINGS || offset >= SINC_ZERO_CROSSINGS) return 0;
  // Blackman window over the sinc's finite support keeps the stopband deep.
  const phase = (Math.PI * offset) / SINC_ZERO_CROSSINGS;
  return sinc(offset) * (0.42 + 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase));
}

function greatestCommonDivisor(left: number, right: number): number {
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left;
}

/**
 * Band-limited resampling, evaluated only at output positions.
 *
 * Capture is usually 48 kHz, so reaching 16 kHz discards two of every three
 * samples. Plain interpolation folds everything above 8 kHz back into the
 * speech band and measurably corrupts recognition: TS-1 heard the same
 * Portuguese sentence degrade from "roadmap do Mirror" to "roadmap do MiRO".
 * Narrowing the sinc by the rate ratio low-passes and resamples in one pass.
 */
export function resampleSinc(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!(fromRate > 0) || !(toRate > 0)) throw new Error("voice_audio_invalid");
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const scale = Math.min(1, 1 / ratio);
  const reach = Math.ceil(SINC_ZERO_CROSSINGS / scale) + 1;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(outputLength);

  // The tap offsets repeat every `phases` output samples whenever the rates are
  // commensurable, which they always are in practice. Precomputing one kernel
  // per phase removes the trigonometry from the inner loop.
  const divisor = greatestCommonDivisor(Math.round(fromRate), Math.round(toRate));
  const phases = Math.round(toRate) / divisor;
  const width = 2 * reach + 1;
  const table = phases <= MAX_SINC_PHASES ? new Float32Array(phases * width) : undefined;
  if (table) {
    const step = Math.round(fromRate) / divisor;
    for (let phase = 0; phase < phases; phase += 1) {
      const fraction = ((phase * step) % phases) / phases;
      for (let tap = -reach; tap <= reach; tap += 1) {
        table[phase * width + tap + reach] = windowedTap((tap - fraction) * scale);
      }
    }
  }

  for (let index = 0; index < outputLength; index += 1) {
    const center = index * ratio;
    const base = Math.floor(center);
    const first = Math.max(0, base - reach);
    const last = Math.min(samples.length - 1, base + reach);
    const kernel = table ? (index % phases) * width - base + reach : 0;
    let sum = 0;
    let weight = 0;
    for (let position = first; position <= last; position += 1) {
      const tap = table ? table[kernel + position] : windowedTap((position - center) * scale);
      sum += samples[position] * tap;
      weight += tap;
    }
    output[index] = weight === 0 ? 0 : sum / weight;
  }
  return output;
}

/** Linear interpolation resampler, kept for upsampling and simple fixtures. */
export function resampleLinear(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!(fromRate > 0) || !(toRate > 0)) throw new Error("voice_audio_invalid");
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const outputLength = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, samples.length - 1);
    const fraction = position - left;
    output[index] = samples[left] * (1 - fraction) + samples[right] * fraction;
  }
  return output;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}

export function encodePcm16Wav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

export function pcm16WavFromDecodedAudio(audio: DecodedAudio, targetRate = VOICE_SAMPLE_RATE): Uint8Array {
  if (audio.length === 0 || audio.numberOfChannels === 0) throw new Error("voice_recording_empty");
  const channels: Float32Array[] = [];
  for (let channel = 0; channel < audio.numberOfChannels; channel += 1) channels.push(audio.getChannelData(channel));
  const mono = downmixToMono(channels);
  return encodePcm16Wav(resampleSinc(mono, audio.sampleRate, targetRate), targetRate);
}
