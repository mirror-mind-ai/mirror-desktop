[< RS021](index.md)

# CR102: Make Sidebar Progress Signals Legible

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The sidebar does not yet show progress icons adequately. The Navigator cannot reliably read a
Journey's current progress from the existing icon treatment.

## Outcome

Each visible progress signal has a single, legible meaning and accurately reflects the Journey's
current state without competing with selection, pinning, image or agent-status signals.

## First Investigation

Capture the current sidebar across idle, queued, working, finishing, ready, failed and interrupted
states, in expanded and collapsed layouts and both themes. Identify which signal is missing,
ambiguous, stale or visually insufficient before proposing a new icon language.

## Acceptance

- The intended progress states are distinguishable at normal sidebar reading distance.
- A state change is reflected without requiring navigation away and back.
- Signals stay truthful after completion, interruption, failure and app restart.
- The treatment remains readable in collapsed mode, light theme and reduced-motion conditions.

## Boundaries

No new notification ledger, no change to process or admission semantics, and no overloading of the
same control with pinning or selection.
