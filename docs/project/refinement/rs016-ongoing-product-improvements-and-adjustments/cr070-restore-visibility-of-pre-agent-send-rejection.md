[< RS016](index.md)

# CR070: Restore Visibility of Pre-Agent Send Rejection

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr070-unsent-notice-visibility`

## Problem

In DEV (`0.2.0-alpha.14`), sending a turn in Journey `US1 Rerun A 0831` with model `claude-bridge/claude-opus-5` produced total silence: no error, no agent run, no response. Durable evidence for `agent-run-2026-09-21T12:49:06.244Z`: journal `terminal_durable / process_died` about one second after admission, no Pi execution evidence, no synchronization debt.

The rejection path itself worked: the Pi process died before `run_status: working`, `runReachedAgent` stayed false, the transcript was rolled back and the draft returned to the Composer. But the `Message returned to the composer` warning is appended after the runtime entry is cleaned up, landing on a fresh entry whose `agentRun.status` is `idle`. CR069's banner gate requires `failed`, so the genuine pre-agent rejection became invisible — a CR069 regression: the gate that correctly silenced non-fatal warnings on completed runs also silenced the exact case the banner exists for.

## Expected Behavior

A message that never reached the agent is always visibly reported, with the provider's reason, while the draft returns to the Composer. Non-fatal warnings on completed runs stay out of the banner (CR069's guarantee is preserved). The mixed-signal design is corrected structurally: pre-agent/not-sent notices become their own presentation state set at the rejection sites, cleared on the next admission, instead of being inferred from the shared runtime warnings array plus run status.

## Implementation Outcome (2026-09-21)

Unsent-draft notices are now a dedicated presentation state (`src/app/unsentDraftNotice.ts`), recorded per Journey at all six rejection sites — the four pre-flight aborts (conversation authority changed, metadata/session authority changed, transcript inspection failed, run authority build failed) and the two pre-agent rollback paths (rollback confirmed, rollback failed) — always carrying the exact captured reason, including the provider text in `preAgentFailureMessage`. The notice clears at the next admission for that Journey, immediately before `register`.

The `Message was not sent` banner renders from this state. The CR069 failed-run gate is preserved untouched for mid-run terminal warnings, and the dedicated notice takes precedence when both would show.

## Validation

- Red-then-green unit coverage for record/replace/clear semantics.
- Source-inspection guardrails pin the rollback recording, the pre-register clearing and the banner render.
- Complete frontend suite: 923 tests. TypeScript/Vite build passed; roadmap `READY`; whitespace clean.
- Manual DEV homologation, round 1 (2026-09-21): the banner appeared, restoring visibility, but carried the generic `Pi command exited with status exit status: 1` instead of the provider's reason. Corrected below.

## Reason Fidelity Correction (2026-09-21)

The rejection emits two signals: the provider's own `warning` event naming the cause (`No models match pattern "claude-bridge/claude-opus-5"`), and the thrown process failure reporting only the exit status that followed. `preAgentFailureMessage` captured the second and overwrote nothing of the first, so the banner reported the symptom rather than the cause. The pre-CR070 banner had shown the warning because it rendered `lastItem(streamWarnings)`.

`resolveUnsentReason(providerWarnings, processFailure)` now composes the notice, preferring the last meaningful pre-agent provider warning and falling back to the process failure when none was emitted. Warnings are collected only while `runReachedAgent` is false, so mid-run warnings never leak into an unsent-message notice.

- Complete frontend suite after the correction: 926 tests.
- Manual DEV homologation, round 2: pending.

## Notes

Sibling capture CR071 covers why this model could be selected at all.
