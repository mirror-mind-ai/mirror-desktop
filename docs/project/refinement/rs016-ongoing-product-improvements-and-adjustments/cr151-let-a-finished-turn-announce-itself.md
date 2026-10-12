[< RS016](index.md)

# CR151: Let a Finished Turn Announce Itself

**Status:** captured
**Driver:** —
**Delivery:** —
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

## Boundaries

No system notifications, no badge, no dock bounce, no change to when a turn completes or how
completion is detected. Sound is a report on existing events and must not become a second source of
truth about them. Off means no audio code runs, not audio played at zero volume.

## Provenance

Absence of audio playback established by searching `src/` for playback APIs on 2026-10-12; only
`voiceCapture.ts` matched, for recording. Settings and preference storage read from the file list.
The duration range is from this Journey's fifteen measured Pi executions.
