[< RS016](index.md)

# CR116: Release a Journey Stranded in Finishing

**Status:** planned (reopened — Phase 2)
**Driver:** @alissonvale (Phase 1) · — (Phase 2)
**Delivery:** `refinement/rs016-cr116-stranded-finalization-recovery` (Phase 1, merged and deleted) · — (Phase 2)

**Phase 1 — stranded finalization recovery — is delivered, Navigator-validated on 2026-10-03 and
merged to `main` as `4a716d7` / `aa3d329`. It is not reopened and nothing below revises it.** On
2026-10-03 the Navigator extended this CR with two further correction-surface concerns, recorded as
Phase 2. The CR is therefore `planned` again for that new scope only; Phase 2 has no Driver, no
Delivery and no implementation authority.

> **Structural note, for the Navigator's decision.** A separate CR would preserve a cleaner review
> boundary: Phase 1 was an incident-driven reliability fix whose commit is already merged, while
> Phase 2 is correction-surface work that shares neither its evidence, its title nor its acceptance.
> Keeping both here is workable because Phase 1 is unreleased, so no published record is
> contradicted, and the title now under-describes the scope. Splitting Phase 2 into its own CR
> remains a cheap documentation move if preferred.

Captured on 2026-10-02 from a production incident the Navigator reported while `v0.2.0-alpha.31`
was prepared and awaiting confirmation. Pulled by explicit Navigator intent on 2026-10-02 after
`v0.2.0-alpha.31` was published. The plan below was recorded from a read-only diagnosis of `main`
at `5273428`. The Navigator later settled the three planned decisions, assigned Driver and
Delivery, explicitly authorised implementation, and validated the Dev build on 2026-10-03.

## Problem

A Journey entered `Finishing` after its turn completed and stayed there. The Navigator could
neither cancel nor send a new turn. The Journey became unusable for the remaining life of the
application process, and the only escape was to quit and reopen the application.

The agent's work was not lost and was never at risk. The answer had already been committed to the
Pi session. What failed was the Desktop's post-turn bookkeeping, and the failure had no in-session
exit.

## Evidence

Read-only inspection on 2026-10-02 of production app data under `ai.mirrormind.desktop`, with the
production application left running and untouched (PID 29592, installed `0.2.0-alpha.30`).
Provenance is recorded because the incident occurred in Journey `alissonvale-com`; the defect is a
Desktop behavior, not a Journey-specific one.

The stranded turn, run `agent-run-2026-10-02T23:33:12.979Z`:

```text
journal phase            terminal_durable
terminalOutcome          completed
cancellationIntent       none
recoveryDisposition      resume_projection
revision                 3
updatedAt                2026-10-02T23:35:25.797Z
```

Its terminal evidence names exact Pi coordinates, and all of them are present in the session
JSONL — `userEntryId 69a3688a`, `assistantEntryId da5c0acd`, `leafEntryId da5c0acd`,
`entryCount 1923`. The session's own leaf is `da5c0acd` with 1,923 entries, so the committed
answer is intact and reachable.

The turn committed at `23:35:25.022Z`, but the durable projection
`dedicated-journey-conversations/alissonvale-com/generation-1.json` was last written two minutes
earlier, at the start of the turn. The post-turn persistence therefore never wrote anything.

Three ordinary explanations were checked and excluded: 40 GiB of free disk, an empty
`mirror-append-outbox.json`, and no child processes under the application, so no hung Pi or helper
subprocess. The same journal holds 60 `settled` records, so this is not a Journey that never
settled.

## Diagnosis

Three findings, read from `v0.2.0-alpha.30` as published. The first explains the symptom, the
second explains why it is permanent, and the third explains why no control could escape it.

**The settlement await never returned.** `run_status: completed` sets
`isStreaming: false, isFinalizingTurn: true`, and `isFinalizingTurn` is what the surface renders as
`Finishing`. It is cleared by the `finalization_finished` action, which `App.tsx` dispatches from
the `finally` of the block that awaits `finalizeCompletedTurn`. A thrown error would therefore have
cleared the flag and surfaced a settlement error. The flag is still set, so the promise neither
resolved nor rejected: a persistence operation remains pending.

**One pending operation strands the Journey permanently.** `journeyPersistenceCoordinator.run`
chains work on a tail keyed by `authority.journeyId`:

```js
const prior = tails.get(authority.journeyId) ?? Promise.resolve();
const task = prior.catch(() => undefined).then(operation);
```

`prior.catch()` makes the chain survive a *rejected* predecessor, which is the failure the design
anticipated. It does not survive a predecessor that never settles, and no operation in the chain
has a timeout or an abandonment path. One such operation poisons every subsequent persistence
operation for that Journey until the process exits. This also explains the blast radius: other
Journeys kept working, because the tail is per Journey.

**The repair routine is gated on the state it exists to repair.**
`recoverPostTerminalPersistence` returns on its first line when the owner's runtime entry is active
or finalizing:

```js
if (ownerEntry && isJourneyRuntimeActiveOrFinalizing(ownerEntry)) return;
```

`isJourneyRuntimeActiveOrFinalizing` is true whenever `isFinalizingTurn` is set. So the routine that
CR062 introduced to make post-terminal finalization self-healing and actionable declines to run for
exactly the state that needs it. The same flag feeds `selectedRuntimeBusy`, which blocks Send, and
cancellation has nothing to act on because the run already reached a terminal outcome and its
process is gone. All three exits close on the same flag.

Restarting the application does recover the turn, which is why the incident is survivable.
`reconcile_pi_backed_mirror_delivery_debt` refuses only while an active lease exists, and
`materialize_completed_journal_delivery_debt` accepts records in exactly
`TerminalDurable | Projected | OutboxEnqueued` with a `Completed` outcome. A fresh process has no
in-memory finalizing entry, so recovery runs, materializes this turn's delivery debt from its Pi
evidence and settles it. Recovery through a restart is correct behavior, but requiring a restart is
not.

**Not implicated.** CR115 removed a trailing occupancy reconcile from inside
`recoverPostTerminalPersistence`; that routine never ran during this incident, so the removal is
not a contributing cause. CR114 is not present in `0.2.0-alpha.30`.

**Not established.** Which awaited operation hung is unknown. No subprocess was pending, so the
candidates are a native command that never returned or a tail already poisoned by an earlier
operation. Distinguishing them requires instrumenting a live process, which was not done on
production.

Two further records in the same journal, from 2026-09-30, sit at `terminal_durable` with
`process_died` after an `npm install pi-agent-browser-native` failure. They are excluded from debt
materialization because their outcome is not `completed`, and the 60 turns that settled afterwards
show they never blocked successors, which is CR108 behaving as intended. They are inert pre-existing
debt and are named here only so a future reading does not mistake them for this incident.

## Expected Behavior

A turn whose post-terminal persistence does not complete leaves the Journey recoverable without
quitting the application.

- Persistence that stops making progress is bounded and reported, instead of waiting forever.
- A Journey stranded after a completed turn offers the Navigator a way out from inside the session.
- The post-terminal repair route remains available precisely when the Journey is stranded in
  finalization.
- A completed answer that is durable in the Pi session is never presented as lost, and the Journey's
  durable records remain the authority for what settled.

## Proposed Scope

- Bound every persistence operation the per-Journey tail serializes, so a non-settling operation
  fails the operation rather than the Journey. Decide explicitly whether the bound is a timeout, an
  abort signal, or an abandonment that re-keys the tail, and what evidence it records.
- Make the stranded state escapable: decide whether finalization that has stopped progressing is
  itself terminal for the in-memory entry, and what the Navigator sees and can press.
- Separate the repair route's guard from the condition it repairs, without reintroducing the
  CR115 recovery loop or allowing repair to race genuinely active native work.
- Identify the hung operation if it remains reproducible, and record the finding; if it does not
  reproduce, say so rather than inventing a cause.
- Keep restart-based recovery working exactly as it does today.

## Acceptance

- A persistence operation that never settles does not strand its Journey: the Journey returns to a
  usable state in the same session, and the failure is visible rather than silent.
- The post-terminal repair route is reachable while a Journey is stranded in finalization, and
  remains unavailable while native work is genuinely active.
- An idle Journey does not re-enter recovery repeatedly, so the CR115 behavior is preserved under a
  regression test.
- A completed turn that is durable in Pi settles without requiring an application restart.
- Turn admission, counts, settlement authority, Mirror delivery and Pi transcript authority are
  unchanged; the durable journal remains the record of what settled.
- Cancellation semantics for genuinely active runs are unchanged.

## Exclusions

- No change to Pi compaction, transcript authority, run authority or Journey identity.
- No deletion or rewriting of durable journal records, projections, outbox items or Pi sessions,
  and no repair of the two inert 2026-09-30 records.
- No production data mutation and no launching or closing of the production application as part of
  diagnosis.
- No new release, tag, publication or promotion is authorized by this capture.
- Capture assigns no Driver, chooses no Delivery and starts no implementation.

## Diagnosis (2026-10-02, after pull)

Read-only inspection of `main` at `5273428`. The capture named two defects. A third layer exists,
and it changes the remedy: **fixing the renderer guard alone would accomplish nothing.**

**There are three per-Journey serialization layers, and none of them is bounded.**

```text
1  turnFinalizationCoordinator.serialize(journeyId)      finalize + interrupt + converge
2  journeyPersistenceCoordinator.run(journeyId tail)     every persistence operation
3  recoverPostTerminalPersistence guard                  declines while finalizing
```

Layer 1 is the one the capture missed:

```js
function serialize(journeyId, task) {
  const previous = queues.get(journeyId) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(journeyId, next.catch(() => undefined));
  return next;
}
```

One queue per Journey serves `finalizeCompletedTurn`, `finalizeInterruptedTurn` **and**
`convergeDelivery`. `previous.then(task, task)` runs the next task whether the predecessor resolved
or rejected, so rejection is survived by design — and, exactly like layer 2's `prior.catch()`, a
predecessor that never settles is not. A hung `finalizeCompletedTurn` therefore parks
`convergeDelivery` behind it forever. The repair route would hang even if it were allowed to start,
which means layer 3 is not the thing standing between the Navigator and recovery; it is merely the
first refusal they meet.

**The two layers have different blast radii.** Reading `executeCompletedSettlement`, the live
sequence is:

```text
loadActiveEvidence        outside the persistence tail
saveActiveProjection      inside  (pre_frontier)
loadActiveEvidence        outside
cleanupLease              outside
enqueueOutbox             inside  (pre_frontier)
deliverOutboxItem         outside
appendAndAcknowledge      inside  (post_frontier)
```

A hang outside the tail strands the turn and, through layer 1, the Journey's finalization queue. A
hang inside the tail additionally poisons persistence. Both present identically as `Finishing`.

**Where the incident's hang sits.** The journal never left `terminal_durable` and the durable
projection was never written, and the completed path advances `terminal_durable → outbox_enqueued`
inside `enqueueProjectionOutbox`. That places the pending operation at `loadActiveEvidence` or
`saveActiveProjection` — the first two steps. Both reach native commands over large files: the
former loads the durable projection and thread authority with the Pi session coordinates attached,
the latter writes the projection and then chains `loadConversationSegments`,
`publishConversationSegmentProjections` and, for Desktop threads only, a catalog reconcile. The
affected thread is `nautilus-thread-alissonvale-com`, so the catalog branch was not involved. Which
exact command hung remains unestablished.

**Abandonment is safe, and that is not an assumption.** Two existing guarantees make a bounded
operation recoverable rather than corrupting. Journal transitions carry both `expectedRevision` and
`expectedPhase` and are enforced natively, so a revived zombie operation cannot regress or
double-advance a record — `stale_divergent_and_cross_authority_mutations_fail_closed` and
`authority_free_lifecycle_save_cannot_regress_a_persisted_receipt` already pin this. Durable
projection writes are staged and preserve the previous file on failure, pinned by
`durable_projection_write_syncs_unique_stage_and_preserves_previous_on_failure`. Slice 0 re-verifies
both before anything is changed.

## Plan

0. **Characterise all three layers.** Tests that pin today's behaviour: a never-settling operation
   inside the persistence tail strands every later persistence call for that Journey; a
   never-settling `finalizeCompletedTurn` parks `convergeDelivery` on the same Journey; the repair
   route declines while `isFinalizingTurn` is set. Re-verify the two native guarantees above, so
   the rest of the plan rests on checked ground rather than on reading.
1. **Bound the operations.** Introduce one bounded-wait seam used by both coordinators, so a
   persistence or finalization operation that stops progressing fails its caller instead of waiting
   forever. The bound must be generous: this product legitimately writes multi-megabyte projections
   and inspects a 39.7 MB session, and a bound that fires on ordinary slowness would be a worse
   defect than the one being fixed.
2. **Abandon instead of poisoning.** On expiry both queues must advance so successors run, relying
   on the native expectations from slice 0 to make any late landing fail closed. Record the
   abandonment as durable, readable evidence rather than a console line.
3. **Make recovery reachable.** Re-base the repair route's refusal on native occupancy, which is
   authoritative about whether Pi is actually executing, rather than on the renderer's
   `isFinalizingTurn` belief. Preserve CR115: an idle Journey must not re-enter recovery, and the
   trigger must not watch a status its own run mutates.
4. **Stop showing `Finishing` for something that has stopped.** Decide whether stalled finalization
   becomes its own runtime state, so the surface can say that finalization stopped and offer the
   repair control, instead of displaying a label that promises imminent completion forever.
5. **Regression.** The CR115 idle-loop test and the CR108 independence test must both hold, and a
   new test must prove a stranded Journey returns to usable in the same session.
6. **Validate.** Automated gates, then Eval homologation on a real Journey confirming ordinary
   settlement, cancellation and sending are unchanged.

## Files

- `src/app/turnFinalizationCoordinator.ts`: `serialize`, `finalizeCompletedTurn`,
  `finalizeInterruptedTurn`, `convergeDelivery`.
- `src/app/journeyPersistenceCoordinator.ts`: the per-Journey tail, bound and abandonment.
- `src/app/journeySettlement.ts`: `executeCompletedSettlement`, for which steps are bounded.
- `src/app/App.tsx`: `recoverPostTerminalPersistence` and its guard, the effect that triggers it,
  the repair controls, `finalizationPorts`, `saveProjectedTurnLifecycle`.
- `src/app/journeyRuntimeState.ts`: whether stalled finalization is its own state.
- `src/app/piInvocationOccupancy.ts`: the authoritative active-execution signal for the guard.
- `src/app/ComposerRuntimeFooter.tsx`, `src/app/journeyAgentStatus.ts`, `src/styles/app.css`: the
  surface for a finalization that stopped.
- Tests: a new `strandedFinalizationRecovery`, additions to `journeyPersistenceCoordinator`,
  `turnFinalizationCoordinator`, `journeySettlement`, `composerTurnStatus` and `journeyAgentStatus`,
  plus `idleRecoveryLoop` as the CR115 regression.

## Validation

- Automated: the new and amended tests above, the complete front-end suite, `tsc`, production
  build, `cargo test`, `cargo check --locked`, `roadmap:check`, `git diff --check`.
- A test must demonstrate the whole chain: an operation that never settles leaves the Journey
  usable, the failure visible, and a later successful turn unaffected.
- Eval homologation on a real Journey: ordinary turns, cancellation, manual compaction and restart
  recovery all unchanged, and an idle Journey quiet.
- Honest limit to record at closure: the production hang is not reproducible on demand, so the
  stranded path will be proven by test rather than by reproducing the original incident in Eval.
  No claim should be made that the root operation was identified unless it actually is.

## Settled Decisions

Resolved on 2026-10-02: the Navigator accepted all three recommendations and authorised
implementation. Driver and Delivery follow the established convention for this repository.

1. **Expiry rejects the awaiting caller and advances the queue.** The operation is abandoned, not
   cancelled: it keeps running detached and its outcome is discarded. Safe because the durable
   layers already refuse a late landing.
2. **The bound is a fixed, generous ceiling.** `PERSISTENCE_OPERATION_BOUND_MS = 120_000`. It
   exists to catch a wait that will never end, not to police slowness, because a real Journey
   legitimately writes multi-megabyte projections and inspects a 55 MB session.
3. **Stalled finalization becomes legible.** Implemented through the existing surface rather than a
   new runtime state — see the deviation recorded below.

## Implementation Evidence

Implemented on 2026-10-02 on `refinement/rs016-cr116-stranded-finalization-recovery`, from
`b2f0bcd`. Every change was written test-first.

### One bound, used by both queues

New `src/app/boundedPersistenceOperation.ts` holds the seam: `runBoundedOperation`, the reason
vocabulary (`abandonedOperationReason`, `isAbandonedOperationReason`), the default ceiling and an
injectable timer so the behaviour is testable without real time.

The bound stops the wait, not the work. On expiry the caller rejects with
`persistence_operation_abandoned:<label>:<ms>`, the detached operation keeps running, and its late
outcome — value or rejection — is absorbed so it cannot escape as an unhandled rejection. A bound
that did not elapse can never report an abandonment: cancelling leaves the expiry permanently
pending.

`journeyPersistenceCoordinator.run` and `turnFinalizationCoordinator.serialize` both route their
operation through it. Abandonment needed no separate unblocking mechanism: because the bounded task
rejects, each queue's existing recovery-from-rejection is what advances it. `serialize` also gained
a phase label, so a failure names which step stopped — `finalize_completed`,
`finalize_interrupted` or `converge_delivery`.

### The repair route now refuses on the right thing

`recoverPostTerminalPersistence` previously returned on `selectedRuntimeBusy` and on
`isJourneyRuntimeActiveOrFinalizing(ownerEntry)`. Both are true while a Journey is stranded in
`Finishing`, so the routine declined exactly the state it exists to heal. It now refuses on
`hasActiveNativeExecution(piInvocationOccupancy, ownerJourneyId)` — the native registry, which is
authoritative about whether Pi is executing — and on `isJourneyRuntimeStreaming(ownerEntry)`, this
Journey's own live run. A lease that is merely `finalizing` means the process is gone and
bookkeeping is owed, which is when repair should run.

`isJourneyRuntimeActiveOrFinalizing` is unchanged and still used for admission and cleanup, where
refusing during finalization is correct.

### Deviation from the plan, with its reason

Slice 4 proposed a new runtime state for stalled finalization. Reading the code showed the surface
already exists: a retained finalizing lease plus a settlement error renders `Conversation
synchronization needs attention` with a `Repair synchronization` button. It never appeared because
the operation hung instead of rejecting, and `finalization_finished` sits in a `finally` — so
bounding alone converts the strand into the already-handled failure path: the flag clears, Send
unblocks, the notice appears and the button now works. Only one thing was missing, a truthful
explanation, so `describeAbandonedOperation` says that a step stopped responding, that the answer
is preserved in the Pi session, and that repair completes the turn. Adding a parallel runtime state
would have duplicated a working surface.

Slice 2 also proposed recording the abandonment as a durable artifact. Not built: the durable fact
is already the journal record left at its unfinished phase, and the reason reaches the Navigator
through the settlement error and the sync-attention ledger. A new file would have stored no new
information.

### Tests

- `src/tests/boundedPersistenceOperation.test.ts` — 11 cases: normal value, ordinary rejection
  passed through unchanged, abandonment naming phase and bound, the operation surviving
  abandonment, no unhandled late rejection, an expiry after the operation already won being
  ignored, reason recognition, the generous default, real-timer cleanup and real-timer expiry.
- `src/tests/strandedFinalizationRecovery.test.ts` — `convergeDelivery` runs after a hung
  `finalizeCompletedTurn` is abandoned (this await never returned before), a second Journey stays
  independent, and source assertions pinning the new guard and the preserved CR115 property.
- `src/tests/journeyPersistenceCoordinator.test.ts` — two cases added: a never-settling operation
  no longer strands successors, and the exact phase can be retried afterwards because the in-flight
  dedup entry does not survive abandonment.
- `src/tests/idleRecoveryLoop.test.ts` — the CR115 regression, unchanged and passing.

No existing expectation needed changing.

### Gates

- 221 front-end test files, 1,554 tests (was 219 / 1,534).
- `npx tsc --noEmit`, `npm run build`.
- `cargo test`: 241 passed, 3 ignored. `cargo check --locked`: no warnings.
- `npm run roadmap:check`, `git diff --check`.

### Phase 1 Navigator Validation and Closure

This closure is final for Phase 1 and is not reopened by the Phase 2 scope recorded further below.

The Navigator validated Phase 1 in the Dev build on 2026-10-03. The tested build was installed at
`/Applications/Mirror Desktop Dev.app`, replacing `0.2.0-alpha.27` with the CR116 build at
`0.2.0-alpha.31`; it was not started by the Delivery. The Navigator's validation closes the CR.

**Proportionality review: proportional.** One generic, injectable bounded-operation seam resolves
all three unbounded per-Journey layers without inventing a second repair queue, migration or new
durable record. The visible state reuses the existing retained-lease/synchronization-attention
surface rather than creating a redundant runtime state. The 120-second ceiling is intentionally
narrow in purpose and generous in duration.

**Debt review: follow_up.** The exact native operation that never returned in the production
incident remains unestablished; the fix treats the observable failure mode without claiming a root
cause it cannot prove. The bounded path is test-proven, but the original incident is not
reproducible on demand. A future observability CR may record phase-level elapsed time or an
abandonment diagnostic if an operational need arises; it should not tighten the bound without
measurements from large real Journeys. No immediate follow-up is selected by this closure.

Phase 1 was integrated to `main` by fast-forward as `4a716d7` (implementation) and `aa3d329`
(closure), and its Delivery branch was deleted. It is unreleased.

## Phase 2 — Correction Status and Correction Focus (added 2026-10-03)

Two Navigator observations from daily use. Both concern a correction sent while the agent is
working: the first is that its status never becomes meaningful, the second is that the Navigator
cannot see where it went.

### Problem

**A correction never leaves its queued status.** After sending a correction the surface shows
`Correction queued` and stays there. The Navigator gets no signal that the model actually received
it, which is the only thing that matters while deciding whether to wait, repeat or cancel.

**A correction is sent into a place the Navigator is not looking.** Corrections are listed under the
original prompt. A correction is sent precisely when the agent has already produced a long output,
so the prompt is far above the viewport. The correction lands off-screen and the Navigator sees
nothing happen at all.

### Diagnosis

Read-only reading of `main` at `aa3d329`.

**The status vocabulary is already right; only the observation is missing.** `SteeringStatus`
already models `applied`, `transitions` already allows `accepted → applied`, `SteeringMessages`
already labels it `Correction applied`, and `transitionSteering` already refuses `applied` without
`piUserEntryId` evidence. So nothing needs inventing. What is missing is *when* the evidence is
read:

```js
// App.tsx — inside the stream loop, only on the terminal event
if (event.type === "done" && mode === "live") {
  ...
  let reconciled = reconcileSteeringUserEntries(runConversation, runAuthority, userEntries);
```

`reconcileSteeringUserEntries` is the only producer of `applied`, and it runs only at `done` (and in
the restore path at `App.tsx:1777`). While the run is alive the correction therefore remains
`accepted`, rendered as `Correction queued`, until the entire turn ends — at which point the status
is retrospective and useless for the decision the Navigator was trying to make.

**The two statuses mean different things, and the distinction must be kept.** `accepted` is Pi's RPC
admitting the steer request: `steer_pi_invocation` returns only `pending | accepted`. `applied` is
the correction existing as a user entry in the Pi session, which is the first moment it is part of
what the model was given. There is no third signal: `AgentStreamEvent` has no steering case, so the
run stream never reports consumption.

**The naive way to observe it is the expensive one.** The native command behind the evidence reads
the whole session:

```rust
fn load_dedicated_pi_user_entries(...) {
    project_pi_user_entries(&fs::read_to_string(session_file)?)
```

CR114 measured a real session at 55 MB. Polling this during a live run would reread tens of
megabytes repeatedly — the same class of defect CR113 and CR114 just removed. Any in-run observation
must therefore be bounded, reusing the `from_entry_id` scoping CR114 introduced, or be driven by an
event rather than a poll.

**The placement is a genuine mismatch, not a styling preference.** The evidence is indexed by the
turn's assistant message but rendered in the *user* message's row:

```js
const owningAssistantMessageId = index.turnByUserMessageId.get(message.id)?.harness.assistantMessageId;
const steering = owningAssistantMessageId ? index.steeringByAssistantMessageId.get(...) : EMPTY_STEERING;
// ... passed to ConversationMessageRow for the user message, rendered after its body
```

So the correction is attached to the one element of the turn guaranteed to be scrolled away at the
moment of sending. No other surface shows it: a search across the app components finds steering only
in `SteeringMessages`, `ConversationTranscript`, `App.tsx` and the draft input. There is no live
Composer-side acknowledgement and no mid-run cadence of any kind.

### Truthfulness constraint

The Navigator asked for a `read` indication. What the evidence establishes is that the correction
entered the model's input, not that the model read or obeyed it. The visible wording must say the
former. This follows the register CR079 and CR114 already set: mark what is known, never imply an
observation the system cannot make.

### Plan

1. **Characterise and choose the signal.** Prove the current timing with a test that a correction
   stays `accepted` for the life of the run. Then establish the cheapest truthful in-run signal, in
   this preference order: an event-driven confirmation if one can be obtained from the existing RPC
   or stream; otherwise a bounded scoped read from a known entry id; naive full-session polling is
   rejected outright. Record the measured cost of the chosen option.
2. **Observe application during the run.** Reconcile steering evidence while the run is alive, so
   `applied` is reached when it happens. Reuse `reconcileSteeringUserEntries` and keep its existing
   fail-closed guarantees: exact run authority, no duplicate claim of one Pi entry, evidence
   required for `applied`. Changing the status machine is out of scope; only the call timing changes.
3. **Make the status legible.** Distinguish admitted from delivered in the visible label and give
   the delivered state its own mark, worded per the truthfulness constraint. Keep every existing
   terminal label intact.
4. **Put the correction where the Navigator is looking.** Decide the placement explicitly and record
   the reasoning: render the correction with the live agent run it is correcting rather than under
   the distant prompt, and/or acknowledge it near the Composer at send time. The acceptance is
   behavioural — the Navigator must see the correction and its status without scrolling — not a
   particular layout.
5. **Keep provenance and reload intact.** The correction must remain attached to the turn it
   corrected, with its ordering by `sequence` preserved, and the Segment partition/recombination
   behaviour of CR114 unchanged.
6. **Validate.** Focused domain and component tests, then the full suite, type check, build, native
   tests and check, roadmap consistency and diff check. Dev homologation must cover: a correction
   during a long output, several corrections in one turn, a correction never consumed before
   cancellation, and a correction in a turn that completes.

### Files

Expected: `src/app/App.tsx` (the `done`-only reconciliation and whatever in-run cadence slice 1
selects), `src/app/SteeringMessages.tsx` (labels and the delivered mark),
`src/app/ConversationTranscript.tsx` and `src/app/conversationTranscriptModel.ts` (placement),
`src/styles/app.css`. Possibly `src/agent/piProcessStream.ts` and `src-tauri/src/main.rs` if slice 1
selects a bounded native read. `src/domain/steeringState.ts` is expected to change only if slice 1
proves it must; its status machine is deliberately not being redesigned.

Tests: `src/tests/steeringState.test.ts`, `src/tests/steeringMessages.test.tsx`, a new in-run
reconciliation test, a placement/visibility component test, and `src/tests/interruptedTurnIdentity.test.ts`
plus `src/tests/conversationSegmentProjection.test.ts` as regressions.

### Acceptance

- A correction that the model has received shows a delivered state while the run is still in
  progress, not only after the turn ends.
- The wording distinguishes admitted from delivered and claims nothing about the model having read
  or obeyed the correction.
- `applied` is still reached only with exact Pi user-entry evidence, one entry claimed once.
- A correction sent during a long output is visible to the Navigator, with its status, without
  scrolling to find it.
- The correction remains attached to the turn it corrected, ordered by `sequence`, after navigating
  away and back.
- Corrections that are rejected, unconsumed or cancelled keep their current terminal presentation.
- No measurable typing or streaming regression; the CR113 and CR114 cost properties are preserved.

### Exclusions

- No change to how a correction is delivered to the running agent, to cancellation semantics, or to
  the `SteeringStatus` terminal set.
- No writes to Pi JSONL and no reinterpretation of Pi as anything other than the authority.
- No full-session polling during a live run.
- No backfill of historical corrections, and no claim about corrections whose evidence was lost.
- Phase 1's bounded queues and repair guard are not revised.
- Planning assigns no Driver, chooses no Delivery and starts no implementation.

### Boundary with CR097

CR097 is `planned` and covers the same surface from the other side: whether a correction is still
*recognisable after reload*, which is a projection and identity question. Phase 2 here covers whether
a correction is *legible while it is live* — its status and its placement. They must not be
implemented blind to each other, because Phase 2 slice 4 decides where a correction is rendered and
CR097 decides what a restored correction is rendered as. Whichever lands first owns the placement
decision, and the other adopts it. Both depend on `piUserEntryId`, which Phase 2 makes populated
earlier and more often — a change that helps CR097 rather than conflicting with it.

## Dependencies

Directly continues [CR062](cr062-make-post-terminal-finalization-self-healing-and-actionable.md),
whose repair route is the one being blocked, and
[CR115](cr115-stop-the-idle-post-terminal-recovery-loop.md), whose loop any change to that route
must not reintroduce. It must preserve the authority boundaries established by
[CR057](../rs019-post-terminal-continuity/cr057-separate-native-terminalization-from-journey-occupancy.md),
[CR067](../rs020-convergent-turn-synchronization/cr067-unify-recovery-into-one-idempotent-convergence-routine.md),
[CR108](../rs021-ux-pre-beta-evolution/cr108-stop-one-unrecoverable-turn-from-blocking-recovery.md)
and [CR046](../rs018-terminal-aligned-conversation-continuity/cr046-make-the-conversation-surface-pi-backed.md).
