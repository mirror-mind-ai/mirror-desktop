[< RS016](index.md)

# CR070: Restore Visibility of Pre-Agent Send Rejection

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

In DEV (`0.2.0-alpha.14`), sending a turn in Journey `US1 Rerun A 0831` with model `claude-bridge/claude-opus-5` produced total silence: no error, no agent run, no response. Durable evidence for `agent-run-2026-09-21T12:49:06.244Z`: journal `terminal_durable / process_died` about one second after admission, no Pi execution evidence, no synchronization debt.

The rejection path itself worked: the Pi process died before `run_status: working`, `runReachedAgent` stayed false, the transcript was rolled back and the draft returned to the Composer. But the `Message returned to the composer` warning is appended after the runtime entry is cleaned up, landing on a fresh entry whose `agentRun.status` is `idle`. CR069's banner gate requires `failed`, so the genuine pre-agent rejection became invisible — a CR069 regression: the gate that correctly silenced non-fatal warnings on completed runs also silenced the exact case the banner exists for.

## Expected Behavior

A message that never reached the agent is always visibly reported, with the provider's reason, while the draft returns to the Composer. Non-fatal warnings on completed runs stay out of the banner (CR069's guarantee is preserved). The mixed-signal design is corrected structurally: pre-agent/not-sent notices become their own presentation state set at the rejection sites, cleared on the next admission, instead of being inferred from the shared runtime warnings array plus run status.

## Notes

Sibling capture CR071 covers why this model could be selected at all.
