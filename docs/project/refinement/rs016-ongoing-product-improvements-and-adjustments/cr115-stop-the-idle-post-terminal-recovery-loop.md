[< RS016](index.md)

# CR115: Stop the Idle Post-Terminal Recovery Loop

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr113-rs016-cr115-typing-responsiveness`

Pulled on 2026-10-02 by explicit Navigator intent, immediately after capture. It shares CR113's
Delivery: both were found in the same homologation, both affect Composer responsiveness, and
neither can be homologated in isolation while the other is unfixed.

## Problem

In a ready, idle Journey the Desktop runs post-terminal recovery continuously. Each pass lists the
Mirror outbox, converges delivery, reconciles native Pi occupancy and reloads the turn journal, then
immediately triggers itself again. Nothing is wrong with the data; the pass finds nothing to do and
starts over.

The Navigator sees two symptoms. The Send button and the sidebar's New Journey button flicker,
because every pass walks occupancy through `reconciling`, which counts as blocking. Typing is slow,
because every pass performs several root state updates and each one re-renders the whole
application tree between keystrokes. The flicker was reported while homologating CR113 and
persists after CR113's Composer isolation, which is why the two defects are separate.

## Evidence

Measured on 2026-10-02 against `main` at `c00b551` with CR113 applied on its branch.

**The cycle, read from `App.tsx`.** The automatic recovery effect lists the outbox and calls
`recoverPostTerminalPersistence` whenever its dependencies change; those dependencies include
`piInvocationOccupancy.status`. `recoverPostTerminalPersistence` awaits
`turnFinalizationCoordinator.convergeDelivery` and then awaits `reconcilePiInvocationOccupancy`,
which moves occupancy to `reconciling` and back to `known`. Both transitions change the effect's
dependency; the second re-enters recovery with every guard satisfied, and the cycle repeats.

**The trailing reconcile is redundant.** The only mutation of native occupancy inside convergence is
`ports.cleanupLease`, which `App` binds to `releaseDurablePiInvocationLease`, and that function
already reconciles frontend occupancy itself after releasing the lease. `reconcileDeliveryDebt` only
reads the registry. When convergence settles nothing, native occupancy has not changed and there is
nothing to reconcile; when it releases a lease, the frontend state is already refreshed. Convergence
also emits `durable_evidence_changed` on every pass, and the existing subscription refreshes the
outbox list and journal evidence from that event, so the status re-trigger is not needed for
freshness either.

**Where it came from.** The reconcile entered in `a924e9c` (CR062, 2026-09-20) after a repair
routine that did not reconcile leases by itself. `0c1037b` (CR067) replaced that routine with the
convergence coordinator, whose lease cleanup is self-reconciling, and the trailing call survived as
residue. CR029 had restored typing responsiveness on 2026-09-13; the regression dates from one week
later.

**Production, idle, during this diagnosis.** The installed stable app, selected on `mirror-desktop`
with no turn running, sampled at 2-second intervals:

```text
cpu %   70.7  8.5  32.3  39.0  13.9  11.2  15.8  5.5  13.6
turn-journal/mirror-desktop.json  mtime unchanged (241,878 bytes, read each pass)
mirror-append-outbox.json         mtime unchanged
```

A read-and-render loop with no writes, consistent with the cycle above. This is a mechanism
diagnosis supported by idle CPU; the loop was not instrumented in the running app.

**Cost per pass.** At least eight root state updates: `setMirrorOutboxItems`,
`setIsRetryingMirrorCommit` twice, `setSyncLedgers` twice, `setPiInvocationOccupancy` twice,
`setExactSettlementErrors` and `setJourneyTurnJournalRecords`; plus five IPC calls including two
journal loads. CR113's measurement put one root re-render between 20 and 44 ms at the real tree's
size, so a handful of passes per second explains the typing lag on their own.

## Expected Behavior

A ready, idle Journey performs post-terminal recovery once per legitimate trigger: occupancy first
becoming known, Journey or Conversation change, reload, and a run finishing. It does not re-trigger
itself. Occupancy is still reconciled whenever native occupancy actually changes, which the
lease-release path already does. Send and New Journey do not flicker while nothing is happening,
and typing is not interrupted by background recovery.

## Proposed Scope

- Remove the trailing `await reconcilePiInvocationOccupancy()` from `recoverPostTerminalPersistence`,
  because lease cleanup reconciles on its own and a no-op pass has nothing to reconcile.
- Pin the contract in a source-text regression test: recovery must not reconcile occupancy after
  convergence, and the automatic recovery effect must not be able to re-enter through its own
  reconcile.
- Validate in an isolated build that the idle app settles after one recovery pass per trigger, that
  Send and New Journey hold steady, and that a Journey with real delivery debt still converges and
  releases its retained lease with the occupancy surface refreshed.

## Acceptance

- Selecting a ready Journey with no debt runs recovery once and the application then idles with no
  further outbox, journal or occupancy IPC until the next legitimate trigger.
- Send and New Journey do not change enabled state while idle.
- A retained finalizing lease released by convergence is reflected in the occupancy surface without
  a further manual action, exactly as today.
- Manual repair, run-finish reconcile, rejected-reservation rollback and lease release keep their
  existing reconcile calls.
- Pi JSONL, Mirror records, journal semantics, outbox semantics and run authority are unchanged.

## Exclusions

- No change to `convergeDelivery`, the coordinator, the occupancy domain functions or any Rust
  command.
- No change to the triggers of automatic recovery beyond removing its self-trigger.
- No selection, Driver assignment, Delivery branch, implementation, commit, push or release.

## Implementation Evidence

One line removed from `recoverPostTerminalPersistence` in `src/app/App.tsx`: the trailing
`await reconcilePiInvocationOccupancy()`. A comment records why it cannot return.

After the removal, no state a no-op recovery pass writes appears in the automatic recovery effect's
dependencies. The pass still sets `isRetryingMirrorCommit`, the synchronization ledger, exact
settlement errors and journal records, and convergence still emits `durable_evidence_changed`,
whose subscription refreshes the outbox and the journal. None of those are watched by the effect,
whose dependencies are the Conversation's Journey, whether it is loaded, the thread kind, occupancy
status and runtime busy. The self-trigger is therefore gone.

One bounded re-entry survives by design. When convergence actually releases a retained lease,
`cleanupLease` runs `releaseDurablePiInvocationLease`, which reconciles occupancy; that flips the
watched status and runs recovery once more. This is a real native change, not a no-op, and the
second pass finds nothing to release, so it terminates.

`src/tests/idleRecoveryLoop.test.ts` pins the contract: recovery converges without reconciling,
the trigger still watches occupancy, and the reconcile calls that answer a real native change —
lease release, finished run, rejected reservation — are all still present.

Nothing else changed. No coordinator, occupancy domain function, port, Rust command, recovery
trigger or recovery semantic was touched.

Gates: 215 test files and 1,485 front-end tests pass, `tsc --noEmit` clean, `npm run build`,
`cargo check --locked`, `npm run roadmap:check` READY and `git diff --check` all pass.

Not yet validated: idle behaviour in a running build. An isolated Eval build carrying this fix and
CR113 was produced for Navigator homologation.

## Acceptance (2026-10-02)

The Navigator accepted the rebuilt Eval carrying CR113 and CR115. In a ready, idle Journey the
Send button and sidebar New Journey control no longer flickered, and sustained typing was
responsive. This is the visible contract of an idle recovery path that settles rather than
re-triggering itself.

The validation did not claim an instrumented input-to-paint percentile or a new CPU benchmark; the
mechanism diagnosis and the existing automated gates remain the quantitative evidence. No
regression in delivery recovery, retained lease release, Pi JSONL, Mirror records, journal, outbox
or run authority was reported. CR115 is `done`.

## Dependencies

Found while homologating CR113 and independent of it in delivery. It touches code governed by
CR062 and CR067, whose recovery semantics it must preserve; the retained-lease path validated in
CR067's homologation is the scenario to re-exercise.
