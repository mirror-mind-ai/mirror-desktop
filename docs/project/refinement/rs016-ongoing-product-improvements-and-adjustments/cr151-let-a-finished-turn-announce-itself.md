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

## Field Build — Dev, not Eval (2026-10-14)

The Navigator judged this CR testable in **Dev**, and the data confirms it rather than merely
allowing it. Dev's own data directory holds a registry of **24 addressable Journeys** and
**26 settled settlements** (`mirror-desktop` 24, `mirror-ts-core` 2), so turns have genuinely run and
settled in that channel before. This is the first CR in a while that needs no real Journey content —
it needs a turn to finish, which Dev can do.

Two of my own readings of that directory were wrong before they were right, and both were format
guesses rather than measurements: the registry keys its Journeys under `roots`, not `journeys`, so a
first parse reported **0**; and the settlement files are JSON arrays, not JSONL, so a line-by-line
parse also reported **0**. Both counts above come from parsing the actual shape.

- Source `abf99d8`, worktree clean, 0 unpushed.
- Installed binary `725954072e25ba76d398596b5521246f7ff69333f7481afd4197122846385603`, identical to
  the built one, replacing `97cdf93d…` — the stale `alpha.47` Dev from 2026-10-12 that carried only
  CR149's first slice.
- Backup at `/tmp/Mirror Desktop Dev-20261014-114242.app`, **hash-verified before the installed app
  was removed**.
- Identity of the **built** bundle checked before the destination was touched, which is what
  `install-eval` does for its own channel and what a manual install must do by hand:
  `v=0.2.0-alpha.49`, `id=ai.mirrormind.desktop.dev`, `name=Mirror Desktop Dev`. There is no
  `install:dev` script.
- `ps` gate twice — before the backup and again immediately before the copy — and once after. Dev
  was closed at all three points; only production was running and it is a different bundle.

### Verified through the dist, with the instrument's blindness demonstrated in the same run

| literal | expected | found |
|---|---|---|
| `Sound on` in the **binary** | 0 — frontend is compressed | **0** |
| `Sound on` in `dist/assets/index-BqtSdMmt.js` | present | 1 |
| `Sound off` | present | 1 |
| `Turn completion sound` | present | 1 |
| `A short tone when a turn finishes settling` | present | 1 |
| `Turn the completion sound off` | present | 1 |
| `frequencyHz` | present | 3 |
| `until-next-turn` (CR150) | present | 2 |
| `Hide Other ` (CR152) | present | 1 |
| `Desktop only`, `Mirror hidden` (CR153) | present | 1 each |
| `hidden by this filter`, `Show them` | **absent** | **0** |
| invented control string | **absent** | **0** |

dist written 11:39:33, binary 11:41:20 — the same build.

### Dev and production can run together, for a weaker reason than Eval's

Dev's identifier gives it a separate application data directory, verified present and distinct, so
this is not Eval's situation where the two share real Journeys. **But both deliver to the same Mirror
database**, so closing production is still the cleaner call for a test run — a different and much
weaker reason than with Eval, and worth stating precisely rather than repeating Eval's rule as if it
applied unchanged.

## Field Result and Second Slice (2026-10-14)

**Navigator report:** *"Funcionou."* The first slice is confirmed in the field on Dev — the tone
plays, the switch works, the default is on.

Three requests followed, all accepted, all in this CR because the surface being changed is the one
this CR built:

1. the settings belong beside **Voice**, with the tab renamed **"Sound & Voice"**;
2. **three** success tones rather than one;
3. chosen in Settings.

### Renaming is not adding, which is why the earlier objection does not apply

The first slice declined to create a tab because *"adding one would change `settingsTabs`, which the
keyboard-navigation guards pin, for one boolean."* That reasoning does not transfer to a rename. The
tab keeps its **`voice` id**, so every panel id, `aria-controls` and the keyboard navigation order is
untouched and only the label moves. Both facts are now guarded: the label is pinned to
`"Sound & Voice"`, the id to `voice`, and the tab count to six.

`settingsTabList.test.ts` asserted `toContain("Voice")`, which `"Sound & Voice"` satisfies — so the
rename would have passed silently. The new guard asserts the whole entry instead.

### Three tones, with the field-validated one kept and kept default

A tone is now a short **sequence** rather than a single beep: one sine wave can only move in pitch
and length, which is not enough room for three options a listener can tell apart and still like.

| id | shape | notes |
|---|---|---|
| `chime` *(default)* | one short high note | 880 Hz / 160 ms — **the tone that was heard in the field** |
| `rise` | two notes going up | 659.25 → 987.77 Hz |
| `bell` | two notes going down with a tail | 1174.66 → 880 Hz, 330 ms total |
| *failure* | one low longer note | 220 Hz / 320 ms — **not selectable** |

The failure tone is deliberately **not** a choice. The Navigator asked to choose among success
sounds; a failure is not an occasion for taste, and a test asserts the chosen tone cannot reach it.

### Selecting a tone plays it

Choosing a sound you cannot hear is the same defect as judging a tone from a specification, which is
exactly what sent the first version to the field to be corrected. So the preview exists — and it is
**gated on the switch**, because *off means no audio code runs* is an acceptance of this CR and a
second trigger would otherwise walk around it. While the sound is off the choice can still be made,
silently, and takes effect when it is switched back on.

### A layering inversion avoided rather than accepted

`journeyPreferencePersistence` has to validate a stored tone id, and a preference file is domain. The
first attempt imported the vocabulary from `app/turnCompletionSound`, which would have been the first
**runtime** dependency from `domain/` into `app/` — the one existing import of that direction,
`contextReading`'s, is an `import type` that erases at compile time. So the vocabulary moved to
`src/domain/turnCompletionTone.ts` and the player stayed in `app/`. Guarded.

### A claim of mine that a test disproved

I wrote that the failure tone *"stays below every success option and longer than all of them."* The
second half is false: `bell` totals 330 ms against the failure's 320, because `bell` wants a tail.
**The claim moved to match the tones rather than the tones being bent to match the claim** — what is
asserted now is that the failure is more than an octave below every success note and has the longest
single note, both true and both carrying the distinction.

### A guard of mine that was too wide

The first version of the staleness guard forbade reading `turnCompletionSound` from state anywhere,
and **failed on a correct use**: the Settings preview runs from a click, where the current render is
the right answer. It is now pinned to exactly one bare read, located inside the preview call, rather
than banned outright. Both refs are still required at both settlement sites.

### Eight controls, each applied under a gate and failing on the right assertion

| control | failed on |
|---|---|
| the chosen tone ignored | chosen-tone, double-announce, preview |
| an invalid id falling to silence | the degradation guard |
| two tones made identical | the distinguishability guard |
| the preview walking around the switch | preview silence **and** no-AudioContext |
| only the first note played | the oscillator-per-step count |
| the section back in Appearance | the panel-location guard |
| the rename changing the id too | the id/label/count guard |
| the tone id read from state | the two-ref guard |

### A fourth indentation error, and the practice that ends the class

Hand-written indentation was wrong for the fourth time, aborted at its assert with the file
untouched. Every edit in this slice afterwards used content anchors that inherit **the anchor line's
own** indentation, and no indentation was typed by hand again.

### What is still not claimed

**No test can hear a tone.** The suite asserts which tone is chosen, that the four stay
distinguishable, that a two-note tone schedules two oscillators on one context, and that nothing is
chosen when the preference is off. Whether `rise` and `bell` are *pleasant* is the field's.

Gates: `tsc` clean, **264 files / 2,145 tests**, cargo 324 passed / 3 ignored, build clean, roadmap
READY.

### Dev build for the second slice (2026-10-14)

- Source `de33bc4`, worktree clean, 0 unpushed.
- Installed binary `a4f819f5da1fcbb14d68a8549c1615c097667ebb76afcfa2040fa6875fb97f08`, identical to
  the built one, replacing `72595407…` — the first slice's Dev from earlier today.
- Backup at `/tmp/Mirror Desktop Dev-20261014-125844.app`, hash-verified before the installed app
  was removed.
- Built bundle identity checked before the destination was touched: `v=0.2.0-alpha.49`,
  `id=ai.mirrormind.desktop.dev`, `name=Mirror Desktop Dev`.
- `ps` gate before the backup, again immediately before the copy, and once after. Dev closed at all
  three; only production was running, which is a different bundle.

Verified through the embedded dist, with the instrument's blindness shown in the same run — the tab
label returns **0** from the binary and **1** from `dist/assets/index-CRJKqsOV.js`:

| literal | expected | found |
|---|---|---|
| `Sound & Voice` | present | 1 |
| `Turn completion sound` | present | 2 — the section's `aria-label` and its `<h3>` |
| `Success tone` | present | 1 |
| `Choosing a tone plays it.` | present | 1 |
| `One short, high note.` / `Two notes going up.` / `Two notes going down, with a longer tail.` | present | 1 each |
| `1174.66` / `987.77` / `659.25` | present | 1 each — the new tones' own frequencies |
| `always sounds different` | present | 1 |
| `:"Voice"` — the old tab entry | **absent** | **0** |
| `fails sounds different` — the old hint | **absent** | **0** |
| invented control string | **absent** | **0** |

dist 12:56:12, binary 12:58:07 — the same build. The two absences are the half that distinguishes
this build from the one installed ninety minutes earlier; every presence above would also have
matched a build that merely contained the first slice's strings plus new ones.

## Third Slice: the theme token contract (2026-10-14)

**Navigator report:** *"Alguns problemas de contraste nos temas claros. No tema escuro, a opção que
eu marco não fica com highlight."* — with three screenshots.

The screenshots showed more than the tone selector. In the light family, **"Desktop only" (CR153),
"2 hidden" (CR135) and every "Reveal" button** were white on white, alongside `Chime` and `Rise`. So
the cause was not the control that was just built.

### The cause: a token contract that was used by 102 rules and declared by none

| token | uses | declared |
|---|---|---|
| `--text-muted` | 24 rules | **never** |
| `--text` | 18 rules | **never** |
| `--border` | 12 rules | **never** |
| `--ui-text` | 3 rules | **never** |
| `--ui-muted` | 2 rules | **never** |
| `--accent` | 43 rules outside its scope | only on `.journey-item` and `.accent-*` |

A `var()` that resolves to nothing, with no fallback, makes the declaration invalid at
**computed-value time**. `color` then falls back to **inherit**, which is why the light families
showed white text on white surfaces; `border` resets to `none`, which is why no control in the new
selector had an outline in either family. Nothing reports this — not the build, not `tsc`, not any
test, because CSS does not fail loudly.

Three uses had fallbacks (`--danger` twice, `--border-subtle` once) and were therefore harmless;
**59 declarations had none**.

### Declaring the contract, rather than patching the three controls that were photographed

`--text`, `--text-muted`, `--border`, `--ui-text`, `--ui-muted` and a shell-scoped `--accent` are now
declared on `.app-shell` for the dark families and in the existing three-light-family block, mapped
onto the **`--light-*` palette that already existed** rather than onto new colours. `--light-muted`
measures about 5:1 on `--light-surface`.

**This is a deliberately broad repair and the risk is named rather than discovered:** roughly 102
declarations that have been inert go live at once. Each was written by someone who intended it to
work, so the expected outcome is the design as it was meant to look — but it is a wide visual change
across the sidebar, the conversation list and Settings, and only the field can confirm it.

### The selected tone also needed more than a wash

The undeclared tokens explain the missing highlight, but a 14% tint was never going to be enough on
its own. The selected state now follows `.theme-choice.selected` — the control two panels away that
poses the same question and reads in both families — including its `inset 2px 0 0` bar.

### A guard that would have caught this, and two holes in it that controls found

`themeTokenContract.test.ts` asserts that every `var(--token)` without a fallback is declared
somewhere, that each contract token is declared for both families and on `.app-shell` itself, and
that the light families map onto their own palette.

Two of my own guards were weaker than they claimed, and a control found each:

- **The guard read itself.** The scan of inline-style declarations included `src/tests/`, where this
  file's own assertion string `"--text-muted: var(--light-muted);"` contains a colon and was counted
  as a declaration. The control that removed the token from both families **passed**. `src/tests/` is
  now excluded — the same lesson already recorded for a Rust guard counting a symbol inside test
  string literals, arriving in a second language.
- **The accent guard checked existence, not scope.** It asserted the declaration appeared anywhere,
  and passed with the shell declaration removed because `.journey-item` carries an identical line.
  The scope was the entire claim, so the scope is what it reads now.

### Seven controls

| control | failed on |
|---|---|
| a token used and never declared | the undeclared guard, after the self-reading hole was closed |
| the contract declared only for dark | both-families and light-palette guards |
| a light family given a new colour | the light-palette guard |
| the accent losing shell scope | the scope guard, after it was made to read scope |
| the selected state reduced to a wash | the marker guard |

Gates: `tsc` clean, **265 files / 2,150 tests**, cargo 324 passed / 3 ignored, build clean, roadmap
READY.

### Not claimed

**No test can see a colour.** The contrast figures come from the palette's own values, not from
rendering. Whether the repair looks right across the sidebar, the conversation list and Settings, in
all nine themes, is the field's.
