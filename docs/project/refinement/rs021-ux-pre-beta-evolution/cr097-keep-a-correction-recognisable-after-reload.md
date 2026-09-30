[< RS021](index.md)

# CR097: Keep a Correction Recognisable After Reload

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

A correction the Navigator sends while a turn is running is shown as a correction during the run,
under the `Correction during response` surface. After leaving the Journey and coming back it is
shown as an ordinary new request.

The conversation then reads as if the Navigator had asked a second question that nobody answered —
especially after a cancellation, where the surface also shows `Previous attempt was interrupted`
immediately below it. The correction loses both its meaning and its attachment to the turn it was
correcting.

## Evidence

Read-only inspection of the Dev app data for two cancellations in Journey `builder-mode-evolution`,
generation 2, on 2026-09-30. Provenance is recorded because the runs belong to that Journey; the
defect is a Desktop surface behaviour, not a Journey-specific one.

Runs `agent-run-2026-09-30T11:53:49.301Z` and `agent-run-2026-09-30T12:22:24.536Z` each received the
correction `foca só no primeiro arquivo` while the agent was working.

- Pi committed the correction as a **user entry** (`f2f82f4f`, `2f8ee7d2`), carrying the raw text at
  27 characters with no Journey authority envelope. An ordinary request in the same session carries
  the envelope and is 974 characters before extraction.
- The persisted conversation has **no `steeringEvidence` key at all** once the run has settled.
- Projected through the production surface, the correction therefore appears as a plain user
  message (`pi-2f8ee7d2`), indistinguishable from a request.

## Diagnosis

Two independent layers, and each is enough on its own to produce the symptom.

**The steering record does not survive the run.** `SteeringEvidence` is durable by design and even
models `piUserEntryId`, which is set when a correction is applied — exactly the link that would let
a reconstruction recognise which Pi entry a correction became. But the persisted conversation holds
no steering evidence after settlement, so that link is gone before any reconstruction can use it.
Whether it is never written, overwritten by a later snapshot, or dropped on load is the first thing
this CR must establish.

**The Pi-backed projection cannot tell a correction from a request.**
`projectPiBackedConversationSurface` treats every Pi `user` entry as a request. Pi is right to hold
the correction as a user entry, since that is what the model received; the Desktop is the only layer
that knows it was a correction, and it currently has no surviving evidence to say so.

**A correction also opens a new run in the interrupted-run matching.** CR089's
`matchInterruptedTurnsByUserEntryId` segments runs on user entries, so a correction starts a new
segment. No incorrect output was observed from this — the affected runs still matched their own turn
records and recovered their operations — but a correction is not a new request, and modelling it as
one is wrong and will misbehave for a run that continues after being corrected.

## Expected Behavior

A correction reads as a correction wherever it is read: live, after navigating away and back, and
after an app restart. It stays attached to the turn it was correcting, keeps its status, and is
never presented as a request that went unanswered.

Run segmentation treats a correction as part of the turn it corrected rather than as the start of a
new one.

## Proposed Scope

- Establish where the steering record is lost between staging and reload, and fix that first. Until
  the evidence survives, no presentation work can be correct.
- Decide the authority question explicitly, as CR089 had to: Pi holds the correction as a user
  entry, so the Desktop must either mark that entry as a correction from surviving evidence, or
  accept that a correction is indistinguishable after reload and close this as rejected with the
  reasoning recorded. Reuse the CR089 outcome where it applies — evidence about a turn is already an
  established, durable, non-transcript surface.
- Teach the Pi-backed projection to present a Pi user entry that a surviving steering record claims,
  through `piUserEntryId`, as a correction rather than a request.
- Stop treating a correction as the start of a run in `matchInterruptedTurnsByUserEntryId`.
- Validate against live, restored and restarted conversations, for both a cancelled turn and a turn
  that completed after being corrected.

## Acceptance

- A correction sent during a run is still shown as a correction after navigating away and back, and
  after an app restart.
- The correction keeps its status and its attachment to the corrected turn.
- A correction is never rendered as an unanswered request, and the interrupted-attempt notice never
  appears to belong to it.
- A run that was corrected is still matched to its own turn record, and its operations, notes and
  interrupted fragment behave exactly as CR089 established.
- An ordinary request is unaffected.

## Exclusions

- No writes to Pi JSONL, and no removal or rewriting of the user entry Pi legitimately recorded.
- No change to how steering is delivered to the running agent, or to cancellation semantics.
- No backfill of corrections whose evidence was already lost.

## Dependencies

Independent of CR089 in delivery, but it shares that CR's surface and its authority reasoning, so it
should land on a baseline that already contains CR089's projection work. It was captured from
evidence gathered while validating CR089.
