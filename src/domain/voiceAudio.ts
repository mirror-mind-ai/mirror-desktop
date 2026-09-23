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

/** Linear interpolation resampler; sufficient for speech going to 16 kHz. */
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
  return encodePcm16Wav(resampleLinear(mono, audio.sampleRate, targetRate), targetRate);
}
