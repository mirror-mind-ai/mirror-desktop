/**
 * CR151: the vocabulary of completion tones — what they are, which ones exist, and which id is
 * valid — with no dependency on how or when one is played.
 *
 * It lives in `domain/` because `journeyPreferencePersistence` has to validate a stored tone id, and
 * a preference file is domain. The one existing import from `domain/` into `app/` is
 * `contextReading`'s `import type`, which erases at compile time; a runtime import would have been
 * the first of its kind, so the vocabulary moved rather than the dependency being accepted.
 *
 * The player, and the decision of which tone a settlement deserves, stay in `app/` — they need
 * `SettlementOutcome` and the Web Audio API, neither of which belongs here.
 */
export type TurnCompletionToneStep = Readonly<{
  frequencyHz: number;
  durationMs: number;
}>;

/**
 * A tone is a short *sequence*, not a single beep. One sine wave can only be moved in pitch and
 * length, which is not enough room for three options a listener can tell apart and still like; two
 * notes give each one a shape.
 */
export type TurnCompletionTone = Readonly<{
  id: string;
  label: string;
  description: string;
  steps: readonly TurnCompletionToneStep[];
}>;

export type TurnCompletionToneId = "chime" | "rise" | "bell";

/** Ordered for Settings, with the field-validated tone first. */
export const TURN_COMPLETION_TONE_IDS = ["chime", "rise", "bell"] as const;

/**
 * `chime` is the tone that shipped and was heard in the field, kept as the default so the Navigator
 * who asked for *two more besides the current one* does not silently lose the current one.
 */
export const DEFAULT_TURN_COMPLETION_TONE_ID: TurnCompletionToneId = "chime";

export const TURN_COMPLETION_SUCCESS_TONES: Readonly<Record<TurnCompletionToneId, TurnCompletionTone>> = {
  chime: {
    id: "chime",
    label: "Chime",
    description: "One short, high note.",
    steps: [{ frequencyHz: 880, durationMs: 160 }],
  },
  rise: {
    id: "rise",
    label: "Rise",
    description: "Two notes going up.",
    steps: [
      { frequencyHz: 659.25, durationMs: 100 },
      { frequencyHz: 987.77, durationMs: 170 },
    ],
  },
  bell: {
    id: "bell",
    label: "Bell",
    description: "Two notes going down, with a longer tail.",
    steps: [
      { frequencyHz: 1174.66, durationMs: 90 },
      { frequencyHz: 880, durationMs: 240 },
    ],
  },
};

/**
 * One failure tone, not three. The Navigator asked to choose among success sounds; a failure is not
 * an occasion for taste.
 *
 * It is distinguished by **pitch** — 220 Hz is more than an octave below the lowest note of any
 * success option — and by having the longest single note of any tone here. It is deliberately *not*
 * the longest overall: `bell` totals 330 ms against this one's 320, because `bell` wants a tail. An
 * earlier version of this comment claimed it was longest overall, which a test then disproved.
 */
export const TURN_COMPLETION_FAILURE_TONE: TurnCompletionTone = {
  id: "failure",
  label: "Failure",
  description: "One low, longer note.",
  steps: [{ frequencyHz: 220, durationMs: 320 }],
};

export function parseTurnCompletionToneId(value: unknown): TurnCompletionToneId | undefined {
  return TURN_COMPLETION_TONE_IDS.includes(value as TurnCompletionToneId)
    ? (value as TurnCompletionToneId)
    : undefined;
}
