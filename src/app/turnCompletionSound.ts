import type { SettlementOutcome } from "./settlementPhaseTiming";
import {
  DEFAULT_TURN_COMPLETION_TONE_ID,
  parseTurnCompletionToneId,
  TURN_COMPLETION_FAILURE_TONE,
  TURN_COMPLETION_SUCCESS_TONES,
  type TurnCompletionTone,
} from "../domain/turnCompletionTone";

/**
 * CR151: the Navigator asked for a sound when a turn finishes, switchable in Settings, and — after
 * hearing the first one in the field — for a choice of three.
 *
 * A tone is *described* in `domain/turnCompletionTone` and played here, because the test suite runs
 * in Node with no audio device and nothing in it can hear a sound. What a test can assert is which
 * tone was chosen, that the choices stay distinguishable from each other, and that nothing is
 * chosen — and therefore no audio code reached — when the preference is off. The part that can only
 * be judged by ear is the field's, which is how the second and third options came to exist at all.
 */

/**
 * An unrecognised id degrades to the default rather than to silence. A preference file that has been
 * edited by hand, or written by a future version with a fourth option, must not make the sound
 * disappear — silence is indistinguishable from the feature being broken.
 */
export function turnCompletionToneFor(input: {
  outcome: SettlementOutcome;
  toneId: unknown;
}): TurnCompletionTone {
  if (input.outcome === "failed") return TURN_COMPLETION_FAILURE_TONE;
  const toneId = parseTurnCompletionToneId(input.toneId) ?? DEFAULT_TURN_COMPLETION_TONE_ID;
  return TURN_COMPLETION_SUCCESS_TONES[toneId];
}

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
  toneId: unknown;
  play: TurnCompletionSoundPlayer;
}): TurnCompletionTone | undefined {
  // No record means nothing settled here: a cancellation, or an end site that lost the race.
  if (!input.record) return undefined;
  // Off must be genuinely silent. Returning before `play` is what keeps the audio code unreached,
  // rather than playing at zero volume.
  if (!input.enabled) return undefined;
  const tone = turnCompletionToneFor({ outcome: input.record.outcome, toneId: input.toneId });
  input.play(tone);
  return tone;
}

/**
 * CR151: choosing a sound you cannot hear is the same defect as judging a tone from a specification,
 * which is exactly what sent the first version to the field to be corrected. So selecting an option
 * in Settings plays it.
 *
 * It is gated on the switch for one reason: *off means no audio code runs* is an acceptance of this
 * CR, and a preview is a second trigger that would otherwise walk around it. While the sound is off
 * the choice can still be made, silently, and takes effect when it is switched back on.
 */
export function previewTurnCompletionTone(input: {
  toneId: unknown;
  enabled: boolean;
  play: TurnCompletionSoundPlayer;
}): TurnCompletionTone | undefined {
  if (!input.enabled) return undefined;
  const tone = turnCompletionToneFor({ outcome: "settled", toneId: input.toneId });
  input.play(tone);
  return tone;
}

type AudioContextConstructor = new () => AudioContext;

/**
 * Synthesised rather than loaded from files, so there is no asset, no path and no loading failure
 * mode — and so a fourth option costs two numbers rather than a new binary in the bundle.
 *
 * The context is constructed inside the body, which is what lets the preference's "off" stay
 * genuinely silent: passing this function as a value allocates nothing.
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
  // One context for the whole sequence, scheduled ahead on its own clock rather than with timers:
  // a settlement is a busy moment and a setTimeout chain would make the notes audibly uneven.
  const startedAt = context.currentTime;
  let offsetSeconds = 0;
  let last: OscillatorNode | undefined;
  for (const step of tone.steps) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = step.frequencyHz;
    const stepStart = startedAt + offsetSeconds;
    const stepSeconds = step.durationMs / 1000;
    // Ramped at both ends: a square-edged start and stop on a sine wave clicks audibly.
    gain.gain.setValueAtTime(0, stepStart);
    gain.gain.linearRampToValueAtTime(0.18, stepStart + 0.015);
    gain.gain.linearRampToValueAtTime(0, stepStart + stepSeconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(stepStart);
    oscillator.stop(stepStart + stepSeconds);
    offsetSeconds += stepSeconds;
    last = oscillator;
  }
  if (last) {
    last.onended = () => {
      void context.close();
    };
  }
}
