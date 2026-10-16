# Production Reading — v0.2.0-alpha.51

**Date:** 2026-10-16
**Read:** after the Navigator upgraded production, read-only.

## The upgrade landed

| | |
|---|---|
| Installed binary | `e7795beec9501cd3cbd5216d4406c7a55c5fcc5070b21d6bd67e4d25b49cb986` |
| Expected (served tarball) | identical |
| Previous (`alpha.50`) | `6075ee13385cba1787a1112ed10fd7a5b853e6fb50ccbbc60a7025d5aea3dded` |
| Version / identifier | `0.2.0-alpha.51` / `ai.mirrormind.desktop` |
| Bundle mtime | 2026-10-16 18:54:01 |
| Running | pid **76052**, started 18:54:01 |

The running process resolves to that same path and hash, so production is executing the binary that
was published and independently verified — not merely carrying it on disk.

## The morning's hung turn, eleven hours on

The record for `agent-run-2026-10-16T13:00:42.068Z` **still reads `phase: running`**, `updatedAt`
still `13:00:42.119Z`, `revision 2`, `piExecution: null`. It survived a quit, a relaunch and a
version upgrade. It is a permanent orphan.

**The answer came back; the record did not.** The durable conversation grew from 26 to 28 messages at
14:11:29 and now holds the 1,877-character response — restored as a side effect of the *next* turn's
projection at 14:10:56, which settled `completed`. No recovery path restored it. Had no further
message been sent, it would still be absent. An earlier statement of mine that a restart would
recover it was half right, and the half that was wrong is the one that matters.

## What the recovery actually did

Native recovery **ran and refused**, and said why in a file nothing reads:

```text
mirror-append-recovery-skips.jsonl
  2026-10-16T13:14:25.189Z  alissonvale-com
  agent-run-2026-10-16T13:00:42.068Z
  mirror_append_pi_recovery_ambiguous   recoveredInSameAttempt: 0
```

Measured from the live artefacts: `frontier` = **102**, the active Pi branch has **102** entries,
stale records = **1**, unclaimed requests beyond the frontier = **0**. `1 != 0` → `ambiguous`.

The later successful turn claimed `entryCount: 102` — the whole branch, including the stranded turn's
request and answer — and because the frontier is a single high-water mark rather than a per-turn
claim, those entries stopped being unclaimed. The refusal is now permanent by construction.

**Limit.** These are today's numbers. The skip was written at 13:14:25, before the 14:10 turn, so the
arithmetic at that moment was different and is not established.

## Census of the refusal file

**12 records, 5 Journeys, 2026-10-02 to 2026-10-16, `recoveredInSameAttempt: 0` on every one.**
Ten `mirror_append_pi_recovery_ambiguous`, two `mirror_append_pi_recovery_request_open`, over 10
distinct runs. In two weeks the native stale-record recovery has never recovered anything.

Recorded against [CR160](../project/refinement/rs025-legible-endings-for-a-turn-that-ends-badly/cr160-notice-a-turn-the-journal-never-heard-finish.md),
whose premise this corrects.

## Batch A is now in the field

`alpha.51` carries CR155 slice 1 and CR159, so both owed field checks are live for the first time:

- **CR159** — on the next provider refusal, *The provider reported: …* must appear under
  *Previous attempt was interrupted*.
- **CR155** — on the next finishing that will not end, *Still finishing after Ns* must appear with
  the native-execution sentence and **no button**, after a full minute.

Neither is provokable on command. Both now have a build that can show them.

## Provenance

Read-only throughout, with production running at pid 76052. Journal, Pi session JSONL, dedicated
conversation record, settlement timings, outbox and `mirror-append-recovery-skips.jsonl` inspected
directly. Nothing was written to production state.
