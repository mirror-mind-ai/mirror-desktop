import { describe, expect, it, afterEach } from "vitest";
import {
  announceSettlement,
  playTurnCompletionTone,
  previewTurnCompletionTone,
  turnCompletionToneFor,
} from "../app/turnCompletionSound";
import {
  DEFAULT_TURN_COMPLETION_TONE_ID,
  parseTurnCompletionToneId,
  TURN_COMPLETION_FAILURE_TONE,
  TURN_COMPLETION_SUCCESS_TONES,
  TURN_COMPLETION_TONE_IDS,
  type TurnCompletionTone,
} from "../domain/turnCompletionTone";
import appSource from "../app/App.tsx?raw";
import soundSource from "../app/turnCompletionSound.ts?raw";
import toneSource from "../domain/turnCompletionTone.ts?raw";
import tabSource from "../app/SettingsTabList.tsx?raw";

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function recorder() {
  const played: TurnCompletionTone[] = [];
  return { played, play: (tone: TurnCompletionTone) => void played.push(tone) };
}

function signature(tone: TurnCompletionTone): string {
  return tone.steps.map((step) => `${step.frequencyHz}@${step.durationMs}`).join("+");
}

describe("CR151: a finished turn announces itself", () => {
  describe("three success tones, one failure tone", () => {
    it("offers exactly the three the Navigator asked for, with the shipped one first", () => {
      // "Two more besides the current one": chime is the tone that was heard in the field, so it
      // stays, stays default, and stays first.
      expect([...TURN_COMPLETION_TONE_IDS]).toEqual(["chime", "rise", "bell"]);
      expect(DEFAULT_TURN_COMPLETION_TONE_ID).toBe("chime");
      expect(TURN_COMPLETION_SUCCESS_TONES.chime.steps).toEqual([{ frequencyHz: 880, durationMs: 160 }]);
    });

    it("plays the chosen tone on a settled turn", () => {
      for (const toneId of TURN_COMPLETION_TONE_IDS) {
        const { played, play } = recorder();
        const tone = announceSettlement({ record: { outcome: "settled" }, enabled: true, toneId, play });

        expect(tone).toEqual(TURN_COMPLETION_SUCCESS_TONES[toneId]);
        expect(played).toEqual([TURN_COMPLETION_SUCCESS_TONES[toneId]]);
      }
    });

    it("plays the failure tone on a failed settlement whichever success tone is chosen", () => {
      // A failure is not an occasion for taste. The chosen tone must not reach it.
      for (const toneId of TURN_COMPLETION_TONE_IDS) {
        const { played, play } = recorder();
        announceSettlement({ record: { outcome: "failed" }, enabled: true, toneId, play });
        expect(played).toEqual([TURN_COMPLETION_FAILURE_TONE]);
      }
    });

    it("degrades an unrecognised tone id to the default rather than to silence", () => {
      // A file edited by hand, or written by a future version with a fourth option, must not make
      // the sound disappear: silence is indistinguishable from the feature being broken.
      for (const bad of ["fanfare", "", null, undefined, 3, {}]) {
        expect(turnCompletionToneFor({ outcome: "settled", toneId: bad }))
          .toEqual(TURN_COMPLETION_SUCCESS_TONES[DEFAULT_TURN_COMPLETION_TONE_ID]);
      }
      expect(parseTurnCompletionToneId("chime")).toBe("chime");
      expect(parseTurnCompletionToneId("fanfare")).toBeUndefined();
    });

    it("keeps all four tones distinguishable from one another", () => {
      // No test can hear them. It can refuse a future edit that makes two of them the same, which
      // is the failure mode that would quietly remove a choice the Navigator asked for.
      const all = [...TURN_COMPLETION_TONE_IDS.map((id) => TURN_COMPLETION_SUCCESS_TONES[id]), TURN_COMPLETION_FAILURE_TONE];
      expect(new Set(all.map(signature)).size).toBe(4);
      expect(new Set(all.map((tone) => tone.label)).size).toBe(4);
    });

    it("keeps the failure tone below every success note, with the longest single note", () => {
      // The first version of this test asserted the failure tone was longest *overall* and failed:
      // `bell` totals 330 ms against the failure's 320, because `bell` wants a tail. The property
      // that is actually true, and actually carries the distinction, is pitch — more than an octave
      // below — plus the longest single note. The claim moved to match the tones rather than the
      // tones being bent to match the claim.
      const failureHz = TURN_COMPLETION_FAILURE_TONE.steps[0].frequencyHz;
      const longestFailureStep = Math.max(...TURN_COMPLETION_FAILURE_TONE.steps.map((step) => step.durationMs));
      for (const id of TURN_COMPLETION_TONE_IDS) {
        const tone = TURN_COMPLETION_SUCCESS_TONES[id];
        const lowest = Math.min(...tone.steps.map((step) => step.frequencyHz));
        expect(lowest / failureHz).toBeGreaterThan(2);
        expect(Math.max(...tone.steps.map((step) => step.durationMs))).toBeLessThan(longestFailureStep);
      }
    });

    it("gives every tone a label and a description, because Settings shows both", () => {
      for (const id of TURN_COMPLETION_TONE_IDS) {
        const tone = TURN_COMPLETION_SUCCESS_TONES[id];
        expect(tone.label.trim().length).toBeGreaterThan(0);
        expect(tone.description.trim().length).toBeGreaterThan(0);
        expect(tone.steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("when it must stay silent", () => {
    it("says nothing when there is no record, which is how a cancellation stays silent", () => {
      // An interrupted turn takes the finalizeInterruptedTurn branch and never begins a timing
      // collector, so no record ever reaches here. CR102: stopping is the Navigator's choice and
      // failing is not, so they do not deserve the same register.
      const { played, play } = recorder();
      expect(announceSettlement({ record: undefined, enabled: true, toneId: "chime", play })).toBeUndefined();
      expect(played).toEqual([]);
    });

    it("cannot announce one settlement twice, because the second end site gets no record", () => {
      // settlementTimingRegistry.end deletes its collector and returns undefined when there is
      // none. Whichever of the two end sites wins consumes the record; the loser is handed
      // undefined. This is the whole reason no de-duplication guard exists.
      const { played, play } = recorder();
      announceSettlement({ record: { outcome: "settled" }, enabled: true, toneId: "rise", play });
      announceSettlement({ record: undefined, enabled: true, toneId: "rise", play });

      expect(played).toEqual([TURN_COMPLETION_SUCCESS_TONES.rise]);
    });

    it("never reaches the player when the preference is off, for either outcome", () => {
      const { played, play } = recorder();

      expect(announceSettlement({ record: { outcome: "settled" }, enabled: false, toneId: "bell", play })).toBeUndefined();
      expect(announceSettlement({ record: { outcome: "failed" }, enabled: false, toneId: "bell", play })).toBeUndefined();
      expect(played).toEqual([]);
    });
  });

  describe("previewing a choice", () => {
    it("plays the tone being chosen", () => {
      const { played, play } = recorder();
      const tone = previewTurnCompletionTone({ toneId: "bell", enabled: true, play });

      expect(tone).toEqual(TURN_COMPLETION_SUCCESS_TONES.bell);
      expect(played).toEqual([TURN_COMPLETION_SUCCESS_TONES.bell]);
    });

    it("stays silent while the sound is off, so the preview cannot walk around the switch", () => {
      // "Off means no audio code runs" is an acceptance of this CR. A second trigger must honour
      // it, and the choice can still be made silently.
      const { played, play } = recorder();
      expect(previewTurnCompletionTone({ toneId: "bell", enabled: false, play })).toBeUndefined();
      expect(played).toEqual([]);
    });

    it("previews a success tone, never the failure tone", () => {
      const { played, play } = recorder();
      for (const toneId of TURN_COMPLETION_TONE_IDS) {
        previewTurnCompletionTone({ toneId, enabled: true, play });
      }
      expect(played).not.toContain(TURN_COMPLETION_FAILURE_TONE);
      expect(played).toHaveLength(TURN_COMPLETION_TONE_IDS.length);
    });
  });

  describe("off means no audio code runs", () => {
    type AudioScope = Omit<typeof globalThis, "AudioContext"> & { AudioContext?: unknown };
    const scope = globalThis as unknown as AudioScope;
    const original = scope.AudioContext;
    let constructed = 0;
    let oscillators = 0;

    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      constructor() {
        constructed += 1;
      }
      createOscillator() {
        oscillators += 1;
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
      oscillators = 0;
    });

    it("constructs no AudioContext when the preference is off", () => {
      // The acceptance says off must be genuinely silent, not played at zero volume. This is the
      // only test that can tell those apart, because it watches the constructor rather than the
      // output.
      scope.AudioContext = FakeAudioContext;
      announceSettlement({ record: { outcome: "settled" }, enabled: false, toneId: "chime", play: playTurnCompletionTone });

      expect(constructed).toBe(0);
    });

    it("constructs none for a preview while the sound is off either", () => {
      scope.AudioContext = FakeAudioContext;
      previewTurnCompletionTone({ toneId: "chime", enabled: false, play: playTurnCompletionTone });

      expect(constructed).toBe(0);
    });

    it("constructs one when the preference is on, so the checks above mean something", () => {
      scope.AudioContext = FakeAudioContext;
      announceSettlement({ record: { outcome: "settled" }, enabled: true, toneId: "chime", play: playTurnCompletionTone });

      expect(constructed).toBe(1);
    });

    it("schedules one oscillator per step on a single context", () => {
      // A two-note tone must not cost two contexts, and must not quietly play only its first note.
      scope.AudioContext = FakeAudioContext;
      playTurnCompletionTone(TURN_COMPLETION_SUCCESS_TONES.rise);

      expect(TURN_COMPLETION_SUCCESS_TONES.rise.steps).toHaveLength(2);
      expect(constructed).toBe(1);
      expect(oscillators).toBe(2);
    });

    it("stays silent rather than throwing where Web Audio does not exist", () => {
      delete scope.AudioContext;
      expect(() => playTurnCompletionTone(TURN_COMPLETION_SUCCESS_TONES.bell)).not.toThrow();
    });
  });

  describe("where it is wired", () => {
    it("is called exactly twice in App.tsx, once per settlement end site", () => {
      // CR151's investigation corrected its own count: Finishing ends in two places that produce a
      // record, not three. Recovery converging later calls no end at all.
      const source = withoutComments(appSource);
      expect(source.match(/announceSettlement\(/g) ?? []).toHaveLength(2);
    });

    it("takes its record straight from the registry's end call at both sites", () => {
      const source = withoutComments(appSource);
      expect(source.match(/record:\s*timingRecord\b/g) ?? []).toHaveLength(2);
      expect(source.match(/settlementTimingRegistry\.end\(/g) ?? []).toHaveLength(2);
    });

    it("reads both preferences at the moment of the act, not from the render that started the turn", () => {
      // A turn can run for ninety seconds. Reading either preference from state closes over the
      // render that started it, so a change made mid-turn would be ignored. CR149's lesson applied
      // to preferences instead of a clock, and guarded rather than merely commented.
      const source = withoutComments(appSource);
      expect(source.match(/enabled:\s*turnCompletionSoundRef\.current\b/g) ?? []).toHaveLength(2);
      expect(source.match(/toneId:\s*turnCompletionToneIdRef\.current\b/g) ?? []).toHaveLength(2);

      // The bare state read is legitimate in exactly one place — the Settings preview, which runs
      // from a click and whose current render is the right answer. A first version of this guard
      // forbade it outright and failed on that correct use, so it is pinned to one occurrence and
      // located inside the preview call instead of banned.
      const bare = source.match(/enabled:\s*turnCompletionSound\b(?!Ref)/g) ?? [];
      expect(bare).toHaveLength(1);
      const previewAt = source.indexOf("previewTurnCompletionTone({");
      expect(previewAt).toBeGreaterThan(0);
      const previewCall = source.slice(previewAt, source.indexOf("});", previewAt));
      expect(previewCall).toMatch(/enabled:\s*turnCompletionSound\b(?!Ref)/);
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
      expect(source.match(/new Constructor\(\)/g) ?? []).toHaveLength(1);
      const playerAt = source.indexOf("export function playTurnCompletionTone");
      expect(playerAt).toBeGreaterThan(0);
      expect(source.indexOf("new Constructor()")).toBeGreaterThan(playerAt);
    });
  });

  describe("where it lives in Settings", () => {
    it("sits in the Sound & Voice panel, not in Appearance", () => {
      // The Navigator asked for the move after hearing the first version. The guard is on the
      // panel rather than on a class name, because the panel is what the request was about.
      const voiceAt = appSource.indexOf('id="settings-panel-voice"');
      expect(voiceAt).toBeGreaterThan(0);
      const nextPanelAt = appSource.indexOf("{settingsTab === ", voiceAt);
      expect(nextPanelAt).toBeGreaterThan(voiceAt);
      const voicePanel = appSource.slice(voiceAt, nextPanelAt);

      expect(voicePanel).toContain('aria-label="Turn completion sound"');
      expect(voicePanel).toContain("VoiceSettingsPanel");

      const appearanceAt = appSource.indexOf('id="settings-panel-appearance"');
      const appearancePanel = appSource.slice(appearanceAt, appSource.indexOf("{settingsTab === ", appearanceAt));
      expect(appearancePanel).not.toContain('aria-label="Turn completion sound"');
      expect(appearancePanel).toContain('aria-label="Application appearance"');
    });

    it("renames the tab without renumbering the tabs", () => {
      // Renaming is not adding. The id stays `voice`, so panel ids, aria-controls and the keyboard
      // navigation order are untouched — which is what makes this change cheap where creating a
      // tab was not.
      expect(tabSource).toContain('{ id: "voice", label: "Sound & Voice" }');
      expect(tabSource).not.toContain('{ id: "voice", label: "Voice" }');
      // CV-010.DS-005 slice 3c-2 later added Connections, a tab of its own: six became seven.
      expect(tabSource.match(/\{ id: "/g) ?? []).toHaveLength(7);
    });

    it("offers the three tones as one radiogroup with the chosen one marked", () => {
      const source = withoutComments(appSource);
      expect(source).toContain('aria-label="Success tone"');
      expect(source).toContain("TURN_COMPLETION_TONE_IDS.map(");
      expect(source).toContain("aria-checked={selected}");
      expect(source).toContain("previewTurnCompletionTone({");
    });

    it("keeps the tone vocabulary in domain, where the preference file can validate it", () => {
      // domain/ must not acquire a runtime dependency on app/. The only existing import of that
      // direction is contextReading's `import type`, which erases at compile time.
      expect(toneSource).toContain("export const TURN_COMPLETION_TONE_IDS");
      expect(toneSource).toContain("export function parseTurnCompletionToneId");
      expect(toneSource).not.toContain("../app/");
      expect(withoutComments(soundSource)).toContain('from "../domain/turnCompletionTone"');
    });
  });
});
