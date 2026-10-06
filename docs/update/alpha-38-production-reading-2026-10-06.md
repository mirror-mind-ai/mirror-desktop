[< Updates](../index.md)

# v0.2.0-alpha.38 production reading — 2026-10-06

**Kind:** field reading of the published release, taken read-only against the production store.

## Build and boundary

| | |
|---|---|
| Installed version | `0.2.0-alpha.38` |
| Binary mtime | 2026-10-05 11:02 local |
| Process | pid 52896, started 2026-10-05 **14:50:49** local |
| Uptime at reading | **18 h 15 min** |
| Restart boundary (UTC) | **`2026-10-05T17:50:49Z`** |
| Reading taken | 2026-10-06 12:06Z |
| Dev build (not involved) | `0.2.0-alpha.33` |

The process started after the binary was written, so the running app is the published build and not an
old process over new files. Every filter below uses the UTC boundary, because `ps` reports local time
and the records are UTC — a conversion that was got wrong twice earlier in this Journey.

## Settlements

Eight settlements on `alpha.38`, across four Journeys.

| Journey | records total | on alpha.38 |
|---|---|---|
| `alissonvale-com` | 44 | 0 |
| `livro-lideranca-soberana` | 83 | 4 |
| `mirror-desktop` | 29 | 1 |
| `mirror-mind` | 3 | **3** (the Journey is new) |

Seven `settled` at 19 phases each; one recorded `failed` at 5 phases. `totalMs` min 1,005 is no longer
the floor — min **119**, median **3,476**, max **5,392**. Span `17:52:28Z` → `12:01:34Z`.

## The one recorded failure is a new finding, and it is not a failed turn

`mirror-mind` had its first Desktop settlement today (corrected 2026-10-06: the Journey has existed in Mirror since 2026-08-27; it was not created today). That **first** settlement failed:

```
d0 load_journal                 7ms  completed
d0 load_active_evidence        18ms  completed
d0 save_projection             92ms  failed
d1   save_durable_projection   84ms  completed
d1   load_segments              8ms  failed
```

The two turns after it completed all 19 phases. The cause is an ordering the code makes unavoidable on
a first turn:

1. `save_durable_projection` writes the manifest. It is stamped `11:59:46Z` and declares `segment-1`.
2. **[Corrected 2026-10-06: this attribution is wrong. `load_segments` invokes `load_conversation_segments`, a manifest-only loader that never reads `complete.json`. The 5015 loader serves Journey open, not settlement. The real cause of this 8 ms failure is not established — see CR127's premise correction.]** `load_segments` → `load_conversation_segment_projections` (`src-tauri/src/main.rs:5015`) reads the
   manifest and then **requires `complete.json`**, failing with *"Conversation Segment receipt is
   unavailable."*
3. `complete.json` is minted only by `publish_segments`, which runs **after** `load_segments`
   (`src/app/App.tsx:3494` then `:3500`).

So the loader demands a receipt that only publication can create, and publication is downstream of the
load. A Journey's very first settlement cannot complete its inline path. This is CR123's family — CR123
removed the `all_present` gate and made the closed-count scan unable to error — but it is a different
hard requirement in the same loader, and CR123 did not remove it.

**The turn did not fail.** All three journal records read `phase=settled`, `terminalOutcome=completed`,
`recoveryDisposition=complete`, `revision=5`. And both messages of that turn are in the Mirror database
(`11:59:12` user, `11:59:44` assistant). The work was completed by `recoverPostTerminalPersistence`.

This is the cleanest live witness yet of the instrument gap already on the board: **recovery opens no
collector**, so a settlement rescued by recovery writes no successor record. The timing ledger shows a
failure with nothing after it, while the journal shows completion. Nothing on either surface
distinguishes *failed* from *failed and recovered*.

## What this release shipped for is still unverified

**Zero corrections on `alpha.38`.** Across 18 hours of use, the steering evidence in the store is the
same **nine** records read before the release, all predating the boundary, all `applied`. No turn was
corrected, so CR126's and CR097's observable event has not occurred.

The field verification named as owed in the release note remains owed. It cannot be forced: a
correction happens when the Navigator interrupts a run.

### What *was* verified in the field

CR126's compatibility seam carries real traffic, and it worked.

Every turn journal record with Pi execution evidence was re-derived from its own recorded pair and
compared field by field — assistant text, entry count, and both timestamps:

| | |
|---|---|
| Records written before `alpha.38` | **566** exact, 0 mismatched |
| Records written **by** `alpha.38` | **11** exact, 0 mismatched |
| Total | **577** exact, **0** mismatched |

And the write path to Mirror was exercised on the Journey with the most history. The single
`mirror-desktop` settlement (`17:52:28Z`, 2,643 ledger messages, 34 chapters) completed
`create_outbox_item` 0 ms → `enqueue_outbox_item` 859 ms → `deliver_outbox_item` 1,793 ms →
`acknowledge_outbox_item` 405 ms. `create_pi_backed_mirror_append_item` now re-derives the turn through
`project_pi_turn_spanning`; had that disagreed with stored evidence, the settlement would have stopped
at `create_outbox_item`. It did not, there and in ten other turns.

Mirror received 22 messages after the boundary, in eleven matched user/assistant pairs, each carrying
its own `sourceTurnId`. Every stored user message is a real request.

## Two owed items closed

**`nautilus-agentic-method` has its receipt, and it is sound.** This Journey had no `complete.json` at
all, and three chapters its manifest declared had never been published. Now:

- all six receipt authority checks pass, including `manifestSha256` against the current manifest bytes;
- 4 chapters declared, **4 files present**, none missing;
- all 4 `projectionHashes` match the bytes on disk;
- `hist 248 / total 266 / current segment-4`.

`load_conversation_segment_projections` would now succeed for it. Both the missing-receipt blocker and
the declared-but-unpublished-chapters blocker are resolved for this Journey.

**Nothing regressed.** Active ledgers grew — `mirror-desktop` gen 4 2,570 → **2,643**,
`livro-lideranca-soberana` 513 → **565**, `alissonvale-com` 586 → **598**. None shrank. Outbox empty.
Zero new `mirror-append-conflicts` records (still 6, all predating the release) — though with only
eight settlements that is weak evidence of absence, not a resolution.

## `segment-30` did not heal, and is now blessed

Still **606,306 bytes holding 0 messages**, mtime 10-04 19:36. It is the only empty chapter of 34.

Worse than unhealed: the receipt now **agrees with it**. `complete.json` carries a hash for
`segment-30` and that hash **matches the empty file on disk**. Verification will pass over this chapter
forever. The manifest still describes it as `status=closed`, `turnCount=13`.

**A measurement of mine, corrected before publishing this.** Seeing the chapter count go 33 → 34 and
`sourceEntryCount` 9,826 → 10,139, I took it for a compaction. It was not one: **no settlement on
`alpha.38` used `refresh_segments`**, and neither did the last three on `alpha.37`. Chapter 34 was
opened by ordinary segmentation. Inferring a compaction from its downstream effect would have reported
CR120's precondition as met when it is not.

So the blocker stands unchanged and un-narrowed: `segment-30` heals only when a compaction settles
**while complete history is loaded**, because CR120's repair writes the supplied projection over an
empty file, and under CR114's bounded working set the old chapters are supplied empty — healing
emptiness with emptiness.

The upstream cause is also still present: two chapters share the anchor
`turn-agent-run-2026-10-03T21:40:01.665Z`. Separately, 28 of the 34 chapters carry no `firstTurnId` at
all; that is an observation from this reading, not something I have established the meaning of.

## Candidate work this reading produces

1. **The loader requires a receipt that only publication can mint.** Deterministic on every new
   Journey's first turn, and `mirror-mind` is the witness. Not captured.
2. **Recovery opens no collector.** The instrument cannot say whether a recorded failure was repaired.
   Already the largest known gap; now with a case where the answer was yes.
3. **A legacy-shaped outbox item is still produced** for turns that already have a 1.1.0 one — 6
   conflict records, one signature, none new. Still not captured.
