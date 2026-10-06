[< RS016](index.md)

# CR127: Let a Journey's First Turn Settle Without a Receipt It Cannot Have

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

The first settlement of every newly created Journey fails its inline path. It is repaired by
recovery, so the Navigator usually sees nothing — but the turn is recorded as a failure, the
instrument reports a failure that was in fact completed, and the repair depends on a path that has
its own refusal conditions.

Observed live on `alpha.38` in the Journey `mirror-mind`, created 2026-10-06. Its first settlement:

```
d0 load_journal                 7ms  completed
d0 load_active_evidence        18ms  completed
d0 save_projection             92ms  failed
d1   save_durable_projection   84ms  completed
d1   load_segments              8ms  failed
```

The two turns after it completed all nineteen phases. The three turns before it did not exist — this
was the Journey's first.

## Outcome

A Journey's first settlement completes its inline path. The absence of a publication receipt on a
chapter that has never been published is read as "nothing published yet", not as a failure, and
settlement proceeds to publish it.

## Premise correction (2026-10-06, on being asked to plan this CR)

**The mechanism below is wrong, and this CR cannot be planned on it.** Reading the code to plan the
fix showed that the settlement path's `load_segments` phase (`src/app/App.tsx:3494`) invokes
`loadConversationSegments`, whose native command is **`load_conversation_segments`** — a manifest-only
loader. It returns `None` when the manifest is absent, validates the manifest's authority, and **never
reads `complete.json`**. The loader this capture accused, `load_conversation_segment_projections`
(`src-tauri/src/main.rs:5015`), does require the receipt — but it serves opening a Journey's history,
not settlement. Two loaders were conflated.

So the `mirror-mind` failure is real and recorded (`load_segments` 8 ms `failed`), but **its cause is
not established.** The remaining candidates are the TypeScript manifest parser
(`parseConversationSegmentManifest`) rejecting the shape of a freshly derived first manifest, or an
authority mismatch between the manifest and the settlement's identity. Nothing recorded distinguishes
them: CR121 names a failing settlement only in renderer state (`updateExactSettlementError` in
`settlementDiagnostics.ts`), not durably, and no error text exists anywhere in the store.

**What this CR is now.** The title's outcome may still be right — a first turn should settle inline —
but the problem statement has to be re-derived from a cause, and the instrument that would reveal the
cause does not exist. Status stays `captured`. It becomes plannable only after one of: the failure
name is persisted at the point of failure; recovery opens a collector so a rescued settlement leaves a
phase trace; or a new Journey's first turn is observed with the failing step's error captured live.

**The determinism claim is also false.** `comercial`, a Journey created 2026-10-06, settled its
**first** turn (`agent-run-2026-10-06T13:07:52.477Z`) through all nineteen phases: `load_segments`
18 ms `completed`, `publish_segments` 84 ms `completed`. Its second turn did the same. So "every new
Journey's first settlement fails" does not hold — one of the two new Journeys observed on `alpha.38`
failed, the other did not. The `mirror-mind` failure is real, unexplained, and so far singular. Its
manifest as it exists now has every field the parser requires and would parse; what it looked like at
`11:59:46Z` is not recoverable.

The same wrong attribution was published in `docs/update/alpha-38-production-reading-2026-10-06.md`
and is corrected there, dated.

## First Investigation (superseded — retained because it was published)

The ordering is in the code and is unavoidable on a first turn.

1. `save_durable_projection` (`src/app/App.tsx:3478`) writes the chapter manifest. For `mirror-mind`
   it is stamped `2026-10-06T11:59:46Z` and declares `segment-1`.
2. `load_segments` (`:3494`) calls `load_conversation_segment_projections`
   (`src-tauri/src/main.rs:5015`). That function reads the manifest and then **requires the receipt**:

   ```rust
   let receipt: Value = serde_json::from_slice(&fs::read(projection_dir.join("complete.json"))
       .map_err(|_| "Conversation Segment receipt is unavailable.".to_string())?)
   ```

3. `complete.json` is minted only by `publish_segments` (`:3500`), which runs **after**
   `load_segments`.

So the loader demands a receipt that only publication can create, while publication waits downstream
of the load. On a first turn there is no prior settlement to have minted it.

This is CR123's family and not what CR123 fixed. CR123 removed the `all_present` gate and made the
`published_closed_message_count` scan unable to error. The hard `fs::read` of `complete.json` in the
same function was left in place, and it is what fails here.

### The turn did not fail

All three `mirror-mind` journal records read `phase=settled`, `terminalOutcome=completed`,
`recoveryDisposition=complete`, `revision=5`. Both messages of the failing turn are in the Mirror
database (`11:59:12` user, `11:59:44` assistant). `recoverPostTerminalPersistence` completed the work.

That makes this CR's severity *instrumental* rather than *behavioural*, and it is the reason it is
captured separately from the thing it reveals: **recovery opens no collector**, so a settlement
rescued by recovery writes no successor record. The timing ledger shows a failure with nothing after
it while the journal shows completion, and nothing on either surface distinguishes *failed* from
*failed and recovered*.

## Acceptance

- A newly created Journey's first settlement completes its inline path, with `load_segments` and
  `publish_segments` both completing.
- A missing `complete.json` on a chapter directory that has never been published is not an error.
- An **existing but invalid** receipt is still rejected: the six authority checks that follow the read
  (`schemaVersion`, `manifestSha256`, `journeyId`, `threadId`, `generation`, `piSessionId`) keep their
  current strictness. Absence and invalidity must not collapse into one outcome.
- Replayed against the production store, every Journey that currently loads its chapters still loads
  them, with the same chapter count and the same hashes.

## Boundaries

**§5b applies directly and is the main risk.** This CR makes a read path tolerate absence. The
standing finding is that absence and emptiness are the same value across the load path, so any
tolerance added on a read path is a potential deletion on the next write. A tolerated missing receipt
must not become a tolerated *empty* chapter set that a later write then persists.

**Not the recovery collector.** That recovery writes no record is the more valuable finding, and it
is a separate change with a different shape. This CR should not grow to include it.

**Not `segment-30`.** Unrelated to CR120's unhealed chapter, which needs a compaction settling with
complete history loaded.
