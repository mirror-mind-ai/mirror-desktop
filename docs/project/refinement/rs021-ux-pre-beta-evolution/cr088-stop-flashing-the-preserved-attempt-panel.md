[< RS021](index.md)

# CR088: Stop Flashing the Preserved Attempt Panel

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Expected Behavior

Ordinary cancellation is quiet. No recovery panel appears for a turn that is settling
normally. A turn that genuinely needs an explicit decision still gets one, with its routes
available.

## Proposed Scope

- Confirm or refute the unreachability finding above with a real stranded-turn scenario.
- Derive the blocking condition and occupancy from one consistent snapshot instead of
  holding an independently-aged copy, so the inconsistent window cannot exist. Deriving the
  blocking record from the already-hydrated `journeyTurnJournalRecords` in the same render
  is the candidate shape.
- If the recovery route is genuinely unreachable, restate the condition so it matches the
  stranded case it was written for, keeping every authority check fail-closed.
- Extend the CR064 contract with a cancel-then-continue scene asserting no recovery panel,
  plus a stranded-turn scene asserting the panel and its routes do appear.

## Acceptance

- Cancelling a turn and continuing shows no recovery panel at any point.
- A genuinely stranded turn still surfaces the panel with working routes.
- No recovery action runs the agent again; authority checks remain fail-closed.
- The contract encodes both scenes.

## Exclusions

- No change to Pi JSONL, the turn journal schema, the outbox or Mirror Core.
- No change to cancellation semantics or native lease lifecycle.
- No automatic resolution of a turn that genuinely needs an explicit decision.

## Dependencies

Independent of CR086 and CR087, which are closed. It completes the same theme: no transient
internal state may present itself as an alert demanding Navigator attention.

## Evidence

- Navigator report, 2026-09-24, Dev bundle `0.2.0-alpha.18`: panel titled
  `Resolve the preserved attempt` appeared transiently after cancelling a turn.
- Dev turn journal `mirror-desktop`: the turn created at `2026-09-24T16:30:03.115Z` reached
  `interrupted / cancelled` with `recoveryDisposition: interrupted`, and the next turn
  settled normally — no durable problem existed.
- `src/app/turnJournal.ts:107`, `src/app/piInvocationOccupancy.ts:275`,
  `src/domain/conversationRecovery.ts:66` and the hydration effect in `src/app/App.tsx`.
