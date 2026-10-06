# Settlement Ledger Failure Census — 2026-10-06

**Scope:** every record in `settlement-timings/*.json`, read with the `failure` field CR121 writes.
Read-only. Recorded under `mirror-desktop` authority; other Journeys' data is cited with provenance
and nothing in them was mutated.

**Why this exists:** three earlier readings of this ledger printed phases and never printed `failure`.
The field held the cause of the `mirror-mind` first-turn failure since the day it happened. This
census reads the whole ledger the way it should have been read the first time.

## Census

| Journey | records | settled | failed | failed with reason |
|---|---:|---:|---:|---:|
| `alissonvale-com` | 44 | 29 | 15 | 1 |
| `livro-lideranca-soberana` | 84 | 55 | 29 | 0 |
| `mirror-desktop` | 38 | 31 | 7 | 0 |
| `mirror-mind` | 3 | 2 | 1 | 1 |
| `comercial`, `flip-podcast`, `flip-website`, `softwarezen`, `venda-de-livros` | 38 | 38 | 0 | 0 |
| **total** | **207** | **155** | **52** | **2** |

Fifty of the 52 failures predate CR121 and carry no reason. The two that carry one are the only two
written on or after `alpha.36`.

## The 52 failures are three shapes, not fifty-two problems

| count | Journey | failed phases | reason |
|---:|---|---|---|
| 29 | `livro-lideranca-soberana` | `save_projection` → `publish_segments` | pre-CR121, none |
| 14 + 7 | `alissonvale-com`, `mirror-desktop` | none — thrown after `cleanup_lease` | pre-CR121, none |
| 1 | `alissonvale-com` | `enqueue_outbox_item` | `mirror_append_item_conflict` |
| 1 | `mirror-mind` | `save_projection` → `load_segments` | `Conversation Segment authority is invalid.` |

### Shape 1 — the `livro` run was CR123's defect, and it ended at the `alpha.36` restart

Twenty-nine consecutive failures from `2026-10-04T23:31:21Z` to `2026-10-05T09:53:03Z`, every one
failing at `publish_segments`. Production restarted onto `alpha.36` (carrying CR123, *Let a Journey Mint
Its First Publication Receipt*) at `09:53:47Z`. The next settlement, at `09:55:14Z`, succeeded, and so
did the fifty-five after it.

Forty-four seconds between the last failure and the restart. The attribution is by timing and by
shape, not by a recorded reason — none exists for these — but nothing else changed in that window.

**Standing blocker updated.** The blocker read "`livro-lideranca-soberana` `segment-1` declared but
never covered by publication". `segment-1` is now hashed in the receipt. What the run left behind is
larger: the receipt covers **4 of 11** chapters (`segment-1`, `-9`, `-10`, `-11`). Chapters 2 through 8
have files on disk and **no hash in `complete.json`**, because they were published while the receipt
could not be minted, and the receipt minted afterward carried only what later bundles supplied.

### Shape 2 — 21 failures after `cleanup_lease`, almost certainly the outbox conflict

Fourteen in `alissonvale-com` and seven in `mirror-desktop`, all between `2026-10-04T23:27Z` and
`2026-10-05T13:08Z`, all with every timed phase completed and the throw landing after `cleanup_lease`.
That is the exact signature CR121 was written to name. The one failure in the same window that
**does** carry a reason, `alissonvale-com` at `13:08:26Z`, is `enqueue_outbox_item` /
`mirror_append_item_conflict`, and it is the only one of the 22 whose turn also appears in
`mirror-append-conflicts.jsonl`.

The inference that the other 21 are the same conflict is **by shape and adjacency, not by record**.
It is strong; it is not proof. The legacy-outbox-item candidate CR (a `schemaVersion` 1.0.0 item still
produced for turns that already have a 1.1.0 one) now has 22 probable and 1 certain instance, instead
of "6 conflict records with no cause".

### Shape 3 — `mirror-mind`, already carried into CR127's plan

## Chapter receipt coverage across every Journey

Read while checking the `livro` blocker. A Journey whose manifest declares a chapter that has no hash
in its receipt cannot load complete history: `load_conversation_segment_projections` refuses with
*"Conversation Segment projection receipt is missing."*

| Journey / generation | declared | hashed | files | gap |
|---|---:|---:|---:|---|
| `livro-lideranca-soberana` g1 | 11 | 4 | 11 | 7 chapters with files, no hash |
| `nautilus-agentic-method` g2 | 3 | 0 | 0 | no receipt, no files |
| `mirror-mind-website` g1 | 1 | 0 | 0 | no receipt, no files |
| `nova-acropole` g1 | 1 | 0 | 0 | no receipt, no files |
| `o-sentido-do-ser` g1 | 1 | 0 | 0 | no receipt, no files |
| `vida-consultiva` g1 | 1 | 0 | 0 | no receipt, no files |
| every other generation (17) | — | = declared | = declared | none |

Two kinds of gap. `livro` has **files that were never receipted** — real history, unverifiable. The
five single-chapter generations have a manifest and **nothing else**: a Journey that was opened (the
manifest is derived on open) and never settled a turn. Those are not damage; they are Journeys without
conversations. Whether they should load at all, or whether "declared but never published" should read
as empty rather than as failure, is §5b again and belongs with CR127's severity decision.

**The `flip-website` `segment-10` blocker is resolved**: 10 declared, 10 hashed, 10 files.
**`nautilus-agentic-method` g1 is sound**; its g2 is one of the five manifest-only generations.

## What this changes

- One standing blocker retired (`flip-website`), one corrected and enlarged (`livro`, 7 chapters not 1).
- The legacy-outbox candidate CR has a recorded cause and a probable count.
- Five Journeys hold a manifest with no settlement behind it; not previously known.
- No code was read to produce this. Everything above came from the ledger and the segment directories.
