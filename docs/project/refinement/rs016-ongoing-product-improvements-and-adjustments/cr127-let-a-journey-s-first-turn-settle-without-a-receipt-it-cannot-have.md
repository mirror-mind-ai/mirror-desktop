[< RS016](index.md)

# CR127: Let a Journey's First Turn Settle Without a Receipt It Cannot Have

**Status:** planned
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

**The claim that the instrument does not exist was also wrong, and it is the error that mattered.**
CR121 **does** persist the reason: `SettlementTimingRecord` carries a `failure` field
(`{ reason, phase?, afterPhase? }`, `settlementPhaseTiming.ts`), written to
`settlement-timings/<journey>.json`. It had recorded the cause of the `mirror-mind` failure on the day
it happened. Three readings of that file reported its phases and never printed that field.

```
mirror-mind  2026-10-06T11:59:44.936Z  failed  119ms
  failure: { "phase": "load_segments", "reason": "Conversation Segment authority is invalid." }
```

CR121 did exactly what it was built to do. The instrument worked and was not read.

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

## Plan (2026-10-06)

The capture's mechanism was wrong and its determinism claim was false, but the **witness is real** and
its cause is now established from the record CR121 writes. This plan rests on that, not on the capture.

### The established cause

```
phase:  load_segments
reason: "Conversation Segment authority is invalid."
```

That string has exactly one origin: `src/app/conversationSegmentStorage.ts:29`, where
`loadConversationSegments` throws because `parseConversationSegmentManifest` returned `undefined`.

So the manifest **existed** (a missing one returns `null` natively and `undefined` in TypeScript,
which is benign and merely skips publication) and **passed every native authority check** in
`load_conversation_segments_at` — `journeyId`, `threadId`, `generation`, `piSessionId` — and was then
rejected by the TypeScript parser.

### The structural finding this exposes

**The manifest is derived in Rust and validated in TypeScript, by two independently written rule sets.**

- Writer: `project_conversation_segment_manifest` (`src-tauri/src/main.rs`), reached through
  `refresh_conversation_segments`, which is the only path that writes the file.
- Validator: `parseConversationSegmentManifest` (`src/domain/conversationSegments.ts`), which enforces
  roughly fifteen predicates the Rust writer does not share: `schemaVersion`, `sourceEntryCount`
  integrality, `segments.length` bounds, per-index `segment`/`segmentId`/`status` sequence, the
  requirement that a closed segment carry `compactionEntryId` **and** `retainedTailFromEntryId`,
  `assertId` on six coordinate fields, and type/format checks on `turnCount`, `summaryHead`,
  `openedAt`, `closedAt`.

There is also a third derivation, `deriveConversationSegmentManifest`, in the same TypeScript module as
the parser but **not** the writer of this file.

A manifest Rust just wrote can therefore be unreadable to the renderer, and nothing reconciles the two.

**And the two outcomes are one value apart, which is §5b inverted.** An *absent* manifest is benign:
`value === null` → `undefined` → `if (manifest)` is false → publication is skipped and settlement
continues. An *unparseable* manifest is fatal: it throws inside `load_segments`, which fails
`save_projection`, which fails the settlement. Absence and invalidity produce opposite severities on
the same read path.

### Why the exact predicate is not recoverable, and why that does not block the fix

`parseConversationSegmentManifest` returns `undefined` for every rejection, discarding which predicate
fired. The `mirror-mind` manifest has since been rewritten and now parses, so the bytes as of
`11:59:46Z` are gone. The determinism claim is separately falsified: `comercial`, also created
2026-10-06, settled its first turn through all nineteen phases.

So the fix cannot be "repair the predicate that fired". It is to make the next occurrence name itself,
and to decide whether this rejection should end a settlement at all.

### Slices

- **D1 — the parser says why.** `parseConversationSegmentManifest` returns a discriminated result
  carrying a stable machine reason (`schema_version`, `authority_mismatch`, `segment_sequence`,
  `closed_checkpoint_missing`, `coordinate_invalid`, `chapter_evidence_invalid`, …) instead of
  `undefined`. **What it accepts does not change.** Both call sites (`:29`, `:102`) include the reason
  in the thrown message, so CR121's `failure.reason` names the predicate on the next occurrence.
- **D2 — decide the severity, and write the decision down.** A manifest that cannot be parsed is a
  diagnostic failure, not a reason to abandon a settled turn: publication is already skipped when the
  manifest is absent, and `App.tsx:2481` already tolerates a failing refresh with `.catch(() => undefined)`.
  D2 makes `load_segments` treat an unparseable manifest the way it treats an absent one — skip
  publication, continue settlement — **while recording the reason**, so the turn settles and the defect
  stays visible.
- **D3 — a conformance test between the two derivations.** A test that feeds representative Pi sessions
  (including a first turn with no compaction, and a session with compactions) through the Rust writer
  and asserts the TypeScript parser accepts every manifest it produces. This is what would have caught
  the disagreement before production, and it is the slice most likely to find the real predicate.

### Files

- `src/domain/conversationSegments.ts` — D1.
- `src/app/conversationSegmentStorage.ts` — D1 at both call sites, D2 at `loadConversationSegments`.
- `src/app/App.tsx` — D2 at `load_segments` in `saveProjectedTurnLifecycle` if the tolerance belongs there.
- `src/tests/conversationSegments.test.ts` — D1 reasons.
- `src/tests/conversationSegmentStorage.test.ts` — D2 tolerance and that the reason is still recorded.
- A new cross-derivation test for D3.

### Acceptance

- A manifest rejected by the parser produces a `failure.reason` in the settlement timing record that
  **names the predicate**, not a generic message.
- The set of manifests the parser accepts is **unchanged**. Every manifest in the production store that
  parses today still parses, and no manifest that is rejected today becomes accepted.
- A settlement whose `load_segments` cannot parse the manifest **completes**, with `publish_segments`
  skipped and the reason recorded — the same shape as an absent manifest, which already behaves this way.
- Every manifest the Rust writer produces for the test sessions is accepted by the parser, or the
  disagreement is identified and recorded.
- Replayed over the production store: every existing manifest's parse verdict is unchanged.

### Validation

- `npx tsc --noEmit`, full `vitest`, `cargo test`, `npm run build`, `npm run roadmap:check`.
- A read-only replay of `parseConversationSegmentManifest` over every manifest in
  `~/Library/Application Support/ai.mirrormind.desktop/conversation-segments/**/generation-*.json`,
  before and after, asserting identical verdicts.
- Field verification is owed and cannot be forced: the next new Journey whose first settlement fails
  must name its predicate. Note that `comercial` shows this does **not** happen on every new Journey.

### Exclusions

- **The receipt-ordering story is abandoned.** `load_conversation_segment_projections`
  (`src-tauri/src/main.rs:5015`) and its `complete.json` requirement are **not** in scope. That loader
  serves Journey open, not settlement, and the capture's attribution to it was wrong.
- **Not reconciling the three derivations into one.** D3 only proves they agree on representative
  input. Unifying them is larger work and may not be desirable — the Rust writer and the TypeScript
  parser are a producer and a boundary check, and a boundary check that shares its producer's code
  stops being one.
- **Not loosening a single predicate.** Tolerance is added at the *call site*, where severity is
  decided; the parser keeps its strictness.
- **Not the recovery collector.** That `recoverPostTerminalPersistence` (`App.tsx:3562`) opens no
  collector is confirmed again and is captured separately.
- **No repair of the `mirror-mind` manifest.** It parses now.
