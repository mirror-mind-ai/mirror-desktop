[< CV-004](../index.md)

# CV-004.DS-005 - Legacy Parity Removal and Desktop Review

**Status:** ✅ Done

## Outcome

The desktop no longer exposes or executes the superseded cross-environment parity model, and the Navigator validates the dedicated-thread lifecycle across clean start, resume, restart, migration and failure recovery.

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| CV-004.DS-005.TS-1 | Obsolete Continuity Code Removal | Technical Story | Remove Mirror conversation selection, arbitrary transcript hydration, external Pi continuation projection and cross-environment reconciliation once replacements are proven | ✅ Done |
| CV-004.DS-005.TS-2 | Legacy State Retirement | Technical Story | Preserve bounded migration evidence while deleting unreachable parity-era local state, commands and branches without affecting native Mirror/Pi history | ✅ Done |
| CV-004.DS-005.US-1 | Dedicated Thread Desktop Review | User Story | Navigator validates start, situated first turn, resume, terminal independence, restart and active-generation recovery across representative Journeys | ✅ Done |

## Required Review Scenarios

- A Journey with no dedicated generation presents **Start this Journey** instead of a generic composer.
- Start creates one Pi session and one Mirror conversation, activates Journey context and does not invoke a provider.
- The first real message is generated with the selected Journey visible in authority and context receipts.
- Returning to the Journey resumes the exact active dedicated pair without a picker.
- A terminal conversation associated with the same Journey advances without changing Nautilus transcript, checkpoints or composer eligibility.
- Mirror recording fails after Pi completion and retries exactly once without another provider call.
- Restart preserves the old generation and activates a distinguishable new pair.
- Interrupted provisioning restores the prior valid state or presents a bounded retry.
- A parity-era Journey is not auto-adopted and starts with a clean generation.
- Rapid Journey switching discards late provisioning, inspection and retry results for the previously selected Journey.

## Removal Gate

Legacy code is removed only after characterization tests identify the old surfaces and replacement acceptance tests cover their intended safety value. Native Mirror conversations, Pi sessions and Git history are never deleted by this cleanup. Rollback retains the last released parity implementation until production validation closes the story.

## Done Condition

This story is done when no user-facing path asks the Navigator to choose a Mirror conversation for Nautilus continuity; external activity cannot enter the active transcript; generic parity classifications and reconciliation previews are absent from the dedicated lifecycle; obsolete code and tests are removed rather than hidden; required scenarios pass automated and desktop validation; production migration preserves native history; and documentation describes only the new authority model.

## Boundary

This cleanup does not remove Journey-level memories, attachments or semantic context cultivated outside Nautilus. It removes only their mistaken role as conversational continuity or transcript authority.
