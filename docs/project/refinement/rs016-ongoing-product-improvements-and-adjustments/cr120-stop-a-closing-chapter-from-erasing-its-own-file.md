[< RS016](index.md)

# CR120: Stop a Closing Chapter From Erasing Its Own File

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

In production Journey `mirror-desktop` on `v0.2.0-alpha.34`, chapter `segment-30` is closed and its
published file holds **zero messages**, while the manifest entry for it claims `turnCount: 13` and
the live durable ledger says that chapter contains 22 messages. The chapter is on disk, 592 KB of
it, and it is empty of conversation.

Every other closed chapter in that Journey holds its messages. Across all 31 chapter files there are
439 messages, in files from 228 KB to 6.8 MB. `segment-30` is the only one that lost its content.

This was found while verifying the `alpha.34` upgrade, not reported by the Navigator. Nothing visible
has failed yet.

## Evidence

Read-only inspection of the production store, 2026-10-04, with the application running
`0.2.0-alpha.34` (restarted 20:25:20).

- Manifest `generation-4.json`: 31 segments, `sourceEntryCount: 9112`, `segment-31` current.
- Durable ledger `generation-4.json`: 17 turns, 2,310 messages, 2.3 MB.
- Pi session: 9,208 entries, 58.7 MB — intact.
- Receipt: `currentSegmentId: segment-31`, `historicalMessageCount: 221`,
  `totalMessageCount: 230`, 31 projection hashes.
- Chapter files: 31, holding 439 messages, of which `segment-30.json` holds **0**.
- `segment-30.json` still carries 11 entries of `terminalAgentActionEvidence` and 11 reconciliation
  turns, which is what accounts for its 592 KB. Only `messages` is empty.

Two manifest facts matter:

- 28 closed segments carry **no `firstTurnId` at all**. That is a state an authorized manifest
  repair produced on 2026-10-03 and 2026-10-04, when anchors pointing at lost ledger history were
  removed rather than left dangling.
- `segment-29` (`turnCount: 3`) and `segment-30` (`turnCount: 13`) carry the **same**
  `firstTurnId`: `turn-agent-run-2026-10-03T21:40:01.665Z`. Two chapters are anchored to one turn.

## Mechanism

Replaying the shipped partition (`src/domain/conversationSegmentProjection.ts`) verbatim against the
real manifest and ledger gives `cut = 0` and all 31 segments offered:

| Segment | manifest `turnCount` | anchor | slice | messages |
|---|---:|---:|---|---:|
| segment-1 … segment-28 | 0 | `undefined` | `[0,0)` | 0 |
| segment-29 | 3 | 0 | `[0,0)` | 0 |
| segment-30 | 13 | 0 | `[0,11)` | **22** |
| segment-31 (current) | 2 | 11 | `[11,17)` | 12 |

Twenty-nine of thirty-one chapters are handed an empty slice on every settlement. **CR118's skip
rule is what keeps that harmless**, and it is load-bearing in production right now: for a `closed`
Segment with an existing file, zero supplied messages, and `was_prior_current` false, the publisher
returns `SkipPublished` and leaves the file alone.

The hole is the `was_prior_current` exception in `closed_segment_publication_decision`
(`src-tauri/src/main.rs:4647`):

```rust
if status != "closed" || !file_exists || was_prior_current {
    return ClosedSegmentPublication::Write;
}
```

At the moment `segment-30` closed, it *was* the prior current Segment, so the exception applied and
it was **written** — with whatever slice the partition produced at that instant, which was empty —
over a file that held its chapter. The exception exists so that the Segment that was current gets
its final write, and it has a deliberate test behind it,
`the_segment_that_was_current_is_written_even_when_it_closes_empty`. That test asserts exactly the
behaviour that caused this.

So the protection and the hole are the same decision seen from two sides: a closing chapter must be
written one last time, and that last write is the one write not checked for emptiness.

## What This Predicts

`segment-30` is no longer the prior current — the receipt now names `segment-31`. Its supplied slice
is non-empty (22 messages). So the next time it appears in a bundle, the decision is
`VerifyImmutable`, which byte-compares the file against the supplied payload
(`src-tauri/src/main.rs:4750-4754`). The file has zero messages and the payload has 22, so the bytes
differ and publication returns:

```text
Immutable Conversation Segment projection diverged.
```

A bundle includes closed Segments only when a compaction settles: `saveProjectedTurnLifecycle`
publishes `availableProjections` on `settledCompaction` and `availableProjections.slice(-1)`
otherwise. Therefore:

- Ordinary turns keep settling cleanly, because only the current Segment is published.
- **The next compaction in this Journey is predicted to fail settlement** with the divergence error.
- `Repair synchronization` reaches the partition through `convergeDelivery → saveProjection`, which
  is not the compaction path, so it would report success while leaving `segment-30` divergent — and
  the next compaction would fail again.

This is a prediction from the code and the stored bytes, not an observation. It has not happened.

## Recoverability

No conversation is unrecoverable. The Pi session holds all 9,208 entries, and the durable ledger
currently holds the 22 messages the chapter should contain. What is damaged is the published chapter
file, which is the artifact the chapter index reads.

## Provenance Correction

The first reading in this session was wrong and is recorded rather than quietly replaced. A quick
inspection script mapped a **missing** `firstTurnId` to `-1`, and concluded that 28 anchors were
unresolvable, that the pre-CR118 partition would have thrown, and that CR118's cut rule was
therefore doing active work in production. The shipped code distinguishes an **absent** anchor
(`undefined`, which inherits the next Segment's start) from a **present but unfindable** one (`-1`,
which cuts). Every one of the 28 is absent, so `lastUnresolvable` is `-1`, the cut is `0`, and the
pre-CR118 partition would **not** have thrown on this manifest.

The corrected standing of CR118 in production: its **cut** rule is not being exercised, and its
**skip** rule is, on 29 chapters per settlement. The closure's description of the work as defensive
remains accurate for the cut and is wrong for the skip.

## Open Questions

Capture only; nothing is selected and no decision is taken here.

- Should the `was_prior_current` exception be removed, or narrowed so that a Segment is written on
  closing only when the supplied projection is non-empty or no file exists yet? Narrowing looks
  closer to the intent, but the prior-current write also exists to settle the file that was being
  appended to live, and that purpose needs checking before it is traded away.
- Should the native manifest refresh be permitted to anchor two chapters to one turn? The shared
  anchor between `segment-29` and `segment-30` is what makes an empty slice reachable at all, and it
  sits in the refresh rule that CR118 deliberately treated as the authority it could not replace.
  That may belong to its own Change Request rather than this one.
- Does `segment-30` need a store repair before the next compaction, given that the content is still
  in the ledger? Any production manifest or projection repair requires explicit Navigator
  authorization naming the store, and the two previous repairs were symptom repairs whose cause kept
  running.
- Is the same shape present in other production Journeys? This was found in `mirror-desktop` only,
  and the other Journeys have not been inspected for it.

## Dependencies

Born inside CR118's scope, which is `done` and released in `v0.2.0-alpha.34`. Touches the manifest
refresh rule that CR114 introduced and CR118 declined to change. Independent of CR119.
