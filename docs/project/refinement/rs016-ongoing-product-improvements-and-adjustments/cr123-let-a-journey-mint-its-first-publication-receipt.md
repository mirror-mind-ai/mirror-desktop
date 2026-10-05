[< RS016](index.md)

# CR123: Let a Journey Mint Its First Publication Receipt

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr123-first-publication-receipt`

## Problem

Two production Journeys fail chapter publication on **every ordinary turn**, deterministically, and
cannot recover on their own. `publish_segments` returns
`Conversation Segment completion receipt is unavailable.` because it needs a prior publication
receipt that the Journey has never been able to write.

The failure is self-perpetuating. An ordinary turn supplies only the current chapter, which is not a
complete bundle, so the publisher must read `historicalMessageCount` from the previous receipt. No
receipt exists. Writing one requires `all_present` — every chapter the manifest declares must have a
file on disk — and in both Journeys the manifest declares a chapter that predates publication and has
no file. So the condition that would mint the first receipt can never be met, and every publication
after that fails for the lack of it.

No conversation is lost. The chapter file is written *before* the failing check, and recovery
completes the settlement seconds later. What is lost is the receipt: the artifact that records what
was published, with what hashes, and how many messages the history holds.

Found in the `alpha.35` production reading, in the first settlement the new build attempted in
`livro-lideranca-soberana`.

## Evidence

Read-only, production store, 2026-10-05, application on `0.2.0-alpha.35`.

**The failing settlement, from CR119's instrument.** `livro-lideranca-soberana`, turn
`turn-agent-run-2026-10-05T08:31:43.469Z`, `outcome: failed`, 423 ms, 6 phases:

| phase | depth | elapsed | outcome |
|---|---:|---:|---|
| `load_journal` | 0 | 17 ms | completed |
| `load_active_evidence` | 0 | 69 ms | completed |
| `save_projection` | 0 | 333 ms | **failed** |
| ⤷ `save_durable_projection` | 1 | 259 ms | completed |
| ⤷ `load_segments` | 1 | 15 ms | completed |
| ⤷ `publish_segments` | 1 | 57 ms | **failed** |

`load_segments` rather than `refresh_segments` proves no compaction settled in this turn, so only the
current chapter was supplied — 1 of 9.

**The chapter was written; the receipt was not.** `segment-9.json` has mtime `05:33:48`, the exact
second of the failure, and the publication is the only thing that writes it. The write loop completes
before the check that fails.

**The Journey has no receipt and never has.** `generation-1.segments/` holds `segment-2.json`
through `segment-9.json` — eight files from 09-30 to 10-05 — and **no `complete.json`**. It is the
only Journey in the store with published chapters and no receipt.

**The turn settled anyway.** Journal phase `settled`, revision 5, `terminalOutcome: completed`,
`recoveryDisposition: complete`, updated `08:33:50.617Z` — about two seconds after the failure. All
three bodies committed, 384 messages stored, nothing lost.

**Exposure across the store:**

| Journey | segments | chapter files | `all_present` | receipt | state |
|---|---:|---:|---|---|---|
| `livro-lideranca-soberana` | 9 | 8 | false | **none** | **fails every ordinary publish** |
| `nautilus-agentic-method` | 3 | 0 | false | **none** | **fails every ordinary publish** |
| `flip-website` | 10 | 9 | false | present | works, but cannot re-mint if the receipt is ever lost |
| `alissonvale-com`, `flip-podcast`, `mirror-desktop`, `fabio-henri`, `venda-de-livros`, `vida-economica` | 2–32 | all | true | present | healthy |
| 5 single-segment Journeys | 1 | 0–1 | — | — | safe: one segment is always a complete bundle |

Three Journeys declare a chapter with no file, which is what makes `all_present` permanently false:
`flip-website` (`segment-10`), `livro-lideranca-soberana` (`segment-1`), `nautilus-agentic-method`
(`segment-1`, `segment-2`, `segment-3`).

## Mechanism

`publish_conversation_segment_projections`, `src-tauri/src/main.rs:4771-4806`:

```rust
let all_present = manifest_segments.iter().all(|segment| …is_file());
let prior_historical_count = prior_receipt.as_ref()
    .and_then(|value| value.get("historicalMessageCount").and_then(Value::as_u64));
let includes_all_segments = projections.len() == manifest_segments.len() && !skipped_published_closed;
let historical_message_count = if includes_all_segments {
    supplied_closed_message_count
} else {
    prior_historical_count.ok_or_else(|| "Conversation Segment completion receipt is unavailable.".to_string())?
        .saturating_add(supplied_closed_message_count)
};
…
if all_present { /* write complete.json */ }
```

The deadlock is exact:

```text
ordinary turn supplies 1 of 9 chapters
  -> includes_all_segments = false
  -> historical count must come from the prior receipt
  -> no receipt exists  ->  ERROR, settlement fails

minting a receipt requires all_present
  -> every manifest chapter must have a file
  -> segment-1 predates publication and has none
  -> all_present can never be true  ->  no receipt is ever written
```

Note the ordering: the error is raised at line 4785, **before** the `if all_present` block at 4787.
So even a complete bundle that would satisfy `all_present` still fails first if it is not recognised
as complete. A compaction would be recognised as complete and would compute the count from scratch —
which is why this is survivable in principle — but only if every chapter also gets a file in that
same bundle.

The CR118 comment above the branch explains why the prior receipt is consulted: it keeps a skipped
chapter's messages in the historical total instead of erasing them. That reasoning is correct. What
it did not consider is the case where there is no prior receipt at all, where a conservative fallback
is wanted rather than a refusal.

## Why this is its own CR

It is not CR122: that failure was after `cleanup_lease`, on a pending harness body, and this one is
inside `save_projection` on a Journey whose harness body committed normally. CR122's fix is working
here — the harness commit succeeded, which is why the sequence got as far as publication.

It is not CR120: that is a closed chapter overwriting its own file with nothing, and it predicts a
divergence failure on compaction. This fails on ordinary turns and writes the chapter correctly.

It is the same **class** as both: an extent question — how many messages the history holds — with no
single definition and a guard that treats its absence as corruption.

## Plan (2026-10-05)

Two defects sit on top of each other and both must move, because fixing either alone leaves the
other holding the Journey.

**The refusal** is what fails the settlement: no prior receipt, so no historical count, so an error.
**The minting gate** is why there is no prior receipt: `all_present` requires every chapter the
*manifest* declares to have a file, and a manifest legitimately declares chapters that predate
publication. Fix only the refusal and the expensive fallback runs on every turn forever, because no
receipt is ever minted. Fix only the gate and the two Journeys already in the deadlock still fail on
their next turn, because their first publication still has no prior receipt to carry.

### D1 — A missing receipt is counted, not refused

When there is no prior receipt, the historical count is taken from the closed chapters **already on
disk**, excluding any this bundle itself counted, so nothing is counted twice. The arithmetic becomes
one pure function:

| `includes_all_segments` | prior receipt | historical count |
|---|---|---|
| true | — | the bundle's own closed total, recomputed authoritatively |
| false | present | carried forward plus this bundle's closed total — unchanged, CR118's rule |
| false | **absent** | **scanned from disk** plus this bundle's closed total |

Zero was considered and rejected. It looks cheaper, but it would be **sticky**: on the next
compaction `skipped_published_closed` is true for every already-published chapter, so
`includes_all_segments` stays false and the delta path carries the wrong zero forward permanently.
A number that can never correct itself is worse than a one-time read.

The scan is bounded and never fails: it skips what it cannot read and stops at the existing 256 MB
recovery bound, returning what it counted. The receipt is already documented as a deliberate lower
bound, so a short count is in keeping with it; an error is not.

The cost is one pass over the closed chapters, once per generation, only when no receipt exists —
which D2 makes genuinely once.

### D2 — The receipt records what was published, not what the session contains

The `all_present` gate is removed. A receipt is written whenever the publication succeeded, carrying
hashes for the chapters it has.

This follows the finding already recorded in the settlement model: **the manifest projects the Pi
session's compaction structure and is not an index of published files.** Gating a *publication*
receipt on *session* completeness conflates those two, and that conflation is what made the gate
unreachable.

Nothing is made worse by writing it. `load_current_conversation_segment_projection` needs only the
current chapter's hash, which is always present. `load_conversation_segment_projections` already
fails on a missing chapter **file** before it ever consults the receipt, so the complete-history path
is exactly as broken or healthy as it was.

### Exclusions

**No provenance field on the receipt.** A `historicalCountOrigin` marker was considered and dropped:
nothing would read it, and this CR has just finished arguing that a write-only field is debt. The
semantics are documented in the code and the settlement model instead.

**`segment-1` is still never published.** Its messages stay uncounted, which is correct — they were
never published — and the chapter stays missing, so the complete-history load stays broken for
`livro-lideranca-soberana` and `nautilus-agentic-method`. Publishing a chapter the manifest declares
but publication never covered is a different change, and is the one CR120's shared-anchor note is
already circling.

**No repair of existing stores.** The first ordinary turn after the release mints the receipt by
itself. Nothing needs privileged action.

### Files

- `src-tauri/src/main.rs` — `receipt_historical_message_count` (new, pure),
  `published_closed_message_count` (new, bounded scan), the counted-id set in the publish loop, the
  removed `all_present` gate
- `docs/architecture/settlement-durable-state-model.md` — the receipt's definition in §4 Class 2

### Acceptance

- A partial bundle with no prior receipt publishes, writes a receipt, and does **not** error.
- Its historical count equals the messages of the closed chapters on disk that the bundle did not
  itself count.
- A chapter supplied and written in the same bundle is counted exactly once.
- A partial bundle **with** a prior receipt behaves exactly as before — CR118's carried total.
- A complete bundle recomputes from itself and ignores both the prior receipt and the scan.
- A receipt is written even when a manifest segment has no file.
- Replaying `livro-lideranca-soberana`'s shape succeeds where it currently fails.

### Validation

- Rust unit tests for the pure arithmetic across all five rows above.
- A tempdir test for the scan: files counted, the supplied one excluded, an unreadable file skipped,
  a symlink refused.
- Field: `livro-lideranca-soberana` fails deterministically today, so the first turn after the
  release must settle and leave a `complete.json`. CR121 ships in the same release, so if it fails
  instead, the record will name the reason.

## Implementation and closure (2026-10-05)

Implemented test-first. Both decisions landed as planned, and the replay against the real store
confirms the three outcomes that mattered.

**D1 — the arithmetic is one pure function.** `receipt_historical_message_count` takes the three
cases explicitly: a complete bundle recounts from itself, a partial bundle with a receipt carries it
forward, and a partial bundle without one uses what the scan found. `published_closed_message_count`
does the scan, skips anything it cannot read or stat, refuses symlinks, stops at the existing 256 MB
recovery bound, and never returns an error. It is called **only** when there is nothing to carry, so
the cost is one pass per generation.

**D2 — the `all_present` gate is gone.** A receipt is written whenever publication succeeded. The gate
conflated the Pi session's compaction structure with the set of published files, which is the
distinction the settlement model had already drawn, and that conflation is what made it unreachable.

**Double counting is prevented structurally.** The publish loop records each closed Segment it adds to
its own total in `counted_closed_ids`, and the scan skips those ids. A chapter written in the same
bundle is counted exactly once.

### Verified against the production store

Read-only replay of an ordinary turn for every Journey, with the shipped Rust's exact conditions:

| Journey | before | prior | scanned | historical after |
|---|---|---:|---:|---:|
| `livro-lideranca-soberana` | **failed every turn** | none | **344** | 344 |
| `nautilus-agentic-method` | **failed every turn** | none | 0 | 0 |
| 12 others | ok | carried | **0** | unchanged |

The two deadlocked Journeys publish. `livro-lideranca-soberana` recovers its real historical count of
344 rather than a placeholder, which is the whole argument for scanning instead of defaulting to zero.
`nautilus-agentic-method` reports zero because it has genuinely never published a chapter — honest, and
no longer fatal.

**The twelve healthy Journeys are bit-for-bit unchanged**: every one has a prior receipt, so the scan
never runs and the carried total is used exactly as before. CR118's rule, which keeps a skipped
chapter's messages in the historical total, is untouched and asserted by both a Rust unit test and a
source guard.

**Gates:** `tsc` clean, **231 test files / 1,652 tests**, `cargo test` **253 passed / 3 ignored**,
`cargo check --locked`, build clean, roadmap READY.

### The boundary

**No live run.** Two Rust unit tests cover the arithmetic and the scan, five source guards cover the
two structural changes that sit inside a Tauri command and cannot be unit-tested, and the replay
covers the real data. But no publication has run on a build containing this.

The field test is as cheap as CR121's and is the same turn:
`livro-lideranca-soberana` fails **deterministically on every ordinary turn** today, so the first turn
there after the release must settle and leave a `complete.json` with `historicalMessageCount: 344`.
CR121 ships in the same release, so if it fails instead, the record will name the reason itself
rather than costing another investigation. That reading is owed.

**Proportionality review: proportional.** Two new native functions, one new constant, one set to
prevent double counting, and one removed condition. No new artifact, no schema change, no renderer
change, and no repair of existing stores — the first ordinary turn mints the receipt by itself.

**Debt review: follow_up.** Four items, none selected.

**`segment-1` is still never published** in `livro-lideranca-soberana`, and three chapters are still
missing in `nautilus-agentic-method`. Their messages stay uncounted, which is correct because they
were never published, but it means `load_conversation_segment_projections` — the complete-history
path — still fails for both Journeys on the missing **file**, independently of the receipt. Publishing
a chapter the manifest declares but publication never covered is the next change in this area.

**The receipt's first value is a lower bound by construction.** It counts what is on disk, so a
chapter that was never published is absent from the total forever unless a compaction recomputes with
every Segment supplied and none skipped. That is the same conservative character the receipt already
had, now with one more way to acquire it.

**The scan has no provenance marker.** A receipt whose historical count came from a scan is
indistinguishable from one that was carried. A field was considered and rejected because nothing would
read it, which is the debt this work has repeatedly named. If a repair ever needs to know, it adds it
then.

**Nothing measures the scan.** It runs inside `publish_segments`, which CR119 times as a whole, so a
slow first mint appears as a slow publication without saying why. Acceptable because it happens once.

## Candidate directions (at capture)

Superseded by the plan above; kept for the reasoning.

- **A missing receipt is not a divergence.** The natural fix is a conservative fallback: with no prior
  receipt, treat the prior historical count as the sum of the closed chapters whose files exist, or
  as zero, and write a receipt marked as a first estimate rather than refusing. The receipt is already
  documented as a deliberate lower bound, so a conservative first value is in keeping with it.
- **Decouple minting from `all_present`.** A receipt that describes what *is* published is more useful
  than no receipt at all. `all_present` could record coverage instead of gating the write.
- **Reconsider whether a manifest should declare a chapter it never published.** The settlement model
  records that the manifest projects the Pi session's compaction structure rather than indexing
  published files, and that this is correct. But it is what makes `all_present` unreachable, so the
  two rules need to be reconciled deliberately rather than left to collide.
- **The error should reach the Navigator or the record.** This took a timing record, eight file
  mtimes, a receipt census and a read of the Rust to name, because the timing record still does not
  carry the failure reason. That is CR121's open item, and this is its second demonstration in a day.

## Dependencies

Independent of CR120 and CR122. Strengthens CR121's case. The `flip-website` row is a reminder that
the healthy Journeys are healthy by history, not by guarantee: any Journey that loses its receipt
while declaring an unpublished chapter lands in the same deadlock.
