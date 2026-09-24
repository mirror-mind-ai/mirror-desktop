[< RS021](index.md)

# CR078: Model Fast Switch

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The model switching surface is blocked while there is a live process. That is too broad. Changing the model is a future-turn preference; it should not require the Navigator to wait for the current run to settle when no mutation of the active process is implied.

## Expected Behavior

The model switcher remains available during a live process when the selected model affects only future turns. The UI clearly states that the active run keeps the model it started with, while the new selection will be used for the next admissible turn.

## Proposed Scope

- Characterize which settings are safe future-turn preferences and which are active-run controls.
- Unblock model selection while a process is alive if it only changes future invocation settings.
- Preserve active-run model authority and prevent retargeting of any running child process.
- Explain the effective model for the active run versus the next run.

## Acceptance

- A running turn does not block changing the model for the next turn.
- The active turn's model is not changed, cancelled, restarted, or misrepresented.
- The UI distinguishes "current run" from "next run" model state.

## Exclusions

- No mid-run model swap.
- No provider fallback or automatic retry.
- No change to Pi invocation authority for already-started runs.
