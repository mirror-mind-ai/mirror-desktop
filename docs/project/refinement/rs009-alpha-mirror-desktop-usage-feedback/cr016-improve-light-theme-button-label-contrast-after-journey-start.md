[< Refinement Workbench](../index.md)

# CR016 — Improve light-theme button label contrast after journey start

## Problem

During Mirror Desktop alpha usage, the screen shown right after starting a Journey has insufficient color contrast in the button labels, specifically in light themes.

## Expected Behavior

button labels on that post-Journey-start screen should meet readable contrast in light themes without degrading the dark-theme appearance.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Plan Or Decision

Apply a light-theme-only semantic color contract to the four first-message suggestion buttons on `JourneyArrivalSurface`:

- use the existing light raised/surface tokens for the resting background;
- use `--light-text` for the resting label and `--light-accent` for hover/focus labels;
- retain visible border and keyboard focus treatment;
- leave the dark-theme declarations unchanged.

Driver: `@alissonvale`. Delivery: `refinement/rs009-cr010-shift-enter-line-breaks`.

## Implementation

Added one scoped CSS contract for Daylight, Mist, and Parchment. The correction overrides the dark hard-coded suggestion-label color only inside light application themes and adds explicit hover/focus contrast without changing component behavior or dark-theme styling.

## Evidence

A regression test calculates WCAG contrast from each curated light theme's semantic tokens for resting and interactive suggestion states, and asserts the dedicated CSS boundary.

Implementation checks:

- the focused application-theme suite passed with 10 tests;
- all 640 frontend tests passed across 115 files;
- `npm run build` passed, with only the pre-existing Vite chunk-size warning;
- `npm run tauri:build:dev` rebuilt the isolated Dev app and DMG;
- the restarted Dev process loaded the rebuilt executable (`pid=74268`, inode `161458200`);
- `git diff --check` passed before commit.

Navigator visual validation remains pending in the isolated Dev bundle.

## Outcome

No terminal outcome has been recorded.

## Migration Provenance

- Legacy record: `2c59f0eb`.
- Created: `2026-09-09T14:12:29.360651Z`.
- Last updated: `2026-09-09T14:12:29.360651Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
