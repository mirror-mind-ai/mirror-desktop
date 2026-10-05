[< RS016](index.md)

# CR121: Name the Settlement That Fails Before Recovery Saves It

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Dependencies

Found by CR119's instrument and names a gap in it, so the two are coupled. Independent of CR120,
which concerns chapter files rather than the settlement sequence, though both were found in the same
production verification.

**Superseded in part by CR122**, which owns the cause. CR121 is now an instrument CR: carry the
error, time the two remaining untimed steps, and decide whether a recovery-only settlement should be
visible to the Navigator. It no longer blocks on identifying anything.
