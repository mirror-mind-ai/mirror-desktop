[< RS016](index.md)

# CR151: Let a Finished Turn Announce Itself

**Status:** in_progress
**Driver:** assistant
**Delivery:** `refinement/cr151-let-a-finished-turn-announce-itself`
**Navigator priority:** 3 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"tocar um som quando um turno terminar (ligar/desligar no
settings)"*

A turn can take over a minute. Fifteen Pi executions measured in this Journey ran from 15.4 s to
94 s. The Navigator leaves the window and has no way to know the answer arrived without looking.

## What Exists

**No audio playback exists anywhere in the application.** The only audio in the codebase is
`voiceCapture.ts`, which *records* for voice transcription and deliberately never plays anything.
There is no notification facility either. This is a new capability, not an adjustment to one.

Settings already has a home: `SettingsTabList.tsx` with `agentSettingsStorage.ts` persisting
`agent-settings.json`, whose root keys are exactly `schemaVersion`, `globalProfile` and
`journeyOverrides`. Whether a sound preference belongs in that file or in
`journeyPreferenceStorage.ts` is open — the first is about how the agent runs, and this is about how
the application behaves, which argues for the second.

## Outcome

When a turn finishes, the application plays a short sound, and the Navigator can turn it off in
Settings. Off must be genuinely silent.

## First Investigation

- ~~**Which moment is "terminar"?** […] **The answer arriving is the likely intent, and it is not the
  last event.**~~ **Answered by the Navigator (2026-10-12): when settlement ends.** *"Imaginei que
  seria uma das coisas que o Finishing faz (notifica)."* My guess above was wrong and is kept struck
  through: I assumed they wanted the answer's arrival, and they want the turn genuinely finished.
  That makes the sound a **completion of the `Finishing` phase**, which is a better fit than I
  proposed — the phase already exists, already knows when it ends, and already owns a surface. It
  also means the sound can arrive seconds after the text is readable, which is deliberate.
- **Where exactly does `Finishing` end?** It ends in several ways, and they are not one site: the
  settlement block's own `finally`, CR132's abandonment act, and recovery converging later. A sound
  on each would announce the same turn more than once.
- **Every turn, or only one the Navigator is not watching?** A sound on a turn completing while the
  window is focused and the Navigator is reading the stream is noise. Whether window focus gates it
  changes the design, and gating on focus is the kind of heuristic that is wrong at the worst moment.
- ~~**What about a turn that ends badly?**~~ **Answered (2026-10-12): a failure may sound
  different.** So there are at least two sounds, which settles that a single asset or a single tone
  is not enough. Still open within that answer: whether a **cancellation** the Navigator themselves
  performed should sound at all — they already know it happened, and announcing their own act back to
  them is noise rather than information.
- **Which turns, when several run at once?** RS024 made concurrent work inside one Journey real. A
  sound per finishing turn is correct and may also be three sounds at once.
- **Does it need a file?** A short tone can be synthesised with `AudioContext` and no asset, which
  avoids a bundled file and a path. Whether that is good enough is a taste question the Navigator
  should answer by hearing it.
- **Default on or off?** A new sound that arrives switched on without being asked for is the kind of
  thing that gets switched off once and never reconsidered.

## First Investigation — Answered from the Code (2026-10-14)

Every remaining question was answerable by reading, and one of my own answers above was wrong.

### Where `Finishing` ends: TWO sites, not three

I wrote that it ends in three places. It ends in **two**, and only these two produce a settlement
record, because only these two call `settlementTimingRegistry.end`:

| site | outcome |
|---|---|
| `App.tsx:3711` — the settlement block's own `finally` | `"settled"` or `"failed"` |
| `App.tsx:4071` — CR132's abandonment act | always `"failed"` |

**Recovery converging later does not call `end` and produces no record**, so the third site I named
does not exist for this purpose.

**The double-announce risk is already impossible by construction.** `registry.end` deletes the
collector from the map and returns `undefined` when there is none (`settlementPhaseTiming.ts:241`).
So a sound driven off a non-`undefined` return cannot announce the same settlement twice, whichever
site reaches it first. This needs no new guard — it needs the sound to be keyed on the record rather
than on an event.

### A cancellation is silent by construction, with no special case

The question was whether a cancellation the Navigator performed should sound. **It cannot**, and
nothing has to be written to prevent it: an interrupted turn takes the *other* branch of the
`if`/`else if` at `App.tsx:3637`/`:3664`, calling `finalizeInterruptedTurn`, which never begins a
timing collector and therefore never ends one.

So the moment the Navigator chose — settlement end — already has the property they would have asked
for. That is consistent with CR102's recorded rule, quoted from `journeyAgentStatus.ts:15`: stopping
*"is the Navigator's choice and failing is not, so they do not deserve the same register."*

### Two sounds map onto an enumeration that already exists

`SettlementOutcome` is exactly `"settled" | "failed"`, and `settlementOutcome` is initialised to
`"failed"` and set to `"settled"` only on success — fail-closed. So "a failure may sound different"
needs no new classification; it reads a value the record already carries.

### Concurrency: at most one settlement per Journey, several across Journeys

Answered by CR119's own comment at `App.tsx:3666`: the collector is *"keyed by Journey because
finalization is serialized per Journey."* So the `journeyId`-keyed map cannot collide and there is at
most one sound per Journey per settlement. Across Journeys, simultaneity is real but rare — the
overlap census measured 2.9% of settlements overlapping another Journey's.

### Focus gating: the app has something better than focus, and slice 1 should still not use it

There is no window-focus state in the application. There is something more useful and already
computed: `dispatchJourneyFinishedAttention({ type: "run_finished", … selected:
selectedJourneyRef.current === ownerJourneyId })` at `App.tsx:3726`, and the reducer already
auto-acknowledges a finish that happened while its Journey was selected.

**Recommendation: do not gate slice 1 on it.** Three reasons, in order of weight:

1. This CR's own text warns that focus gating *"is the kind of heuristic that is wrong at the worst
   moment"*, and that judgement was right.
2. The request was a sound when a turn finishes, with a switch. A second, invisible condition turns
   *"I turned it on"* into *"sometimes it does not play"*, which is a worse surface than noise
   because it is not falsifiable by the Navigator.
3. `selected` is a Journey-selection fact, not a presence fact. The Navigator can have a Journey
   selected and be in another application entirely — the exact case the sound exists for — so gating
   on it would silence the announcement precisely when it is wanted.

The datum stays available if the field asks for it.

## Scope

**Slice 1 — a sound at settlement end, switchable, off is silent.**

- Two tones, distinguished by the `SettlementOutcome` the record already carries.
- **Synthesised with `AudioContext`, no bundled asset**, so there is no file, no path and no loading
  failure mode. This CR already recorded that whether a tone is good enough is *"a taste question the
  Navigator should answer by hearing it"* — so it ships as a tone, is heard in Eval, and becomes a
  file only if the tone is rejected.
- **A global preference, `turnCompletionSound: boolean`, in `journeyPreferencePersistence.ts`.** That
  file already holds every preference about how the *application behaves* — `sidebarCompact`,
  `applicationTheme`, `voiceLanguage`, `journeyListOrder`, `hideMirrorHistory` — whereas
  `agent-settings.json` holds `globalProfile` and `journeyOverrides`, which are about how the *agent
  runs*. The open question in this CR resolves to the first, as its own text suspected.
- **Default on.** This CR's caution — that a sound arriving switched on gets switched off once and
  never reconsidered — applies to a sound nobody asked for. The Navigator asked for this one, and
  shipping it silent by default means the feature they requested appears to be missing.
- The store is `journeyPreferencePersistence`; the **control renders in Settings**, where the
  Navigator asked for it. Those are different places and both are required.

### Files

- `src/domain/journeyPreferencePersistence.ts` — the new global key, defaulting to `true`, degrading
  to the default on a bad value under CR133's departure.
- `src/tests/journeyManagementGuardrails.test.ts` — the exact sorted key list, which pins persisted
  preferences; `turnCompletionSound` goes between `sidebarCompact` and `voiceLanguage`.
- `src/app/turnCompletionSound.ts` *(new)* — the decision and the synthesis, kept apart: a pure
  function from `{ outcome, enabled }` to a tone description or `undefined`, and a thin port that
  plays it.
- `src/app/App.tsx` — one statement at each of the two `end` sites, keyed on the returned record.
- `src/app/SettingsTabList.tsx` — the switch.
- `src/styles/app.css`, plus a new test file.

### Acceptance

1. A settled turn plays the completion tone.
2. A failed settlement plays a **different** tone.
3. An abandoned settlement (CR132) plays the failure tone, because its record says `failed`.
4. A cancelled turn plays **nothing** — asserted against the branch, not merely observed.
5. With the preference off, **no `AudioContext` is constructed at all**: the port is never reached,
   not reached with zero volume.
6. The preference survives a relaunch and is global.
7. The same settlement cannot sound twice, including when abandonment and the `finally` race.

### Validation

Unit tests on the pure decision for all four outcomes × on/off; a source guard that the two `end`
sites are the only callers; a test that the port is never invoked when the preference is off. **No
test can hear a sound** — the tone itself is only verifiable in the field, which is slice 1's
hand-over, and that is stated now rather than discovered at the end.

### Conscious Exclusions

- **No focus or selection gating**, for the three reasons above.
- **No system notification, badge or dock bounce** — already a boundary below.
- **No per-Journey sound preference.** The grain is the application, like every other preference in
  that file.
- **No sound on cancellation**, which costs nothing because it is structurally unreachable.
- **No asset pipeline**, unless the field rejects the tone.

## Boundaries

No system notifications, no badge, no dock bounce, no change to when a turn completes or how
completion is detected. Sound is a report on existing events and must not become a second source of
truth about them. Off means no audio code runs, not audio played at zero volume.

## Provenance

Absence of audio playback established by searching `src/` for playback APIs on 2026-10-12; only
`voiceCapture.ts` matched, for recording. Settings and preference storage read from the file list.
The duration range is from this Journey's fifteen measured Pi executions.

## Delivery (2026-10-14)

Built as scoped, with two departures from the plan and one gap the plan did not anticipate.

### The preference is read from a ref, which the scope did not say

Site 1 announces from inside the run loop, which closes over the render that **started** the turn —
and a turn can run for ninety seconds. Read from state, switching the sound off mid-turn would still
have been followed by a tone: exactly the *"I turned it off and it did not obey"* surface this CR
refused to build when it declined focus gating.

This is **CR149's lesson applied to a preference instead of a clock** — that release's own comment
reads *"evaluated against the clock at the moment of the act rather than against whatever the last
render believed."* So `turnCompletionSoundRef` is read at the moment of the act, kept in sync by one
effect.

### A control found a guard that was missing, not a defect

The control that replaced `turnCompletionSoundRef.current` with `turnCompletionSound` **passed**.
Nothing in the suite noticed the staleness the paragraph above was written about — the reasoning was
in a comment and nowhere else. A guard was added that pins both sites to the ref and refuses the
bare state read, and the control then failed on it.

### A control that proved nothing, caught because it printed the wrong kind of nothing

The first attempt at the module-scope-construction control hoisted `new Constructor()` to module
scope, where `Constructor` is a function-local. Vitest reported **"no tests"** — the module threw on
import. That is a load failure, not a guard working. Rebuilt as a `warmUpAudio()` function declared
before the player, it compiles, imports, and fails **two** assertions: the source-shape count, and
the behavioural one that counts constructions.

### Six controls, each compiling and then failing on the right assertion

| control | failed on |
|---|---|
| the preference is ignored | silence with it off, and no-AudioContext |
| keyed on a locally computed outcome instead of the record | the record-provenance guard (2 sites) |
| the two tones moved close together | the distinguishability guard |
| construction hoisted above the player | the shape guard **and** the construction count |
| the abandonment site unwired | call count, provenance, and the ref guard |
| the preference read from state | the ref guard (the one this found) |

### Three of my own mechanical errors, all caught by an assert before any write

Indentation was read off `sed`-decorated output three times and was wrong by exactly two spaces each
time. Every one aborted at its assert with the file untouched, and the third fix removed the class of
error rather than the instance: insertions now find their anchor by content and inherit **that
line's own** indentation. A fourth attempt placed a shell environment assignment after the command
instead of before it, so four controls aborted having applied nothing — visibly, with the result
named invalid rather than reported.

### What is not claimed

**No test can hear a tone.** The suite asserts which tone was chosen, that the two are far enough
apart that a future edit cannot quietly merge them, and that nothing is chosen when the preference is
off. Whether 880 Hz and 220 Hz are *pleasant* is the field's to judge, and replacing the tone with an
asset remains the recorded fallback.

Gates: `tsc` clean, **264 files / 2,133 tests**, cargo 324 passed / 3 ignored, build clean, roadmap
READY.
