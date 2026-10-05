[< RS016](index.md)

# CR121: Name the Settlement That Fails Before Recovery Saves It

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr121-settlement-failure-legibility`

## Problem

Every settlement timing record written since `v0.2.0-alpha.34` shipped reports `outcome: failed`, in
three different production Journeys. The turns themselves complete: the journal reaches `settled`
with outcome `completed`, and Mirror delivery reaches `committed`. Something fails first and
something else finishes the work.

That means the first finalization attempt of a turn is failing as a matter of routine, recovery is
quietly completing it, and nothing surfaces either fact. The Navigator sees only a long `Finishing`.

This was found on the first production reading of the CR119 instrument, hours after it shipped. It
was not reported, and it is not what CR119 expected to find.

## Evidence

Read-only inspection of the production store, 2026-10-04, application on `0.2.0-alpha.34`.

Every record present, across every Journey that has settled a turn on this version:

| Journey | records | outcome | total | slowest phase |
|---|---:|---|---:|---|
| `mirror-desktop` | 1 | failed | 1,114 ms | `save_projection` 557 ms |
| `alissonvale-com` | 2 | failed, failed | 346 ms, 1,992 ms | `save_projection` 243 ms / 989 ms |
| `livro-lideranca-soberana` | 1 | failed | 1,258 ms | `save_projection` 1,019 ms |

For the `mirror-desktop` record, run `agent-run-2026-10-04T23:25:58.759Z`, the phases in the order
they began, with every one reporting `completed`:

| phase | depth | elapsed | outcome |
|---|---:|---:|---|
| `load_journal` | 0 | 122 ms | completed |
| `load_active_evidence` | 0 | 132 ms | completed |
| `save_projection` | 0 | 557 ms | completed |
| `save_durable_projection` | 1 | 279 ms | completed |
| `load_segments` | 1 | 137 ms | completed |
| `publish_segments` | 1 | 140 ms | completed |
| `load_active_evidence` | 0 | 159 ms | completed |
| `cleanup_lease` | 0 | 143 ms | completed |

The record ends there. `enqueue_outbox_item`, `advance_journal`, `deliver_outbox_item`,
`load_persisted_projection`, `save_post_frontier_projection` and `acknowledge_outbox_item` never
registered at all.

**The turn nevertheless completed.** The journal records that run as `settled`, revision 5, outcome
`completed`, with a Finishing window of 44.6 s. The durable ledger records its Mirror delivery as
`state: committed`, `committedAt: 2026-10-04T23:32:44.719Z` — **42 seconds after** the timing record
was finished at `23:32:02.784Z`. So the first attempt failed in 1.1 s and the delivery was completed
42 seconds later by a different path.

Recent Finishing windows for this Journey on `alpha.34`: 467.3 s, 227.9 s, 85.6 s, 44.6 s.

## Narrowed: the cause is known, the instrument gap is not closed

**Updated 2026-10-05, after CR122.** This CR was captured as two things at once: an investigation
into *why* settlement fails, and a complaint that the instrument could not say. The first half is
answered and belongs to another CR; only the second half remains here.

[CR122](cr122-make-the-checkpoint-count-the-same-thing-every-turn.md) found the throw. The harness
checkpoint recorded the loaded surface's length, which CR114 made scope-dependent, so a bounded
commit after a complete one was refused as a `checkpoint_regression`; the refusal returned without
recording the turn's harness evidence; and `createMirrorAppendOutboxItem` throws
`mirror_append_item_authority_invalid` on exactly a pending harness body. That is candidate two of
the three listed below, confirmed. Eight of the fourteen `failed` timing records in the store sit on
turns in that state, 24 such turns existed by the time the fix was written, and two Journeys had
their Composer blocked by it.

**What stays in CR121**, unchanged in substance:

- The timing record does not carry the error. The app already receives it and discards it from the
  measurement. One field would have named CR122 immediately instead of requiring four artifacts and a
  database cross-reference.
- Steps 7 and 8 of the settlement sequence are untimed, and they are the only untimed steps on the
  path. The blind spot sat precisely where the failure was.
- A settlement that only succeeds on recovery is indistinguishable from slow work on the surface,
  which is the complaint CR119 was opened for.
- `emit` carrying a synchronous subscriber's throw into settlement remains a latent hazard in its own
  right, untouched by CR122.

**What leaves CR121:** identifying the cause, and the hypothesis that it explains CR119's Finishing
tail. The cause is CR122's. Whether it accounts for the tail is now answerable by measurement rather
than argument, and belongs to CR119's slice 4 re-reading after CR122 ships.

The analysis below is kept as written at capture, because it is the reasoning that localised the
throw to the right two lines before the cause was known.

## Where the Throw Is

The sequence in `executeCompletedSettlement` (`src/app/journeySettlement.ts:136-153`) is exact:

1. `loadActiveEvidence` → recorded, completed
2. `validatePreFrontierSettlement` — not a port, untimed
3. `saveActiveProjection` → recorded, completed
4. `loadActiveEvidence` → recorded, completed
5. `validatePreFrontierSettlement` — untimed
6. `cleanupLocalLease()` → `cleanupLease` recorded completed, then `onLeaseReleased?.()` untimed
7. `enqueueOutbox` → `createMirrorAppendOutboxItem(...)` untimed, then `enqueueOutboxItem` recorded

`cleanup_lease` completed and `enqueue_outbox_item` never began, so the throw is in the untimed code
between them. Three candidates, none yet eliminated:

- **`onLeaseReleased` → `publish(...)` → `emit(...)`.** `upgradeMirrorCommitments` is pure and
  returns its candidate rather than throwing on mismatch, so the risk is a listener: `emit` calls
  every subscriber synchronously and a throwing subscriber would propagate into the settlement.
- **`createMirrorAppendOutboxItem(projection, authority)`**, which runs before the port it feeds.
  **Confirmed by CR122.** It throws `mirror_append_item_authority_invalid` when the turn's harness
  body is not committed, which is the state a refused checkpoint comparison left behind.
- **The `journeyPersistenceCoordinator.run(..., "pre_frontier", ...)` wrapper** around
  `enqueueProjectionOutbox`.

A contextual clue, not a conclusion: `mirror-desktop`'s reconciliation is
`classification: "conflicted"` with `reasonCodes: ["native_id_mismatch", "checkpoint_regression"]`,
and its checkpoints disagree sharply — harness `messageCount` 2,310 against Mirror's 658. A
checkpoint regression is the kind of state that could make building or validating an append item
fail. But `alissonvale-com` and `livro-lideranca-soberana` show the same failure, and their
reconciliation state has not been inspected, so a single shared cause is not established.

**This clue was the answer.** It was recorded as contextual because it had not been established,
which was the right call at the time; CR122 established it, and it is one shared cause across all
three Journeys. Worth keeping visible: the correct reading was present at capture and was
deliberately not promoted to a conclusion without evidence.

## What This Says About CR119

**CR119's instrument has a blind spot exactly where the failure lives.** It times ports. A throw in
pure code between two ports is invisible to it, which is why the record can report `failed` while
every phase it contains reports `completed`.

**The record does not carry the error.** The one field that would have named this immediately is
missing. The app already receives the error, passes it to `setExactSettlementError` and
`recordSyncFailureOrDeferral`, and then discards it from the measurement.

**It may be the answer to CR119's open question.** CR119 established that Finishing duration tracks
conversation size between Journeys and not at all within one, where it swings from seconds to thirty
minutes with no relationship to anything recorded. A routine first-attempt failure followed by a
recovery cycle is a mechanism of exactly that shape: episodic, and indifferent to how much work there
was. This is a hypothesis that the evidence here makes plausible and does not establish. Four earlier
candidates were eliminated by refusing to accept a convincing story, and this one deserves the same
treatment.

## What Is Not Wrong

No conversation is lost and no delivery is dropped. Recovery is doing its job: the journal settles,
Mirror commits, and the outbox drains. The defect is that a routine failure is routine, invisible,
and paid for in waiting.

## Open Questions

Capture only. Nothing is selected and no decision is taken here.

- ~~Which of the three untimed candidates throws, and with what message?~~ Answered by CR122:
  `createMirrorAppendOutboxItem`, with `mirror_append_item_authority_invalid`.
- ~~Is it one cause across the three Journeys, or three?~~ One, established by CR122.
- Should the timing record carry the failure reason? The question survives its first answer: it took
  four artifacts and a database cross-reference to name a throw the app already held in a variable.
- Does the recovery path's cost account for the Finishing tail CR119 measured? Now a measurement
  rather than an argument, once the record names the failure and covers the recovery attempt too.
- Should a settlement that only succeeds on recovery be visible to the Navigator at all? It currently
  looks identical to slow work, which is the complaint CR119 was opened for.
- Is `emit` being allowed to carry a subscriber's throw into settlement a defect in its own right,
  independent of which subscriber it was? CR122 did not touch this.

## Plan (2026-10-05)

Pulled after `alpha.35`, because the gap it describes cost two full investigations in one day:
CR122's throw and CR123's publication failure were both named by cross-referencing four artifacts to
recover an error string the application already held in a variable and discarded.

### A correction to the capture's own plan

The capture proposed "time steps 7 and 8". That is the wrong framing and would have produced a
misleading instrument. Both steps are **synchronous and pure**: `createMirrorAppendOutboxItem` builds
an object from data already in memory, and `onLeaseReleased` publishes a presentation. Neither can be
slow, so recording a duration for them would add two phases that explain nothing and invite a reader
to treat them as costs.

What is actually missing is **attribution**: a throw inside them lands between two timed phases, so
the record shows every phase `completed` and the whole settlement `failed`. Wrapping them in named
phases fixes that, and the comment at each call site says attribution rather than duration so the
next reader does not misread it.

### Slice 1 — the record carries the failure

`SettlementTimingRecord` gains an optional `failure`:

| field | meaning |
|---|---|
| `reason` | the error as the application received it, bounded |
| `phase` | the innermost phase that failed, when the throw happened inside one |
| `afterPhase` | the last phase that completed, when the throw happened between phases |

`phase` and `afterPhase` are derived by the collector from its own phase list rather than supplied,
so a caller cannot describe a failure that disagrees with the phases recorded alongside it. Only
`reason` crosses the boundary, from the `catch` in `App.tsx` that already computes it for
`setExactSettlementError`.

**The reason is truncated, and that is a deliberate departure from CR119's rule.** CR119 refuses an
oversized diagnostic rather than trimming it, because a trimmed *measurement* reads as a true one. A
trimmed *message* does not: it is still the beginning of the right error, and a visible ellipsis says
it was cut. Bound: 512 characters.

No native change is required. `append_settlement_timing_record` validates `journeyId`, a non-empty
`runId`, `phases` being an array, and the size ceiling; it is deliberately permissive about
additional fields, so an older build reading a newer record ignores `failure` rather than refusing
it.

### Slice 2 — name the two steps that are not ports

`TurnFinalizationPorts` gains an optional `timeStep`, supplied by `timeFinalizationPorts` from the
registry and absent in tests that do not care:

- `create_outbox_item` wraps `createMirrorAppendOutboxItem` in `enqueueProjectionOutbox`
  (`turnFinalizationCoordinator.ts:169`) — the step CR122 proved throws.
- `notify_lease_released` wraps `onLeaseReleased` in `cleanupLocalLease`
  (`journeySettlement.ts:133`) — where a synchronous subscriber's throw would enter settlement.

An optional port member is the existing injection seam, so the settlement path does not acquire a
dependency on the diagnostic, and `executeCompletedSettlement` keeps working unchanged when nothing
is injected.

### Exclusions

**No surface for a recovery-only settlement.** The capture asks whether a settlement that only
succeeds through recovery should look different from slow work. It should, and it is deliberately not
built here: CR120 and CR123 are both live and both change the failure rate, so a surface designed
against today's failures would be designed against a moving target. Recorded as the recommended next
CR once the failure reasons have been read for some days.

**`emit` is not isolated from a throwing subscriber.** Slice 2 makes such a throw attributable, which
is this CR's job. Whether a presentation subscriber should be able to fail a settlement at all is a
separate design question and stays as debt.

**Recovery settlements remain unmeasured.** `recoverPostTerminalPersistence` does not open a
collector, which is why CR123's turn settled two seconds later with no record. Measuring the recovery
path is a larger change and is not needed to read a first-attempt failure.

### Files

- `src/app/settlementPhaseTiming.ts` — `SettlementFailure`, `SettlementTimingRecord.failure`,
  `finish`, `SettlementTimingRegistry.end`, `timeFinalizationPorts`, the reason bound
- `src/app/turnFinalizationCoordinator.ts` — `TurnFinalizationPorts.timeStep`,
  `enqueueProjectionOutbox`, the `onLeaseReleased` dependency
- `src/app/journeySettlement.ts` — time the `onLeaseReleased` call
- `src/app/App.tsx` — pass the error the `catch` already has into `end`
- `src/tests/settlementPhaseTiming.test.ts` and a new
  `src/tests/settlementFailureLegibility.test.ts`

### Acceptance

- A settlement that throws inside a timed phase records `failure.reason` and `failure.phase` naming
  that phase, and the phase itself still reports `outcome: "failed"`.
- A settlement that throws between phases records `failure.reason` and `failure.afterPhase` naming
  the last completed phase, with no phase reporting `failed`.
- A settled turn records no `failure` at all, and its record is byte-identical in shape to what
  `alpha.35` wrote.
- A reason longer than the bound is truncated with a visible marker rather than dropped or refused.
- The two non-port steps appear as named phases, and a throw in either is attributed to it.
- Replaying CR122's shape produces `failure.phase: "create_outbox_item"`; replaying CR123's shape
  produces `failure.phase: "publish_segments"` with the receipt message.

### Validation

- Unit: the collector's derivation of `phase` and `afterPhase`; the bound; a settled record carrying
  no failure.
- Guard: a source assertion that `end` is called with the caught error, so the reason cannot be
  dropped again by a refactor.
- Field: the next ordinary failure in production should name itself without any cross-referencing.
  `livro-lideranca-soberana` fails deterministically on every turn, so the first turn after the next
  release is the test.

## Implementation and closure (2026-10-05)

Implemented test-first on `refinement/rs016-cr121-settlement-failure-legibility`.

**Slice 1 — the record names its cause.** `SettlementTimingRecord` carries an optional `failure`
with `reason`, and exactly one of `phase` or `afterPhase`. Both are derived inside the collector from
the phases recorded beside them, so a caller cannot describe a failure that contradicts its own
measurements; only the error string crosses the boundary, from the `catch` in `App.tsx` that already
computed it for `setExactSettlementError` and used to drop it. The innermost failed phase is selected
by searching the phase list from the end, because an outer phase finishes after the inner one it was
propagating from.

**Slice 2 — the two steps that are not ports now have names.** `TurnFinalizationPorts.timeStep` is
optional and supplied by `timeFinalizationPorts`, so the settlement path acquired no dependency on
the diagnostic and `executeCompletedSettlement` behaves exactly as before when nothing is injected.
`create_outbox_item` wraps `createMirrorAppendOutboxItem`; `notify_lease_released` wraps the frontier
publish. Each call site says *attribution, not duration* in a comment, because both steps are
synchronous and a reader would otherwise take the numbers for costs.

**No native change, and that claim is now defended.** `append_settlement_timing_record` validates the
Journey, a non-empty run, `phases` being an array, and the size ceiling, and is permissive about
fields it does not know — which is what lets an older build read a newer record instead of refusing
it. A Rust test asserts that permissiveness so a later tightening has to be deliberate.

**One existing guard was strengthened, not relaxed.** `runtimeProjectionComponent.test.tsx` anchored
the exact source of the `onLeaseReleased` line. It now asserts both that the frontier publish still
happens there *and* that it is wrapped in the named step, so it covers more than it did before.

**Gates:** `tsc` clean, **230 test files / 1,647 tests**, `cargo test` **251 passed / 3 ignored**,
`cargo check --locked`, build clean, roadmap READY.

### The boundary

**No live run stands behind this, and the field test is unusually cheap.** The record shape is
verified by nine unit tests that replay CR122's and CR123's exact shapes, but no settlement has
produced a `failure` on a real machine. What makes this closable is that
`livro-lideranca-soberana` fails **deterministically on every ordinary turn** with the CR123 defect,
so the first turn there after the next release must write
`failure.phase: "publish_segments"` and `failure.reason:
"Conversation Segment completion receipt is unavailable."`. If it does not, this closure was wrong.
That reading is owed, exactly as CR122's was.

**Proportionality review: proportional.** One optional field on a diagnostic record, one optional
port member, two call sites wrapped, and an error passed to a function that was already being called.
No new artifact, no native change, no schema migration, and nothing added to the per-event path. The
largest single act of judgement was deleting a slice the capture asked for.

**Debt review: follow_up.** Five items, none selected.

The **field reading** above is first and is owed at the next release.

**A recovery-only settlement still writes no record at all.** `recoverPostTerminalPersistence` does
not open a collector, which is why CR123's turn settled two seconds after its failure with nothing
recorded. The instrument therefore measures first attempts only, and a reader counting records will
undercount settlements. This is the largest remaining gap and is bigger than this CR.

**No surface distinguishes a recovered settlement from slow work.** Deliberately excluded: CR120 and
CR123 are both live and both change the failure rate, so a surface built now would be built against
a moving target. Recommended as its own CR once the reasons have been read for some days.

**`emit` can still carry a subscriber's throw into settlement.** Slice 2 makes such a throw legible;
it does not prevent it. Whether a presentation subscriber should be able to fail a settlement is a
design question left open.

**This module now holds two opposite rules about diagnostic size.** CR119 refuses an oversized
measurement rather than trimming it; CR121 trims an oversized message rather than refusing it. Both
are justified and both are documented at the point of decision, but a third rule in the same file
would be a sign the module is accumulating policy rather than expressing one.

## Dependencies

Found by CR119's instrument and names a gap in it, so the two are coupled. Independent of CR120,
which concerns chapter files rather than the settlement sequence, though both were found in the same
production verification.

**Superseded in part by CR122**, which owns the cause. CR121 is now an instrument CR: carry the
error, time the two remaining untimed steps, and decide whether a recovery-only settlement should be
visible to the Navigator. It no longer blocks on identifying anything.
