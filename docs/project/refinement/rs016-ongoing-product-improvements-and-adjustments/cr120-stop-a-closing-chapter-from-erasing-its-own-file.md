[< RS016](index.md)

# CR120: Stop a Closing Chapter From Erasing Its Own File

**Status:** planned
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr120-closing-chapter-write-guard`

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

## Diagnosis (2026-10-04)

**The write instant is confirmed by the filesystem, not inferred.** `segment-30.json` was last
written at `19:36:03` local, to the second the same time the manifest was rewritten, and the manifest
records `segment-30` closing at `22:36:02Z`. That is the compaction instant. Its neighbour
`segment-29.json` was last written the previous day and is 6.9 MB. So the empty file is not a slow
drift: the chapter was overwritten at the exact moment it closed, by the publication that the
compaction triggered.

**The upstream cause is structural, not corruption.** The native refresh assigns `firstTurnId` from
the first turn whose user *or* assistant entry falls inside the chapter's
`[sourceFromEntryId, sourceThroughEntryId]` range (`src-tauri/src/main.rs:4478-4492`). A compaction's
retained tail is deliberately shared between the chapter that closes and the chapter that opens, so
one turn can legitimately be the first included turn of two adjacent chapters. Nothing in that loop
requires anchors to be distinct.

**The shape is widespread; the damage is not.** Six production Journey generations already carry a
shared anchor — `alissonvale-com` generation 1, `flip-podcast` generation 3 (three chapters on one
turn), `flip-website` generation 1, `mirror-desktop` generations 1 and 4, `venda-de-livros`
generation 2. Only `mirror-desktop` generation 4 has materialised an empty closed chapter file. The
exposure is therefore latent in several Journeys and realised in one.

**Why the shared anchor becomes an empty slice.** The partition assigns each Segment the turn range
`[start(i), start(i+1))`. When two adjacent Segments resolve to the same start, the earlier one gets
a zero-length range. In `mirror-desktop` generation 4 that is `segment-29`, and 28 further chapters
with no anchor at all inherit a start from the right and also yield empty ranges. Twenty-nine of
thirty-one chapters are handed an empty slice on every settlement.

**CR118's skip rule is what keeps that harmless, and it is load-bearing in production.** For a closed
Segment with an existing file and zero supplied messages, the publisher returns `SkipPublished`. That
is not defensive work; it runs twenty-nine times per settlement of this Journey.

**The hole is one misordered condition.** In `closed_segment_publication_decision`
(`src-tauri/src/main.rs:4647`), `was_prior_current` is tested *before* the emptiness check:

```rust
if status != "closed" || !file_exists || was_prior_current {
    return ClosedSegmentPublication::Write;
}
if message_count == 0 {
    return ClosedSegmentPublication::SkipPublished;
}
```

A chapter that is closing is always written, and that is the one write never checked for emptiness.
The exception has a real purpose: while a chapter is current its file is being appended to, so on
closing its final state must be written and must not be compared for immutability against its own
stale bytes. That purpose only needs the *non-empty* case. The test
`the_segment_that_was_current_is_written_even_when_it_closes_empty` asserts the behaviour that caused
this, so the fix must change a test that currently passes, deliberately and with its reason recorded.

**The divergence this leaves behind.** `segment-30` is no longer the prior current — the receipt
names `segment-31` — and its supplied slice now holds 22 messages. So the next time it enters a
bundle the decision is `VerifyImmutable`, which byte-compares file against payload
(`src-tauri/src/main.rs:4750-4754`). Zero messages against twenty-two cannot match. Closed chapters
enter a bundle only when a compaction settles, so ordinary turns keep publishing only the current
chapter and keep succeeding, and **the next compaction in this Journey is predicted to fail
settlement**. Fixing the write rule alone does not clear that: the empty file would still diverge.

## Plan

**Slice 1 — move one condition, and rewrite the test that defended it.** Test-first. Reorder
`closed_segment_publication_decision` so emptiness is judged before the prior-current exemption:

```rust
if status != "closed" || !file_exists { return Write; }
if message_count == 0 { return SkipPublished; }
if was_prior_current { return Write; }
VerifyImmutable
```

Every other outcome is unchanged, which the existing cases must keep proving: a current Segment is
always written, a closed Segment with no file is written, a closing chapter supplied non-empty is
written over its stale file, and a closed Segment supplied non-empty with a published file is
verified. `the_segment_that_was_current_is_written_even_when_it_closes_empty` is replaced by a case
asserting the opposite for the empty half, carrying the reason in its name and a comment.

**Slice 2 — let an empty published chapter be healed rather than defended.** In the
`VerifyImmutable` branch the publisher already reads the file. When those bytes parse to a chapter
with zero messages and the supplied projection has messages, write instead of failing. An empty
published file is not history worth protecting; it is the damage. This is the exact converse of
CR118's rule, which made an empty *projection* defer to the file that still holds the chapter.

That makes the existing divergence self-clearing: at the next compaction after this ships,
`segment-30` is supplied with its 22 messages, its file is found empty, and it is rewritten. No
manual store repair is required, and the healing path is the system's own publication rather than a
script.

**No new read cost.** The emptiness of the published file is only consulted inside the branch that
already reads it. The twenty-nine skipped chapters are still skipped without opening their files, so
a settlement does not start reading a hundred megabytes to make this decision.

**Slice 3 — a regression test at the shape that produced this.** A manifest where two adjacent
Segments share one `firstTurnId`, partitioned against a real-shaped ledger, must yield an empty slice
for the earlier chapter and must not cause its published file to be overwritten. This pins the
end-to-end behaviour rather than only the decision function, which is the gap that let CR118 ship
with a correct domain rule and a wrong wiring.

## Files

- `src-tauri/src/main.rs` — the decision function, the verify branch, and their tests.
- `src/tests/segmentAnchorTolerance.test.ts` — the shared-anchor partition case.
- This document, the RS016 index, the canonical index, the Canvas.

## Acceptance

- A closed chapter supplied empty over an existing file is never written, including when it was the
  prior current Segment.
- A closing chapter supplied non-empty is still written over its stale file.
- A closed chapter whose published file holds zero messages is rewritten when the supplied projection
  has messages, instead of failing publication.
- A closed chapter whose published file holds messages still fails publication when the supplied
  bytes differ.
- Chapters skipped as already published are still skipped without their files being read.
- Two adjacent Segments sharing one anchor yield an empty slice for the earlier one, and that does
  not erase its file.
- Existing frontend and native suites stay green.

## Validation

- Test-level: every acceptance line has a test, red before its slice.
- Dev: Dev's manifests are small and do not carry the shared-anchor shape, so Dev can prove the
  decision table and the suite, not the production condition.
- Production, after release: the next compaction in `mirror-desktop` is the real validation. It is
  predicted to fail before this ships and to heal `segment-30` after it.

## Exclusions

- **No change to the native refresh rule.** Making `firstTurnId` injective would alter manifest
  generation for every Journey, and six generations already carry shared anchors that a new rule
  would have to be reconciled against. Recommended as its own Change Request.
- No change to the immutability guarantee for a published chapter that actually holds messages.
- No recomputation of `historicalMessageCount` when a bundle skips published chapters. The receipt
  stays conservative by design, which is pre-existing and not data loss.
- No manual production store repair inside this CR. If a compaction is reached before this ships,
  that becomes a separate authorized decision.

## Open Decisions

- **D1 — reorder rather than remove `was_prior_current`.** Removing it entirely would send every
  closing chapter to `VerifyImmutable` against its own stale file and break ordinary compaction.
  Recommended as planned.
- **D2 — heal an empty published file (slice 2).** The alternative is to keep failing and repair the
  store by hand. Healing is recommended: it needs no privileged action, it cannot lose a chapter that
  has content, and the manual repairs attempted twice before both re-staled because the cause kept
  running.
- **D3 — whether the shared anchor itself is a defect.** It is recorded here as the upstream cause
  and deliberately left to its own CR, since it is reachable in six generations and changing it
  touches the authority CR118 declined to replace.

## Dependencies

Born inside CR118's scope, which is `done` and released in `v0.2.0-alpha.34`. Touches the manifest
refresh rule that CR114 introduced and CR118 declined to change. Independent of CR119.
