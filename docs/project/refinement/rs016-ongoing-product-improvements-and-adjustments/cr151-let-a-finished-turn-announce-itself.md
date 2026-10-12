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

- **Which moment is "terminar"?** The application has several, and they are not the same instant. The
  provider's answer arriving, the run terminalizing, and settlement completing can be seconds apart —
  `Finishing` exists precisely because the last one is visible. A sound at terminalization announces
  an answer the Navigator can read; a sound at settlement announces durability they cannot see.
  **The answer arriving is the likely intent, and it is not the last event.**
- **Every turn, or only one the Navigator is not watching?** A sound on a turn completing while the
  window is focused and the Navigator is reading the stream is noise. Whether window focus gates it
  changes the design, and gating on focus is the kind of heuristic that is wrong at the worst moment.
- **What about a turn that ends badly?** A failure, a cancellation and an interrupted turn all end.
  Whether they share the sound, get a different one, or stay silent is a product decision — and a
  cheerful completion sound for a failure would be a lie.
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
