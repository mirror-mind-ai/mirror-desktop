[< RS021](index.md)

# CR078: Model Fast Switch

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr078-model-fast-switch`

## Problem

Changing the model is a frequent, low-stakes decision that currently costs a heavy
interaction. The Composer footer already shows the active model and is already clickable,
but the click opens the Journey agent profile dialog: a modal with a full catalog select,
a save action, a reset action and a close action. The Navigator wanted a quick switch and
gets a settings screen.

## Expected Behavior

Switching the model happens in place, from where the model is already displayed. Open,
pick, done — without leaving the conversation, without a modal, and without hunting through
an undifferentiated list.

## Proposed Scope

- Replace the modal entry point from the Composer footer with an inline picker anchored to
  the model label.
- Make the common case short: surface what the Navigator is likely to want before the full
  catalog, rather than presenting one long list.
- Keep unavailable models visible and explained rather than silently absent, preserving the
  behaviour CR071 established.
- Keyboard access, focus handling and dismissal consistent with the other header controls.
- Light and dark theme contrast consistent with the existing control contracts.
- The full Journey agent profile dialog remains reachable for the settings-shaped decisions
  it also carries.

## Acceptance

- The model can be changed from the Composer footer without opening a modal.
- The picker is reachable and dismissable by keyboard.
- What a selection *means* is unchanged: same scope, same persistence, same effective-model
  resolution.
- Unavailable models remain visible with their reason.

## Exclusions

- No change to when a model surface is available; that is CR090.
- No change to run-scoped model authority or attribution; that is CR090.
- No new per-model settings, no provider onboarding change, no argument editing.

## Dependencies

Depends on CR090. Built on today's global block, a fast switcher would still be disabled
whenever any Journey is running, which would preserve exactly the friction this CR exists to
remove.

## History

Originally captured together with the availability and attribution problems. Those were
split into CR090 on 2026-09-25 so this CR could return to its original intent: the speed of
the switch itself.
