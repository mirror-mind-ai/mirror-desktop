[< RS016](index.md)

# CR123: Let a Journey Mint Its First Publication Receipt

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Candidate directions

Not decided. Recorded for the Navigator.

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
