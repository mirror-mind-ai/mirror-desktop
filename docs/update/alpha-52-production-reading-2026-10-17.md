# Production Reading — v0.2.0-alpha.52

**Date:** 2026-10-17
**Read:** after the Navigator upgraded production and restarted the app. Read-only, with production
running at pid 94353 since 08:25:25.

## The upgrade landed

Installed binary `c6053cb6595f6cf47ab524559df52d3c6d56604fdecadf8b78da7bbe67950488`, version
`0.2.0-alpha.52` — **byte-identical to the artifact served by the updater endpoint**, which was
itself verified byte-identical to the alpha bundle built in this worktree. Previous binary was
`e7795bee…` (alpha.51).

## The falsifier, collected

Three clauses were recorded **before** the upgrade so this would be a measurement. All three pass.

### (1) The orphan recovered, exactly as predicted

| | before | after |
|---|---|---|
| `phase` | `running` | **`settled`** |
| `terminalOutcome` | `null` | **`completed`** |
| `revision` | 2 | **5** |
| `recoveryDisposition` | `resume_execution` | **`complete`** |
| `piExecution` | `null` | **present** |
| `updatedAt` | 2026-10-16T13:00:42.119Z | **2026-10-17T11:27:36.074Z** |

The evidence names `userEntryId 6ee82176`, `assistantEntryId 81b3007d`, `entryCount 98`, **1,877
characters**, `committedAt 2026-10-16T13:01:49.786Z`, receipt
`settled-agent-run-2026-10-16T13:00:42.068Z`.

Those are the exact identifiers the read-only probe predicted before the release was built. The
record did not merely advance to `terminal_durable` — it ran the whole chain to `settled`, which is
three transitions, and that is why the revision moved 2 → 5.

### (2) No new refusal for that run

The skips file holds **1** record for that run, the same one written on 2026-10-16. No thirteenth
refusal for it.

### (3) The conversation lost nothing

28 messages before, 28 after.

## What else the repair changed, measured directly

The new rule was applied to **every stale record on this machine** — 5 of 696 journal records — by
reading each record's own session file and its own group's claims:

| Journey | admitted | window | unclaimed candidates | verdict |
|---|---|---|---|---|
| `flip-podcast` | 2026-10-12T18:48:22 | 7 minutes | 1, answered | **`Closed`** |
| `softwarezen` | 2026-10-10T16:53:09 | 2 days | 1, answered | **`Closed`** |
| `mirror-desktop` | 2026-10-17T11:27:13 | unbounded | 1 | `request_open` — **this is the live turn**, correctly named |
| `mirror-desktop` | 2026-10-08T12:42:24 | 4 days | **89** | `ambiguous` |
| `alissonvale-com` | 2026-10-09T18:10:26 | 5 days | **199** | `ambiguous` |

`flip-podcast` and `softwarezen` both previously refused as `ambiguous` under the frontier rule and
are now recoverable. So the repair turns three of the four genuinely stale records from permanent
refusals into attributions — the `alissonvale-com` 13:00 orphan already recovered, and these two
will on their Journey's next load.

## The residue, named rather than glossed

Two records stay `ambiguous`, and the refusal is **correct**: their windows are days wide and hold 89
and 199 unclaimed requests. Choosing among 89 candidates for a record admitted four days earlier
would be a guess, and this programme does not guess.

The reason the windows are that wide is legacy data. In the `mirror-desktop` group, no record between
2026-09-24 and 2026-10-14 carries `piExecution` evidence at all, and between the stale record and the
next admission on that same thread, generation and session there are **no journal records whatsoever**
while 89 real requests ran in the Pi session. The journal of that era did not record every turn, so
the window bounded by journal admissions spans four days of real work.

**Consequence to accept or fix later:** those two records will keep producing a skip record whenever
their Journey loads and the reason changes. They are a bounded, countable residue — two — from before
claim evidence existed.

## An unexplained observation

Two new refusals were written for the `mirror-desktop` 10-08 record during the restart, 19 seconds
apart, with **different reasons**: `request_open` at 11:25:13 and `ambiguous` at 11:25:32. Because
`recovery_skip_is_new` only records a change of reason, the pair proves the verdict genuinely changed
between two attempts. The window is bounded by a 2026-10-12 admission and did not move, so the input
that changed was most plausibly the active branch while that session was being appended to — but
**that is not established**, and it is recorded here as an open observation rather than a diagnosis.

## Field evidence for CR129, arriving unprompted

`settlement-timings/alissonvale-com.json` holds **zero** records for the recovered run, before and
after. The orphan settled through recovery and the ledger says nothing about it — which is precisely
the friction
[CR129](../project/refinement/rs016-ongoing-product-improvements-and-adjustments/cr129-let-a-recovered-settlement-say-it-happened.md)
describes, now observed in the field rather than reasoned about. It does not change the argument that
CR129 serves a ledger reader rather than the Navigator, so its RS025 membership stays the open
question it was. It does strengthen the CR itself.

## Still owed

CR155's and CR159's field checks. Both shipped in alpha.51 and neither symptom has recurred:
no provider refusal and no finishing that will not end since the upgrade.

## Provenance

Read-only throughout, production running at pid 94353. Journal (696 records across all Journeys),
Pi session files, dedicated conversation records, settlement timings and
`mirror-append-recovery-skips.jsonl` inspected directly. Nothing was written to production state.
