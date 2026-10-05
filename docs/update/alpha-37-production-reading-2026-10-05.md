[< Updates](../index.md)

# v0.2.0-alpha.37 production reading — 2026-10-05

Read-only. Journey authority `mirror-desktop`. Data directory
`~/Library/Application Support/ai.mirrormind.desktop`.

## Build confirmed, and nothing settled yet

| | |
|---|---|
| Installed production app | `0.2.0-alpha.37` |
| Binary mtime | `Oct 5 08:04:59` local |
| Running process | pid 40218, started `Oct 5 08:40:53` local |
| Machine offset | UTC−03 |
| Restart in UTC | `2026-10-05T11:40:53Z` |
| Newest settlement record on disk | `2026-10-05T11:38:12Z` |

The process start postdates the binary, so the Navigator is running `alpha.37`.

**No settlement has occurred on this build.** The newest record predates the restart by 2 min 41 s.
So every field reading owed for this release is still owed, and nothing below is evidence about
`alpha.37`'s own behaviour.

### A reading error, corrected before it was used

The first pass filtered settlement records with `startedAt >= "2026-10-05T08:40:53"`, comparing the
records' **UTC** timestamps against `ps`'s **local** `lstart`. On a UTC−03 machine that admitted
everything after `05:40:53` local — roughly six hours of pre-restart history — which would have been
read as `alpha.37` behaviour. The conclusion is the opposite of what that pass suggested: there is
nothing to read yet.

This is the same error class as the `alpha.36` reading taken 36 s after a restart. Both come from
reading production eagerly and treating what came back as a result.

## What the pre-restart records do establish, retrospectively

Not about `alpha.37`, but it strengthens the previous release's verification from one data point to
many. The `alpha.36` process started `06:53:47` local = `09:53:47Z`, which splits the records cleanly:

| | before `09:53:47Z` (`alpha.35`) | at/after (`alpha.36`) |
|---|---|---|
| Phases per settled record | **17** | **19** |
| `create_outbox_item`, `notify_lease_released` | absent | present |
| `livro-lideranca-soberana` outcome | **12 × `failed`**, 6 phases, `publish_segments failed` | **~25 × `settled`**, `publish_segments completed` |

The phase count changes exactly at the build boundary, and the first 19-phase record is at
`09:55:14Z` — 87 s after the process started. CR121's wiring and CR123's fix are therefore confirmed
across dozens of settlements rather than the single turn recorded at the time.

CR121's `failure` payload is **still unobserved**, and now for a precise reason: the only failures on
record are the 12 `livro` ones, which are all on `alpha.35` and so predate the field. Since CR121
shipped, nothing has failed.

## The material finding: CR124's evidence measured the wrong input

A compaction **did** run, on `alpha.36`, which still carried the byte-compare CR124 removed:

- generation 4 now holds **33 chapters** (was 32); `segment-33.json` written `08:37:58` local;
  manifest mtime `08:37:57`; `sourceEntryCount` 9305 → 9826.
- That settlement is on record at `11:37:58Z` as **`settled`, 19 phases, `publish_segments`
  completed**.

CR124 predicted this compaction would **fail**. It succeeded. The reason is that the replay behind
CR124's evidence fed `partitionConversationBySegments` the **stored ledger**, while the publisher is
handed the **loaded surface**, which CR114 bounds to the current chapter.

The receipt proves which input is real:

```text
receipt totalMessageCount        230
receipt historicalMessageCount   221
difference (current chapter)       9
segment-33.json holds              9 messages
the stored ledger holds        2,497 messages
the replay derived                12 messages for segment-33
```

The publication wrote 9. So on an ordinary compaction every closed chapter except the one that just
closed is supplied **empty** and taken by CR118's `SkipPublished` rule, and `VerifyImmutable` is
never reached.

### What this changes

**False, as published:** that eleven of fourteen chapters diverge and that three Journeys fail the
publication half of **every** compaction. That describes a surface holding the whole ledger, which is
not the ordinary case.

**Still true:**

- The byte-compare was unsound on its own terms — an immutable file compared against a projection
  re-derived from a moving window. That reasoning never depended on the input.
- It is genuinely reachable: `VerifyImmutable` needs a compaction to settle **while complete history
  is loaded**, which is a supported action ("Load earlier chapters"). Both conditions together, which
  is narrow.
- The divergences in the data are real. With complete history loaded, the files do differ from what
  the ledger derives — 7 chapters in `livro-lideranca-soberana`, 2 in `mirror-desktop`, 1 in
  `alissonvale-com` as of this reading.
- CR120's damage is real and fired: `segment-30` holds 606,306 bytes and 0 messages. It is also
  consistent with the bounded surface — the compaction reprojects onto the new current chapter, so
  the chapter that just closed is supplied empty while `was_prior_current` still granted it a write.
  That is CR120's defect exactly.
- Both changes remain correct and harmless. Neither is weakened by this; CR124's **severity** is.

**Probably never fired.** There is no evidence the divergence failure has occurred in production. The
only recorded `publish_segments` failures are CR123's receipt error.

### The owed observable event, now specifiable

`segment-30`'s healing needs it to be supplied non-empty, which needs a **compaction settling while
complete history is loaded** in `mirror-desktop`. A non-compaction settlement publishes only the
current chapter, so it cannot heal anything. Until then the empty file stays.

## Regression check — nothing lost

| Check | Result |
|---|---|
| Outbox | **empty** |
| Ledgers shrank | **none**; `mirror-desktop` 2,431 → 2,497, `livro` 423 → 477, `alissonvale-com` 536 → 556 |
| Receipts | `mirror-desktop` 33 hashes, `livro` `historicalMessageCount` 344 held |
| `nautilus-agentic-method` receipt | **still absent** — owed |

**Turns with a pending harness body: 6, and none is a regression.** Two are in flight at the moment
of reading (`11:43:32Z`, `11:43:56Z`). The other four — `mirror-desktop` 10-04, `livro` 10-02 × 2,
`flip-podcast` 10-03 — all carry `pi: failed`, which is CR122's cancelled-send phantom debt, not a
refused commit. The "zero stuck turns" claim in the `alpha.36` reading used CR122's narrower meaning,
a turn whose harness commit was *refused*; by that measure it is still zero. The two measures should
not have shared a word.

## Second reading, 13:10 local — the settlements arrived

The first reading above was taken 4 minutes after the restart and correctly reported that nothing had
settled yet. **28 settlements** have since been recorded on `alpha.37`, so everything that was owed
except one item is now collected.

| | |
|---|---|
| Settlement records on `alpha.37` | **28** — 27 `settled`, 1 `failed` |
| Phase count | **19** on all 27 settled, **11** on the failed one |
| `totalMs` | min 1,005 · median 3,854 · max 48,546 |
| Per Journey | `livro` 15 · `alissonvale-com` 7 · `mirror-desktop` 6 |

### CR121 verified outright — the first real failure payload on a production machine

This was the longest-standing owed reading, blocked since `alpha.36` because nothing had failed. One
settlement failed, and it said why:

```json
{ "phase": "enqueue_outbox_item", "reason": "mirror_append_item_conflict" }
```

`alissonvale-com`, `2026-10-05T13:08:26.285Z`, 1,005 ms total. The phases stop exactly where the
payload says, with `enqueue_outbox_item` at 303 ms and `outcome: failed`, after
`notify_lease_released` and `create_outbox_item` — the two steps CR121 named — both completed at 0 ms.

Before CR121 this record would have said that the settlement failed while every phase it contained
reported success. That was the whole argument for the change, and it is now settled by evidence
rather than by reasoning.

**What the failure was.** The native conflict record (`mirror-append-conflicts.jsonl`, 6 records all
time, 1 on `alpha.37`) names it precisely: at `site: normalize_legacy`, a **`schemaVersion` 1.0.0**
candidate with `piUserEntryId`, `piAssistantEntryId`, `piSessionId`, `piSessionFile` and `runId` all
`null` tried to replace an existing **1.1.0** item carrying all of them. The refusal is correct — it
protects the richer record. That a legacy-shaped item is still being produced for a turn that already
has a complete one is a defect of its own, and all six records share one `differingKeys` signature,
so it is a shape rather than an accident. **Candidate CR, not captured here.**

The turn recovered: the outbox is empty and no later record exists for that run, which is the
recovery path writing no record — the instrument gap already on the board.

### CR125 verified in the field, by the Navigator

The Navigator confirms the Conversation **stopped sliding** when a turn settles. This was the one
reading no file could provide, and it is the acceptance criterion met.

### CR120 and CR124 still owed — no compaction has run

The manifest is unchanged at 33 chapters with mtime `08:37:57`, which predates the restart.
`segment-30` is still 606,306 bytes and 0 messages. The current chapter *was* republished on
`alpha.37` — `segment-33.json` rewritten `10:04:55`, now 21 messages, receipt total 230 → 242 — which
exercises the ordinary publication path but not the compaction path. The healing event remains owed
and, per CR124's correction, needs a compaction settling with complete history loaded.

### Nothing regressed

| Check | Result |
|---|---|
| Ledgers | all **grew**: `mirror-desktop` 2,497 → 2,570, `livro` 477 → 513, `alissonvale-com` 556 → 586 |
| Any ledger shrank | **none** |
| Outbox | **empty** |
| `nautilus-agentic-method` receipt | **still absent** — owed |

### The CR097 baseline, captured before its fix ships

CR097 is `done` but unreleased, so this store is the last measurement of the unfixed path. Nine
corrections now exist across five Journeys — one more than at CR097's closure, `alissonvale-com`
`13881848`, created at 13:06 and belonging to the turn whose settlement failed above.

Tracing where the wrong value is *written* rather than where it is read produced
[CR126](../project/refinement/rs016-ongoing-product-improvements-and-adjustments/cr126-stop-a-correction-from-becoming-its-own-turn.md):
the native transcript projection treats a correction as the start of a turn. Identity is wrong in
**9 of 9**, prose was discarded in **4 of 9**, and an answer is orphaned in **1 of 9**.

**A measurement of mine was wrong and is corrected here.** The first pass reported that 5 of 9
corrected turns lost prose, counting any assistant text between the request and the correction. That
over-counts: the Rust rule closes a turn on `stop`, so prose that had already closed became its own
turn and survived. Only prose accumulated *since the last `stop`* is discarded — 4 of 9, not 5 — and
the ninth case is a different defect, an orphaned closed answer. Two consequences had been collapsed
into one number.

## Still owed

Collected in the second reading: `alpha.37` settlements (28), CR125 (the Navigator's own confirmation),
and CR121's first real `failure` payload.

1. `segment-30` healing — needs a compaction settling while complete history is loaded.
2. A receipt for `nautilus-agentic-method` — one ordinary turn there.
3. A settled record for a recovery-only settlement — the instrument still writes none, which is why
   the failed turn above has no successor record.
