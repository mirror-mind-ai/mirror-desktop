[< RS026](index.md)

# CR191: Notice a New Version While the App Stays Open

**Status:** in_progress
**Line:** 0.3 · Desktop

## Friction

Raised by the Navigator on 2026-11-04, to come before CV-013: the notice of a new version appears
only when the app loads. The app is used continuously and rarely closed, so the person misses
the update notices.

## What the Code Did (read 2026-11-04)

`SelfUpdateNotification.tsx` asked the update channel once, in an effect that runs when the window
mounts. Nothing asked again while the app stayed open.

## Decision (Navigator, 2026-11-04)

Proposed and accepted as "crie e construa a CR191":

- Ask the channel again **every 4 hours** while the app is open.
- Ask when the window **comes back** (focus, or the document becoming visible) if the last check is
  more than **1 hour** old. This covers a Mac that slept through its timers.
- The notice is the same chip as today: no window, no interruption, installing stays a choice and
  still waits for the turn to finish.
- A failed check (offline, channel down) shows nothing; the next moment asks again.
- A shown notice moves to a newer version when one appears.

## Built

- `src/app/updateRecheck.ts`: `startUpdateRechecks` looks at the clock every 5 minutes and on window
  return, decides on elapsed time, counts the check made at load, and runs one check at a time.
  `stateAfterRecheck` never disturbs an installation or an error the person is reading, keeps an
  update already shown if the channel later says current, and moves a shown notice to a newer one.
- `SelfUpdateNotification.tsx` starts the rechecks after the load check, with no visible "checking"
  state.
- Spec: `src/tests/cr191UpdateRecheck.test.ts` (12 tests), checked failing first and by mutation
  (in-flight guard, the load check counted, error kept, same version kept). Code: `6de612e9`.

## Acceptance

A development build does not use the update channel, so the field check is in production:

1. Publish a release carrying CR191 and install it.
2. Publish one more release while that app stays open.
3. Without restarting, the chip shows the newer version within 4 hours, or when the window comes
   back after more than an hour.
