[< RS021](index.md)

# CR097: Keep a Correction Recognisable After Reload

**Status:** planned
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

## Pull and Plan (2026-10-03)

Pulled by explicit Navigator intent after CR116 closed. Driver and Delivery remain intentionally
unassigned; planning is not implementation authority.

The current baseline changes the first diagnostic materially: persisted `0.9.0` conversations now
parse and write `steeringEvidence`, and CR114's Segment partition and recombination also carry it.
The original Dev observation predates those paths. Therefore Slice 0 is a required falsification,
not a formality: reproduce its completed and cancelled cases through the current save, unload,
restore and restart path. If evidence already survives, record that the capture was resolved by the
baseline and narrow the work to projection/segmentation only; do not rebuild persistence speculatively.

The remaining code reading establishes a concrete second fault: `projectPiBackedConversationSurface`
opens `runUserEntryId` on every Pi user entry, while `matchInterruptedTurnsByUserEntryId` does the
same. Neither consults `metadata.steeringEvidence[].piUserEntryId`, even though
`reconcileSteeringEvidence` records that exact identity. A restored correction is consequently
projected as `pi-<entryId>` with the role `user`, and it can split CR089's interrupted-turn window.

### Slices

1. **Characterise current authority.** Add fixtures for accepted correction evidence with an exact
   Pi user entry, for completed-after-correction and cancelled-after-correction histories, and prove
   the persisted/Segment round trip before selecting a persistence change.
2. **Bind correction identity before run matching.** Build the claimed Pi-entry set from surviving
   `steeringEvidence`; reject duplicate or cross-run claims fail-closed. Make interrupted matching
   skip those entries as run boundaries while retaining their chronological place.
3. **Project the correction as a correction.** Bind a claimed Pi user entry to the correction's
   existing evidence instead of making a plain user request, preserving Pi text, timestamp and the
   correction's status/attachment in `ConversationTranscript`.
4. **Preserve the ordinary case.** Prove unclaimed Pi user entries retain the existing request and
   CR089 interrupted-turn semantics. Prove no Pi JSONL write, steering delivery, cancellation or
   historical backfill is introduced.
5. **Validate.** Run focused domain/component/integration tests, the full suite, type check, build,
   native tests/check, roadmap consistency and diff check. Dev homologation must cover corrected
   completed and cancelled turns after navigation/restart, plus an ordinary request control.

### Boundary with CR117

[CR117](../rs016-ongoing-product-improvements-and-adjustments/cr117-make-a-correction-legible-while-it-is-live.md)
covers the same surface while it is live: a correction's status never leaving `Correction queued`,
and its placement under a prompt that is scrolled away. This CR covers the surface after reload. The
two must not be implemented blind to each other: CR117 slice 4 decides where a correction is
rendered, and this CR decides what a restored correction is rendered as. Whichever lands first owns
the placement decision and the other adopts it.

The interaction is favourable rather than conflicting. CR117 reconciles steering evidence during the
run instead of only at `done`, so `piUserEntryId` — the exact identity this CR depends on — becomes
populated earlier and in more cases, including runs that are later cancelled. CR117 is therefore the
recommended first of the pair, and slice 1 here should record whether it has landed, because it
changes how often the evidence this CR needs is present at all.

### Files

Expected implementation files: `src/domain/piBackedConversationSurface.ts`,
`src/domain/conversationSegmentProjection.ts` only if Slice 1 proves a Segment-loss path,
`src/app/conversationTranscriptModel.ts` and/or `src/app/ConversationTranscript.tsx` for the
existing correction surface. Expected tests: `src/tests/piBackedConversationSurface.test.ts`,
`src/tests/interruptedTurnIdentity.test.ts`, `src/tests/steeringState.test.ts`,
`src/tests/conversationSegmentProjection.test.ts` if applicable, and a restored-surface component
or integration test. `src/domain/persistedJourneyConversation.ts` is expressly out unless Slice 1
proves its present `0.9.0` round trip loses evidence.

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
