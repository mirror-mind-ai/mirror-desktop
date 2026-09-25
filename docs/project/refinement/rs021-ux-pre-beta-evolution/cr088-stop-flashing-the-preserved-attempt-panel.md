[< RS021](index.md)

# CR088: Stop Flashing the Preserved Attempt Panel

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr088-preserved-attempt-panel`

## Problem

Cancelling a turn and continuing briefly shows an actionable recovery panel titled
`Resolve the preserved attempt`, with the body `Choose one explicit operation. No recovery
action will run the agent again.` and recovery buttons. It disappears on its own without
any user action.

This is the same defect class CR086 treated for synchronization notices — a transient,
self-resolving state rendered as an alert that demands attention — but it is a different
surface with a different cause, and CR086's attention gate does not cover it. The Navigator
observed it in the Dev bundle on 2026-09-24 while running the CR087 cancel-then-send
scenario; the durable journal for that turn settled normally (`interrupted / cancelled`),
so nothing was actually wrong.

## Diagnosis

The panel renders when `showConversationRecoveryNotice` is true, which requires
`blockingTurnJournalRecord` to be set and `recoveryRoutes` to be non-empty. Those two
inputs are derived from occupancy evidence taken at two different points in time:

- `blockingTurnJournalRecord` is React state written by the async journal hydration effect
  in `src/app/App.tsx`. `findBlockingTurnJournalRecord` (`src/app/turnJournal.ts:107`)
  returns `undefined` unless an **active** native lease exists — `isActivePiInvocationLease`
  requires `terminalState === "open"` and a `reserved` or `running` lease phase.
- `recoveryRoutes` for a blocking turn require `exactRunInactive`
  (`decideConversationRecoveryRoutes`, `src/domain/conversationRecovery.ts:66`), which is
  `occupancy known && !selectedActiveNativeLease && !selectedRuntimeBusy`.

At any single instant these are mutually exclusive: one demands an active lease, the other
demands no active lease. The panel is therefore reachable only while the stored record is
stale relative to current occupancy — exactly the window after cancellation, when the lease
is released and the runtime stops being busy but the record has not yet been cleared by the
re-running effect or by `finalizeInterruptedTurn`.

A second question follows from the same reading and needs its own verification: if a
blocking record requires an active lease, the genuinely stranded case — a turn left in
`running` after a restart, with no lease at all — appears never to produce this panel, which
would make `recoverPreservedResponse` and `preserveAttemptAndContinue` unreachable in the
scenario they were designed for. That must be confirmed against real evidence before any
behavior is changed, because it decides whether the fix is "suppress the flicker" or
"repair the recovery route".

## Investigation (2026-09-24)

Read-only inspection of the code history, the Dev journals and the native recovery paths.

**The lease guard is deliberate, not an oversight.** `activeNativeRunId` was added to
`findBlockingTurnJournalRecord` by `21d2f75` for CR042 (RS018), *Decouple Successor
Admission from Desktop Projections*. Its test is named "surfaces a journal blocker only for
the exact active native run". CR042's contract is explicit: "Treat only an exact active or
still-finalizing native execution as Conversation occupancy. Treat terminal historical
records as non-blocking regardless of projection, Segment or Mirror state." So a blocking
record legitimately means one thing only: *the agent is still finishing the previous
message*. That is the routes-empty branch, and it is correct.

**The recovery-routes branch is vestigial.** `decideConversationRecoveryRoutes` returns
early unless `exactRunInactive`, which contradicts the precondition that produced the
record. The branch therefore predates CR042, when blocking records could exist without an
active lease. Today it is reachable only across time, while the stored record is stale.
The unreachability question raised at capture is answered: the routes are unreachable by
design of CR042, not by accident.

**The valuable case is already automatic.** `recoverPreservedResponse` exists for a turn
stranded at `terminal_durable / completed` with fresh Pi evidence. Native
`reconcile_pi_backed_mirror_delivery_debt` already selects exactly
`TerminalDurable | Projected | OutboxEnqueued` with outcome `Completed`, materializes the
outbox item and advances the journal. The Journey hydration effect in `App.tsx` calls
`recoverPostTerminalPersistence` unconditionally once occupancy is known and the runtime is
idle, so that path runs on every Journey load. The manual route duplicates work that
already happens without the Navigator.

**Stranded records are harmless today.** The Dev journals hold five non-terminal records
that have persisted for days: two `running` on `mirror-desktop` whose `threadId` no longer
matches the active thread, and three `terminal_durable / process_died` on
`us1-rerun-a-0831…` matching the active thread and generation. None of them blocks
admission, because CR042 moved admission to native occupancy, and none of them surfaces a
panel. `process_died` means the response never completed, so there is nothing to recover.

**Conclusion.** There is no missing recovery capability to restore. There is one defect: a
stale copy of occupancy evidence lets a contradictory state render as an actionable alert.

## Expected Behavior

Ordinary cancellation is quiet. No recovery panel appears for a turn that is settling
normally. A turn that genuinely needs an explicit decision still gets one, with its routes
available.

## Proposed Scope

1. Derive the blocking record in-render from the already-hydrated
   `journeyTurnJournalRecords` and the current lease, instead of holding it as independently
   aged React state. Both inputs then come from one render and the contradictory window
   cannot exist.
2. Delete the blocking branch of `decideConversationRecoveryRoutes` together with the
   `recover_preserved_response` and `preserve_attempt_and_continue` routes and the handlers
   that only they reach, once step 1 proves them unreachable. Keep the routes-empty status
   ("The agent is still finishing the previous message"), which is the branch CR042 intended.
3. Keep every authority check fail-closed and change no cancellation, lease or journal
   semantics.
4. Extend the CR064 contract with a cancel-then-continue scene asserting that no recovery
   panel appears at any point, and a scene with a stranded `terminal_durable / completed`
   record asserting that automatic reconciliation settles it with no panel and no Navigator
   action.

If step 1 turns out to leave any reachable path into the blocking branch, step 2 is dropped
and the branch is repaired instead of deleted. Evidence decides, not this document.

## Acceptance

- Cancelling a turn and continuing shows no recovery panel at any point.
- A turn stranded at `terminal_durable / completed` is still recovered automatically, with
  its response projected and delivered, without any panel.
- While the exact native run is still finishing, the existing status still appears.
- No recovery action runs the agent again; authority checks remain fail-closed.
- The contract encodes both scenes.

## Exclusions

- No change to Pi JSONL, the turn journal schema, the outbox or Mirror Core.
- No change to cancellation semantics or native lease lifecycle.
- No automatic resolution of a turn that genuinely needs an explicit decision.

## Dependencies

Independent of CR086 and CR087, which are closed. It completes the same theme: no transient
internal state may present itself as an alert demanding Navigator attention.

## Implementation Evidence (2026-09-24)

Delivered on `refinement/rs021-cr088-preserved-attempt-panel` in two commits, the second
gated on the proof produced by the first.

**Slice 1 — one coherent snapshot.** New `src/app/blockingTurnPresentation.ts` derives the
blocking record from the already-hydrated `journeyTurnJournalRecords` and the current lease.
`App.tsx` consumes it through a `useMemo`; the `blockingTurnJournalRecord` state and every
setter are gone, including the frontier-event and post-interruption clears, which are now
consequences of refreshing journal evidence. `findBlockingTurnJournalRecord` accepts
`Pick<TurnJournalDocument, "records">` so the derivation needs no synthetic document.

`src/tests/blockingTurnPresentation.test.ts` enumerates phase x outcome x lease x evidence x
synchronization state and asserts, for every input producing a blocking record, that the
lease was the exact active run and that no recovery route is offered. That is the proof the
second slice depended on.

**Slice 2 — remove the vestigial branch.** `decideConversationRecoveryRoutes` now takes
`blockingTurnActive: boolean` and returns no routes while it holds, which preserves the
previous early-return semantics so Mirror debt cannot reach a route through the
fall-through. Deleted: the blocking branch, the `recover_preserved_response` and
`preserve_attempt_and_continue` routes, the `BlockingTurnRecoveryEvidence` type, the three
handlers only those routes reached (`recoverPreservedResponse`,
`markBlockingTurnInterrupted`, `interruptInactiveTurnRecord`), their dispatch branches, the
dead blocking titles in the recovery panel, and the unreachable
`interruptInactiveTurnJournal` bridge. Net 346 deletions against 88 insertions.

The native `interrupt_inactive_turn_journal` command stays registered as a durable
capability, with a comment at the removed bridge recording how to re-expose it.

**Contract.** The CR064 world models the native lease and a cancellation, including the
exact window where the lease is released before the journal advances, and asserts
`recoveryPanelVisible` is false at every step and after the next clean turn. The genuine
debt scene asserts the same flag is true, so its absence elsewhere is meaningful rather
than vacuous. The stranded `terminal_durable / completed` case is not duplicated in the
TypeScript world, which does not model native materialization; it is covered where it is
real, by the Rust test `materializes_self_contained_delivery_debt_from_exact_pi_entries`.

## Validation

- `npm test`: 172 files, 1024 tests green.
- `cargo test --locked`: 188 passed, 3 ignored.
- `npm run build` green; `npm run roadmap:check` READY; `git diff --check` clean.

## Homologation (2026-09-25)

Navigator relaunched `/Applications/Mirror Desktop Dev.app` on the fixed bundle, cancelled a
turn mid-response and continued. No panel appeared at any point. Accepted.

## Closure

Closed on 2026-09-25 with explicit Navigator validation.

Proportionality review: proportional. One pure derivation replaced an independently aged
copy of occupancy evidence, and the branch it proved unreachable was removed with the
handlers only it reached — 346 deletions against 88 insertions, no durable schema, native
command or Mirror Core change.

Debt review: `no_action`. The native `interrupt_inactive_turn_journal` command remains
registered without a frontend caller, recorded at the removed bridge. Integration, push and
release remain separate Navigator decisions.

## Evidence

- Navigator report, 2026-09-24, Dev bundle `0.2.0-alpha.18`: panel titled
  `Resolve the preserved attempt` appeared transiently after cancelling a turn.
- Dev turn journal `mirror-desktop`: the turn created at `2026-09-24T16:30:03.115Z` reached
  `interrupted / cancelled` with `recoveryDisposition: interrupted`, and the next turn
  settled normally — no durable problem existed.
- `src/app/turnJournal.ts:107`, `src/app/piInvocationOccupancy.ts:275`,
  `src/domain/conversationRecovery.ts:66` and the hydration effect in `src/app/App.tsx`.
