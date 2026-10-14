import type { SettlementOutcome } from "./settlementPhaseTiming";

/**
 * CR151: the Navigator asked for a sound when a turn finishes, switchable in Settings.
 *
 * A tone is *described* here and played elsewhere, because the test suite runs in Node with no
 * audio device and nothing in it can hear a sound. What a test can assert is which tone was chosen,
 * that the two outcomes choose different ones, and that nothing is chosen — and therefore no audio
 * code reached — when the preference is off. The part that can only be judged by ear is the field's.
 */
export type TurnCompletionTone = Readonly<{
  /** Named after the outcome so a test can identify a tone it cannot hear. */
  kind: SettlementOutcome;
  frequencyHz: number;
  durationMs: number;
}>;

/**
 * Two tones, because the Navigator said a failure may sound different. They are deliberately far
 * apart — a fifth below and twice as long — so the difference survives small speakers and a noisy
 * room rather than relying on a listener who is paying attention.
 */
export const TURN_COMPLETION_TONES: Readonly<Record<SettlementOutcome, TurnCompletionTone>> = {
  settled: { kind: "settled", frequencyHz: 880, durationMs: 160 },
  failed: { kind: "failed", frequencyHz: 220, durationMs: 320 },
};

export type TurnCompletionSoundPlayer = (tone: TurnCompletionTone) => void;

/**
 * CR151: keyed on the settlement **record**, never on an event.
 *
 * That is the whole reason this cannot announce one settlement twice.
 * `settlementTimingRegistry.end` deletes its collector and returns `undefined` when there is none,
 * so whichever of the two end sites reaches a Journey first consumes the record and the other is
 * handed `undefined`. A guard against double-announcing would be dead code; the signature is the
 * guard.
 *
 * It also makes a cancellation silent without a special case. An interrupted turn takes the
 * `finalizeInterruptedTurn` branch, which never begins a timing collector, so no record exists to
 * pass here. CR102's rule — stopping is the Navigator's choice and failing is not — holds without
 * this function knowing about it.
 */
export function announceSettlement(input: {
  record: Readonly<{ outcome: SettlementOutcome }> | undefined;
  enabled: boolean;
  play: TurnCompletionSoundPlayer;
}): TurnCompletionTone | undefined {
  // No record means nothing settled here: a cancellation, or an end site that lost the race.
  if (!input.record) return undefined;
  // Off must be genuinely silent. Returning before `play` is what keeps the audio code unreached,
  // rather than playing at zero volume.
  if (!input.enabled) return undefined;
  const tone = TURN_COMPLETION_TONES[input.record.outcome];
  input.play(tone);
  return tone;
}

type AudioContextConstructor = new () => AudioContext;

/**
 * Synthesised rather than loaded from a file, so there is no asset, no path and no loading failure
 * mode. CR151 recorded that whether a tone is good enough is a question the Navigator should answer
 * by hearing it — so this ships as a tone and becomes a file only if the field rejects it.
 *
 * The context is constructed inside the body, which is what lets `announceSettlement` keep the
 * preference's "off" genuinely silent: passing this function as a value allocates nothing.
 */
export function playTurnCompletionTone(tone: TurnCompletionTone): void {
  const scope = globalThis as typeof globalThis & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const Constructor = scope.AudioContext ?? scope.webkitAudioContext;
  // A runtime without Web Audio is silent rather than broken. The sound is a report on an event,
  // never a second source of truth about it, so failing to play must not surface anywhere.
  if (!Constructor) return;
  let context: AudioContext;
  try {
    context = new Constructor();
  } catch {
    return;
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = tone.frequencyHz;
  const startedAt = context.currentTime;
  const seconds = tone.durationMs / 1000;
  // Ramped at both ends: a square-edged start and stop on a sine wave clicks audibly.
  gain.gain.setValueAtTime(0, startedAt);
  gain.gain.linearRampToValueAtTime(0.18, startedAt + 0.015);
  gain.gain.linearRampToValueAtTime(0, startedAt + seconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startedAt);
  oscillator.stop(startedAt + seconds);
  oscillator.onended = () => {
    void context.close();
  };
}
