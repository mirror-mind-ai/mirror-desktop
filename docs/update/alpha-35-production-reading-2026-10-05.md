[< Updates](../index.md)

# v0.2.0-alpha.35 — the production reading CR122 owed

**Date:** 2026-10-05
**Scope:** read-only inspection of `~/Library/Application Support/ai.mirrormind.desktop`
**Purpose:** the CR122 closure and the `alpha.35` release note both stated that no live run stood
behind the change and that the production upgrade was the verification owed. This is that reading.

## The build under observation

Confirmed on disk rather than taken on report, because a string in a bundle cannot prove what is
running:

| | |
|---|---|
| Bundle | `/Applications/Mirror Desktop.app`, `ai.mirrormind.desktop` |
| Version | `0.2.0-alpha.35` |
| Binary mtime | `2026-10-05 05:14:57` local |
| Process | pid 43712, started `2026-10-05 05:30:12` local |
| Verdict | started **after** the binary, so the observation belongs to this build |

The restart is `08:30:12Z`. Everything below is split on that instant.

## 1. The heal — fired, persisted, and exact

| Journey | stuck turns before | after | `committedTurnCount` written | ledger rewritten since restart |
|---|---:|---:|---|---|
| `livro-lideranca-soberana` | 13 | **0** | 159 | yes |
| `mirror-desktop` | 2 | **0** | 23 | yes |
| `alissonvale-com` | 11 | 11 | — | **no** |

**15 of 28 refused harness bodies are committed and persisted.** The remaining 11 are in
`alissonvale-com`, whose ledger has not been rewritten since the restart: the heal runs where stored
state becomes live state, so a Journey the new build has not opened still carries the old shape on
disk. It will heal on first read. This is the designed behaviour, not a failure, but it means the
reading is **incomplete until that Journey is opened**.

**The new field is exact, not approximate.** Checked against the turns themselves:

- `livro-lideranca-soberana`: 162 turns, 159 committed harness bodies, `committedTurnCount` 159.
- `mirror-desktop`: 25 turns, 23 committed harness bodies, `committedTurnCount` 23.

Both exact, and in both the next commit would report one higher, so no regression is primed. An
inflated count would have been a latent guard defect; it is not inflated.

## 2. No conversation lost a message

Every Journey's stored message array compared against the pre-upgrade baseline:

**Zero ledgers shrank.** Eighteen are unchanged, two grew through ordinary use
(`livro-lideranca-soberana` 364 → 383, `mirror-desktop` 2,347 → 2,381). This was the largest risk in
the change — the heal writes to records that had already been mishandled once — and it is clean.

`venda-de-livros` still holds 24 messages against a checkpoint of 122. That loss predates this
release and nothing here can restore it; what matters is that it did not lose more.

## 3. The D0 trap was live, and is now open

The three ledgers the shipped `alpha.34` build could not parse at all, re-checked against both rules:

| Journey | stored | old rule derives | old parse | new parse | messages still stored |
|---|---|---|---|---|---:|
| `nautilus-agentic-method` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 104 |
| `softwarezen` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 22 |
| `venda-de-livros` | `commit_pending` | `in_sync` | **reject** | accept, recomputed | 24 |

All three were unreadable on every load, and every load was an opportunity for the next save to
replace their history with whatever was on screen. Their content is intact. They have not been opened
by the new build yet, so their files still carry the stale classification; it normalises on first
read.

## 4. The Composer block — one of two released

| Journey | latest turn | state | writable |
|---|---|---|---|
| `livro-lideranca-soberana` | all three bodies pending — a turn in flight | not `projection_pending` | **yes** |
| `alissonvale-com` | `pi` committed, `harness` pending | `projection_pending` | **no, still blocked** |

`livro-lideranca-soberana` is released and has in fact accepted and run new turns since the restart.
`alissonvale-com` stays blocked for the same reason its 11 turns stay stuck: the new build has not
read it.

## 5. What this reading does **not** verify

Stated plainly, because the release note promised this reading would be honest about its limits.

**No settlement has completed on the ordinary path under `alpha.35`.** Zero settlement timing records
exist after `08:30:12Z`. The 37 records that exist (`alissonvale-com` 14, `livro-lideranca-soberana`
16, `mirror-desktop` 7) are all `outcome: failed` and all written by `alpha.34`, the last of them at
`08:29:56Z`, some thirty seconds before the restart.

One turn did reach `settled` after the restart — `turn-agent-run-2026-10-05T08:29:21.009Z` in
`livro-lideranca-soberana`, settled at `08:31:03.476Z` with `recoveryDisposition: complete` and a
receipt transitioning `outbox_enqueued → settled`. But it was **created under `alpha.34`**, its first
attempt is the last `failed` timing record, and it was finished by recovery, which does not open a
timing collector. So it proves recovery still works across an upgrade; it does not prove a settlement
now succeeds first time.

**The central claim of the release therefore remains unverified**: that a turn whose commit would
previously have been refused now settles without the detour. It needs one ordinary turn to complete
in a Journey that was affected. The outbox is empty and a turn is in flight, so the next completion
should produce the first `settled` timing record on this build.

## Verdict

Of the three readings the CR122 closure said were owed:

1. **Heal count must read zero** — partially met. Zero in both Journeys the new build has read, with
   the count exact. Eleven remain in one unopened Journey.
2. **No conversation may lose messages** — **met**, with no exceptions.
3. **The two blocked Composers must be writable** — half met, for the same reason as (1).

Nothing contradicts the closure. One claim is confirmed outright, two are confirmed wherever the new
build has actually run, and the settlement-success claim is still waiting on a single ordinary turn.

**Next action, and it is small:** open `alissonvale-com` in the application. That triggers the heal
for its 11 turns and releases its Composer. Opening `nautilus-agentic-method`, `softwarezen` and
`venda-de-livros` normalises their stale classification. Then re-run this reading, which should show
zero stuck turns everywhere and at least one `settled` timing record.

---

# Addendum — the reading completed

The Navigator opened the four Journeys. Re-read immediately afterwards.

## All three owed readings are now met

**1. Heal count reads zero.** Across the **whole store**, zero turns remain with a committed Pi body
and a pending harness body. Was 28.

| Journey | ledger read since restart | stuck turns | classification | `committedTurnCount` |
|---|---|---:|---|---:|
| `alissonvale-com` | yes, 05:38:34 | **0** | `in_sync` | 47 |
| `livro-lideranca-soberana` | yes | **0** | `commit_failed` | 159 |
| `mirror-desktop` | yes | **0** | `commit_failed` | 23 |
| `nautilus-agentic-method` | yes, 05:41:53 | 0 | `in_sync` | — |
| `softwarezen` | yes, 05:41:43 | 0 | `in_sync` | — |
| `venda-de-livros` | yes, 05:42:06 | 0 | `in_sync` | — |

**2. No conversation lost a message — and the three unreadable ledgers gained some.** Not one ledger
shrank. The three the old build could not parse were read by the new build and **grew**:
`nautilus-agentic-method` 104 → 106, `softwarezen` 22 → 25, `venda-de-livros` 24 → 26. Had the trap
still been live, each of those saves is where their history would have been replaced by the loaded
window. `alissonvale-com` 510 → 511.

**3. Both Composers are released.** `alissonvale-com` reads `in_sync` with no stuck turn; it was
`projection_pending` and blocked three hours earlier.

## The central claim is verified

The first ordinary-path settlement on `alpha.35`, in `mirror-desktop` — one of the affected Journeys
— **completed the entire sequence**: run `agent-run-2026-10-05T08:30:54.550Z`, `outcome: settled`,
**17 phases, every one `completed`**, ending at `acknowledge_outbox_item`.

`enqueue_outbox_item` ran for 4,492 ms and completed. That is the step that, before CR122, never
began — every failed record stopped at `cleanup_lease`. The depth-0 phases sum to 41,600 ms against a
total of 41,741 ms, a gap of 141 ms or 0.34%, so the instrument's arithmetic holds on a long
settlement as well as a short one.

## An unplanned reading: the tail is not one slow phase

That settlement took **41.7 seconds**, and the time is spread rather than concentrated:
`save_post_frontier_projection` 8,698 ms, `deliver_outbox_item` 8,407 ms, `enqueue_outbox_item`
4,492 ms, `save_projection` 4,199 ms, `advance_journal` 3,892 ms, `acknowledge_outbox_item` 3,512 ms
— and even `load_journal`, a small file read, took 1,143 ms and 805 ms on its two calls.

Every durable operation is slow by roughly the same factor. That is the shape of contention or
serialisation, not of an algorithmic cost in one place, and it is a different answer from the one
CR119's single Dev data point suggested.

**It is one observation with a real confound and must not be read as a finding.** The settlement ran
at 05:34:54–05:35:36 local, while four Journeys were being opened in the application and this
inspection was reading the whole store from disk. Some of that contention was self-inflicted. It is
recorded as the first production data point for CR119's slice 4 and nothing more.

## A new failure, in a new place

`livro-lideranca-soberana` produced a `failed` record on this build at `08:33:47.919Z` — but inside
`save_projection` → `publish_segments`, not after `cleanup_lease`. It is **not** CR122's failure; the
harness commit succeeded, which is why the sequence reached publication at all.

The cause is established in code, not hypothesised: an ordinary turn supplies 1 of 9 chapters, so the
publisher must read `historicalMessageCount` from a prior receipt, and this Journey has never had
one — because minting a receipt requires every chapter the manifest declares to have a file, and its
`segment-1` predates publication. Deterministic and self-perpetuating. Two Journeys are in this state
now and a third is one lost receipt away.

Nothing is lost: the chapter file is written before the failing check, and recovery settled the turn
two seconds later. Captured as
[CR123](../project/refinement/rs016-ongoing-product-improvements-and-adjustments/cr123-let-a-journey-mint-its-first-publication-receipt.md).

**And it took the same detective work as last time.** The timing record still does not carry the
error, so naming this needed a timing record, eight file mtimes, a receipt census across twenty
Journeys and a read of the Rust. That is CR121's open item, demonstrated twice in one day.

## Verdict

CR122's closure stands. All three owed readings are met, with no exception and no conversation
damaged, and the claim the release rested on is verified on the ordinary path in an affected Journey.
The settlement path is not yet healthy — CR120 and CR123 are both live and CR119's tail is unexplained
— but nothing found here contradicts what was shipped.
