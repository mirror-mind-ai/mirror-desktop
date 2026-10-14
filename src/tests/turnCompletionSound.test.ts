import { describe, expect, it, afterEach } from "vitest";
import {
  announceSettlement,
  playTurnCompletionTone,
  TURN_COMPLETION_TONES,
  type TurnCompletionTone,
} from "../app/turnCompletionSound";
import appSource from "../app/App.tsx?raw";
import soundSource from "../app/turnCompletionSound.ts?raw";

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function recorder() {
  const played: TurnCompletionTone[] = [];
  return { played, play: (tone: TurnCompletionTone) => void played.push(tone) };
}

describe("CR151: a finished turn announces itself", () => {
  describe("which tone, and whether any", () => {
    it("plays the completion tone when a turn settles", () => {
      const { played, play } = recorder();
      const tone = announceSettlement({ record: { outcome: "settled" }, enabled: true, play });

      expect(tone).toEqual(TURN_COMPLETION_TONES.settled);
      expect(played).toEqual([TURN_COMPLETION_TONES.settled]);
    });

    it("plays a different tone when a settlement fails", () => {
      const { played, play } = recorder();
      const tone = announceSettlement({ record: { outcome: "failed" }, enabled: true, play });

      expect(tone).toEqual(TURN_COMPLETION_TONES.failed);
      expect(played).toEqual([TURN_COMPLETION_TONES.failed]);
    });

    it("keeps the two tones far enough apart to be told apart by ear", () => {
      // A test cannot hear them. It can refuse a future edit that makes them nearly identical,
      // which is the failure mode that would quietly remove the distinction the Navigator asked for.
      expect(TURN_COMPLETION_TONES.settled.frequencyHz).not.toBe(TURN_COMPLETION_TONES.failed.frequencyHz);
      expect(TURN_COMPLETION_TONES.settled.durationMs).not.toBe(TURN_COMPLETION_TONES.failed.durationMs);
      const ratio = TURN_COMPLETION_TONES.settled.frequencyHz / TURN_COMPLETION_TONES.failed.frequencyHz;
      expect(Math.max(ratio, 1 / ratio)).toBeGreaterThanOrEqual(1.5);
    });

    it("gives an abandoned settlement the failure tone, because its record says failed", () => {
      // CR132's abandonment act always ends the collector with "failed", so this needs no branch of
      // its own — it arrives here as an ordinary failed record.
      const { played, play } = recorder();
      announceSettlement({ record: { outcome: "failed" }, enabled: true, play });
      expect(played).toEqual([TURN_COMPLETION_TONES.failed]);
    });
  });

  describe("when it must stay silent", () => {
    it("says nothing when there is no record, which is how a cancellation stays silent", () => {
      // An interrupted turn takes the finalizeInterruptedTurn branch and never begins a timing
      // collector, so no record ever reaches here. CR102: stopping is the Navigator's choice and
      // failing is not, so they do not deserve the same register.
      const { played, play } = recorder();
      const tone = announceSettlement({ record: undefined, enabled: true, play });

      expect(tone).toBeUndefined();
      expect(played).toEqual([]);
    });

    it("cannot announce one settlement twice, because the second end site gets no record", () => {
      // settlementTimingRegistry.end deletes its collector and returns undefined when there is
      // none. Whichever of the two end sites wins consumes the record; the loser is handed
      // undefined. This is the whole reason no de-duplication guard exists.
      const { played, play } = recorder();
      announceSettlement({ record: { outcome: "settled" }, enabled: true, play });
      announceSettlement({ record: undefined, enabled: true, play });

      expect(played).toEqual([TURN_COMPLETION_TONES.settled]);
    });

    it("never reaches the player when the preference is off, for either outcome", () => {
      const { played, play } = recorder();

      expect(announceSettlement({ record: { outcome: "settled" }, enabled: false, play })).toBeUndefined();
      expect(announceSettlement({ record: { outcome: "failed" }, enabled: false, play })).toBeUndefined();
      expect(played).toEqual([]);
    });
  });

  describe("off means no audio code runs", () => {
    // `typeof globalThis` declares AudioContext as required, so it has to be made optional before
    // it can be deleted — and the fake is deliberately minimal rather than a full AudioContext.
    type AudioScope = Omit<typeof globalThis, "AudioContext"> & { AudioContext?: unknown };
    const scope = globalThis as unknown as AudioScope;
    const original = scope.AudioContext;
    let constructed = 0;

    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      constructor() {
        constructed += 1;
      }
      createOscillator() {
        return {
          type: "", frequency: { value: 0 }, onended: undefined,
          connect() {}, start() {}, stop() {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
          connect() {},
        };
      }
      close() { return Promise.resolve(); }
    }

    afterEach(() => {
      if (original === undefined) delete scope.AudioContext;
      else scope.AudioContext = original;
      constructed = 0;
    });

    it("constructs no AudioContext when the preference is off", () => {
      // The acceptance says off must be genuinely silent, not played at zero volume. This is the
      // only test that can tell those apart, because it watches the constructor rather than the
      // output.
      scope.AudioContext = FakeAudioContext;
      announceSettlement({ record: { outcome: "settled" }, enabled: false, play: playTurnCompletionTone });

      expect(constructed).toBe(0);
    });

    it("constructs one when the preference is on, so the check above means something", () => {
      scope.AudioContext = FakeAudioContext;
      announceSettlement({ record: { outcome: "settled" }, enabled: true, play: playTurnCompletionTone });

      expect(constructed).toBe(1);
    });

    it("stays silent rather than throwing where Web Audio does not exist", () => {
      delete scope.AudioContext;
      expect(() => playTurnCompletionTone(TURN_COMPLETION_TONES.settled)).not.toThrow();
    });
  });

  describe("where it is wired", () => {
    it("is called exactly twice in App.tsx, once per settlement end site", () => {
      // CR151's investigation corrected its own count: Finishing ends in two places that produce a
      // record, not three. Recovery converging later calls no end at all. A third call site would
      // mean a settlement can be announced from somewhere that does not own its record.
      const source = withoutComments(appSource);
      expect(source.match(/announceSettlement\(/g) ?? []).toHaveLength(2);
    });

    it("takes its record straight from the registry's end call at both sites", () => {
      // The property this CR relies on lives in the *argument*. If a site ever passes an outcome it
      // computed itself instead of the record `end` returned, double-announcing becomes possible
      // again and nothing else in the suite would notice.
      const source = withoutComments(appSource);
      expect(source.match(/record:\s*timingRecord\b/g) ?? []).toHaveLength(2);
      expect(source.match(/settlementTimingRegistry\.end\(/g) ?? []).toHaveLength(2);
    });

    it("reads the preference at the moment of the act, not from the render that started the turn", () => {
      // Found by a control that this suite did not catch. A turn can run for ninety seconds, and
      // reading `turnCompletionSound` from state closes over the render that started it — so
      // switching the sound off mid-turn would still be followed by a tone. CR149's lesson applied
      // to a preference instead of a clock, and now guarded rather than merely commented.
      const source = withoutComments(appSource);
      expect(source.match(/enabled:\s*turnCompletionSoundRef\.current\b/g) ?? []).toHaveLength(2);
      expect(source).not.toMatch(/enabled:\s*turnCompletionSound\b(?!Ref)/);
    });

    it("plays through the real port rather than an inline AudioContext", () => {
      const source = withoutComments(appSource);
      expect(source).toContain("play: playTurnCompletionTone");
      expect(source).not.toContain("new AudioContext");
    });

    it("constructs the context only inside the player", () => {
      // An AudioContext built at module scope would allocate an audio device on launch for every
      // Navigator, including one who has the sound switched off.
      const source = withoutComments(soundSource);
      const constructorUses = source.match(/new Constructor\(\)/g) ?? [];
      expect(constructorUses).toHaveLength(1);
      const playerAt = source.indexOf("export function playTurnCompletionTone");
      expect(playerAt).toBeGreaterThan(0);
      expect(source.indexOf("new Constructor()")).toBeGreaterThan(playerAt);
    });
  });
});
