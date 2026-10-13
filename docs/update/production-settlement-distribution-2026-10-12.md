# Production settlement distribution — 2026-10-12

**Kind:** measurement record, read during CR149's investigation
**Method:** the production settlement-timings ledger (`ai.mirrormind.desktop/settlement-timings/`)
copied once and analysed from the copy. **779 settlements across 8 Journeys.** Every file parsed,
which is the integrity check: a torn read would not parse.

Production was running during the copy. A single `cp` of a file written by temp-and-rename yields
either the old or the new content, never a blend, and the parse confirms coherence. The limit is that
a settlement finishing during the copy may be absent — not that the snapshot is corrupt.

## The distribution this project has been reasoning without

| | totalMs |
|---|---|
| min | 72 ms |
| **p50** | **4,821 ms** |
| **p90** | **7,897 ms** |
| p99 | 41,741 ms |
| max | 55,633,920 ms (a failure, see below) |

**Every settlement-duration claim in this Journey's record until now came from the Dev channel's ten
measurements, 1.6–3.0 s.** The production median is **4.8 s** and the 90th percentile is **7.9 s** —
two to three times Dev. That is the single reason Dev could not reproduce CR149's symptom: the window
the Navigator is locked out of is typically five seconds and often eight, not two and a half.

## CR132's 60-second threshold is falsified

`ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000` was derived from `mirror-desktop`'s 43 records, whose
maximum was 41,741 ms. CR132 wrote the falsification condition itself:

> Falsifiable on purpose. If a legitimate settlement is ever recorded above this, the constant moves
> and the record says why.

**Three records exceed it, and two of them are legitimate:**

| finished | Journey | totalMs | outcome | largest phase |
|---|---|---|---|---|
| 2026-10-09T17:32:37Z | `mirror-desktop` | **81,338 ms** | **settled** | `enqueue_outbox_item` 12,148 ms |
| 2026-10-07T00:54:32Z | `livro-lideranca-soberana` | **113,048 ms** | **settled** | `save_projection` 41,081 ms |
| 2026-10-10T11:36:03Z | `mirror-desktop` | 55,633,920 ms | failed | — |

The first two **completed successfully**, with their depth-0 phases accounting for 100% and 99.99% of
the window — so the time was spent doing the work, not waiting on nothing. Both would have had the
"Stop waiting" control presented to the Navigator while the settlement was progressing normally, and
one of them is in `mirror-desktop` itself.

**Both records predate CR132.** They were in the data when the constant was derived; the derivation
read one Journey's 43 records instead of all 779. CR132's own debt line said *"The threshold is
measured on one Journey. Other Journeys' settlements were not measured."* This is that debt coming
due.

The third record is a different phenomenon and must not be counted as a slow settlement: `outcome`
is `failed`, its phases sum to **0.02%** of the window, and its failure reason is
`persistence_operation_abandoned:finalize_completed:120000`. A bounded persistence operation gave up
after 120 s and the timing window stayed open for 15.5 hours. That is a stranded settlement, not a
long one.

## No phase dominates, and the cheap phases are inflated too

The slowest settlement in the Eval session (`flip-website`, 16,048 ms) spreads its cost across 14
depth-0 phases, the largest at 14.3%:

| phase | ms | share |
|---|---|---|
| `save_projection` | 2,292 | 14.3% |
| `save_post_frontier_projection` | 1,990 | 12.4% |
| `cleanup_lease` | 1,814 | 11.3% |
| `load_journal` | 1,628 | 10.1% |
| `deliver_outbox_item` | 1,591 | 9.9% |
| `advance_journal` | 1,102 | 6.9% |
| …9 more | 419–1,061 each | |

**`load_journal`, `advance_journal`, `cleanup_lease` and `notify_lease_released` carry tiny payloads
and never touch the conversation**, and they are inflated in the same proportion as the phases that
serialize megabytes. That refutes payload serialization as the explanation.

### The decisive number: the same operation varies 115× within one session

`flip-website`, same Journey, same session, same files on disk:

| totalMs | `load_journal` |
|---|---|
| 16,048 | **3,109 ms** |
| 11,487 | 1,598 ms |
| 3,640 | 60 ms |
| 3,328 | **27 ms** |
| 3,058 | 67 ms |

**The variance is not in the work being done.** And it is not conversation size either: the fast and
slow turns are the same conversation.

### It is historical and pervasive, so the Navigator's typing did not cause it

Across all 779 records, every Journey shows a tight median with a heavy tail on `load_journal`:

| Journey | n | min | p50 | p90 | max | max/min |
|---|---|---|---|---|---|---|
| `alissonvale-com` | 233 | 7 | 68 | 489 | 2,887 | **412×** |
| `mirror-desktop` | 161 | 11 | 71 | 667 | 2,854 | **259×** |
| `livro-lideranca-soberana` | 256 | 25 | 55 | 142 | 1,257 | 50× |
| `flip-podcast` | 57 | 26 | 61 | 119 | 1,189 | 46× |
| `venda-de-livros` | 44 | 17 | 64 | 116 | 298 | 18× |
| `softwarezen` | 6 | 39 | 120 | 199 | 319 | 8× |

A 60–70 ms median with a tail into seconds, on an operation whose input is a small file, in every
Journey, over weeks. **The pattern long predates the Eval session**, so the hypothesis that the
Navigator's typing caused the inflation is refuted — a hypothesis I held briefly on the way here and
am recording because the data killed it.

## What this establishes, and what it does not

**Established.** Production settlements are 2–3× longer than Dev's. No phase dominates. Phases with
trivial payloads inflate identically to phases that serialize the whole conversation. The same
operation on the same input varies by two orders of magnitude. The pattern is historical and
Journey-independent. Two legitimate settlements exceed CR132's threshold.

**Not established.** *What* steals the time. A uniform multiplicative inflation across every awaited
operation is the signature of event-loop or IPC-queue contention rather than of per-operation cost,
but **nothing here measures the main thread**, and that reading is an inference from the shape of the
numbers. Naming the contending work requires a profile, which is now justified by measurement instead
of nominated by guess.
