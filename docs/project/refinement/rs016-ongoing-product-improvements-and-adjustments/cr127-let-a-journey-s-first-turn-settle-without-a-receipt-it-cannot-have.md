[< RS016](index.md)

# CR127: Let a Journey's First Turn Settle Without a Receipt It Cannot Have

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr127-let-a-first-turn-settle-without-a-receipt-it-cannot-have`

## Friction

The first settlement of every newly created Journey fails its inline path. It is repaired by
recovery, so the Navigator usually sees nothing — but the turn is recorded as a failure, the
instrument reports a failure that was in fact completed, and the repair depends on a path that has
its own refusal conditions.

Observed live on `alpha.38` in the Journey `mirror-mind`, whose first Desktop settlement was 2026-10-06 (the Journey has existed in Mirror since 2026-08-27; "created" was wrong). Its first settlement:

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

**The determinism claim is also false.** `comercial`, whose first Desktop settlement was also 2026-10-06 (in Mirror since 2026-08-10), settled its
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

## Implementation and closure (2026-10-08)

### The plan's central premise was wrong, and the slice it doubted is what disproved it

The plan stated that the exact predicate was **not recoverable** — the `mirror-mind` manifest had
since been rewritten, so the bytes as of `11:59:46Z` were gone — and concluded that *"the fix cannot
be 'repair the predicate that fired'"*.

That conclusion was correct about the **artifact** and wrong about the **producer**. The bytes were
unrecoverable; the rule that generated them was not. D3 was described as *"the slice most likely to
find the real predicate"*, and it found it on the first run.

The method that worked is worth keeping: rather than trying to recover a lost output, exercise the
**writer** across its input space and ask the **parser** to accept each result.

### Root cause, established and proven in both languages

`active_pi_session_entries` returns an **empty** vector for a Pi session whose only line is the
`session` header — the state of a Journey that has never produced a turn. With no entries,
`project_conversation_segment_manifest` had nothing to name as the chapter's first or last entry, and
`json!({ "sourceFromEntryId": source_from, ... })` serialized `Option::None` to **`null`** rather than
omitting the key.

The parser's coordinate check is `if (segment[key] !== undefined)`. Since `null !== undefined`, it
entered the branch, found `typeof null === "object"`, and rejected the manifest — which threw inside
`load_segments`, failed `save_projection`, and failed the settlement.

**The parser was right and the writer was wrong.** Absent is the contract for a coordinate that does
not exist; `null` was never part of it.

### The defect was still live in production, in a Journey the roadmap already lists as blocked

A read-only replay over all **23** manifests in the production store found exactly **one** the parser
refuses today:

```
o-sentido-do-ser/nautilus-thread-o-sentido-do-ser/generation-1.json   (mtime Sep 30 10:01)
rejection: coordinate_invalid (segment 1, sourceFromEntryId)
{"segment":1,"segmentId":"segment-1","sourceFromEntryId":null,
 "sourceThroughEntryId":null,"status":"current","turnCount":0}   sourceEntryCount: 0
```

`o-sentido-do-ser` is one of the **five Journeys holding a manifest with no receipt and no chapter
files**. ~~This explains **one** of the five and no more.~~

**Corrected 2026-10-08 by field verification.** The scope was understated. The zero-entry projection
happens at generation activation on every newly created Journey, so the exposure was never one
artifact — it was every new Journey's first turn. See *D4 verified in the field* below.

The other two with the same symptom, `mirror-mind-website` (51 entries, 2 turns) and
`vida-consultiva` (25 entries, 1 turn), carry healthy manifests with real coordinates that parse;
**their cause remains unestablished.** The remaining two, `nautilus-agentic-method` and
`nova-acropole`, do have receipts and payloads, so the roadmap's grouping of five was already too
broad.

**Whether `mirror-mind`'s original failure was this instance is still not established** and is not
claimed. Its manifest parses now and the bytes are gone. What is established is that the mechanism
exists, produces exactly the recorded reason, and was present in the store.

### Slices

- **D1 — the parser names its predicate.** `parseConversationSegmentManifest` returns
  `{ ok: true, manifest }` or `{ ok: false, rejection }` where the rejection carries one of twelve
  stable reasons plus the authority field or segment key that failed and the 1-based segment number.
  `describeConversationSegmentManifestRejection` renders it as one bounded line a record can hold.
  **What the parser accepts is unchanged** — every predicate was preserved, only decomposed so each
  can name itself.
- **D2 — the call site decides severity.** `loadConversationSegments` returns
  `absent | manifest | unreadable` instead of returning `undefined` for one and throwing for another.
  In settlement, `unreadable` now skips publication exactly as `absent` always has, records the reason,
  and **the turn settles**. `refreshConversationSegments` deliberately still throws, with the predicate
  in the message: that path has just derived the manifest, so an unreadable one is a live
  producer/parser disagreement at its most diagnosable, and a settled compaction's publication is the
  one case where skipping would lose a closed chapter.
- **D3 — cross-language conformance.** A Rust golden-file test emits the writer's own output for five
  representative sessions (`fresh_session_no_entries`, `messages_without_compaction`, `one_compaction`,
  `two_compactions`, `compaction_with_chapter_evidence`) to
  `src/tests/fixtures/conversationSegmentManifests.json`; `cargo test` fails when the committed fixture
  is stale, and regeneration is deliberate (`CR127_WRITE_FIXTURE=1`). A vitest then asserts the parser
  accepts every one. The parser is now tested against **real producer output** rather than against JSON
  a test author believed the producer emits.
- **D4 — the producer stops emitting `null`** (not in the plan; added because D3 recovered the
  predicate the plan had written off). `set_optional_entry_id` omits a coordinate the projection does
  not have. Only `sourceFromEntryId` and `sourceThroughEntryId` could ever be null; the other four
  coordinates come from `?`-checked values or are set inside an `if let`.

### A new place to record a tolerated defect

Making an unreadable manifest non-fatal created a gap: `failure` can only describe a settlement that
ended badly, so a settlement that meets something wrong, handles it and completes had **nowhere to say
what it met**. `SettlementDiagnostic { phase, reason }` and an optional `diagnostics` array on
`SettlementTimingRecord` are that place. The field is omitted entirely when nothing was met, reasons
are bounded by CR121's rule, `registry.note` drops a note when no collector owns the Journey exactly as
`registry.time` falls through, and the module's never-writes constraint is untouched — still one write
per turn, after the work.

### Validation

| gate | result |
|---|---|
| `npx tsc --noEmit` | clean |
| `vitest` | **239 files / 1,755 tests** (from 237 / 1,732) |
| `cargo test` | **269 passed**, 3 ignored (from 267) |
| `npm run build` | clean |
| `npm run roadmap:check` | READY |

**Verdict-preservation replay (the acceptance that mattered).** Both parsers — the committed one from
`2b34ec9` and the new one — were bundled from real source and run over all 23 production manifests:

```
identical verdict : 23      DIVERGED : 0
  accepted by both : 22
  rejected by both : 1      (o-sentido-do-ser, coordinate_invalid)
authority mismatch refused by both : true
```

No manifest that parsed before stops parsing, and none that was rejected becomes accepted. The one
pre-existing rejection is unchanged in verdict and merely gains a name.

Two guards were **re-aimed, not deleted**: the generation-scoped load assertion now expects the
three-way result, and the settlement ordering guard was re-anchored because the ternary became a branch
— the ordering it guards is unchanged.

### Debt

- ~~**Field verification is owed and now has a concrete trigger.** `o-sentido-do-ser` still holds the
  null-coordinate manifest. After release, a settlement on that Journey should **complete** and carry
  `conversation_segment_manifest_unreadable: coordinate_invalid (segment 1, sourceFromEntryId)` in its
  timing record's `diagnostics`. That is a nameable, observable event rather than a wait.~~
  **Superseded 2026-10-08: the trigger was wrong and executing it destroyed the instance. See
  Field verification below.**
- **The stale manifest is not repaired.** D4 stops new ones; it does not rewrite existing ones. That
  manifest heals only when a refresh rewrites it, and nothing is lost in the meantime because its
  session has zero entries — there is no conversation to chapter. No backfill was performed.
- **The two unexplained manifest-only Journeys remain unexplained.** `mirror-mind-website` and
  `vida-consultiva` parse cleanly and still have no receipt and no payloads. A candidate CR, not
  captured here. **Amended 2026-10-08:** they parse cleanly *now*. Having watched a refresh erase
  `o-sentido-do-ser`'s evidence, the honest statement is that their manifests may have been
  null-coordinate files at the time their settlements failed and been rewritten since. That is a
  possibility, not a claim, and it is unfalsifiable from the surviving artifacts.
- **`diagnostics` has one producer and no reader.** Nothing on the surface or in the diagnostics
  scripts reads the field yet, which by this project's own rule makes it debt until something does.
- **The three derivations are still three.** D3 proves the Rust writer and the TypeScript parser agree
  on five representative shapes, not that they agree in general, and `deriveConversationSegmentManifest`
  was not brought into the comparison.
- **`§5b` is narrowed here, not resolved.** Absence and invalidity no longer carry opposite severities
  on this one read path. The standing finding that absence and emptiness are the same value across the
  load path is untouched.

## Field verification (2026-10-08)

Collected on `v0.2.0-alpha.42` in production, binary
`6dad00b18ece928df66065d3b06200f9947e41e5dd820784b61faf5e9647f5a1`, after the Navigator took one turn
in `o-sentido-do-ser`. Journey authority for the work remains `mirror-desktop`; the Journey read is
named here as provenance.

### The Journey settles, and it had never settled before

| record | value |
|---|---|
| journal `phase` | `settled` |
| journal `revision` | 5 |
| `recoveryDisposition` | `complete` |
| turn created | `2026-10-08T17:12:30.667Z` |
| journal last updated | `2026-10-08T17:12:48.483Z` (17.8 s end to end) |
| settlement `outcome` | `settled` |
| settlement window | `17:12:47.070Z` → `17:12:48.571Z` (1.5 s, 19 phases) |

`publish_segments` ran and completed in 86 ms, and the full Mirror chain ran behind it —
`create_outbox_item`, `enqueue_outbox_item`, `advance_journal`, `deliver_outbox_item`,
`save_post_frontier_projection`, `acknowledge_outbox_item`. This Journey was one of the five holding a
manifest with no receipt and no chapter payloads. It now has a settlement record.

### The predicted diagnostic did not appear, and the prediction was wrong

`diagnostics` is **absent** from the record. The expected
`conversation_segment_manifest_unreadable: coordinate_invalid (segment 1, sourceFromEntryId)` never
fired, because the condition no longer existed when the settlement read it.

The manifest was re-derived at **`17:12:17Z`, thirty seconds before the settlement began**, from a Pi
session that now holds **59** entries. The defect only occurs when the session has **zero** entries,
so the writer emitted real coordinates and the file became valid:

```
sourceFromEntryId    : "c455a245"      (was null)
sourceThroughEntryId : "5606797e"      (was null)
sourceEntryCount     : 59              (was 0)
turnCount            : 3               (was 0)
```

### The verification consumed its own evidence

**No manifest on this machine carries a null coordinate or a zero source count any more** — checked
across all **178** manifests on disk. The single instance this CR identified is gone, overwritten by
the refresh that the act of verifying provoked.

The failure was foreseeable from this document. The debt line immediately below the trigger said *"that
manifest heals only when a refresh rewrites it"*. Two adjacent debt lines, one naming an artifact as the
trigger and the other predicting that artifact's destruction, written in the same pass, and the
contradiction went unnoticed. **A trigger that is a decaying artifact must be read against everything
else known about its decay.**

### What this does and does not establish

**Established.** `o-sentido-do-ser` settles end to end on alpha.42, publishes chapters, and reaches
Mirror. A Journey that had no receipt now has one.

**Not established, and not claimed.** That CR127's tolerance (D2) is what made this work. By the time
`load_segments` ran, its input was valid, so the pre-CR127 strict path would very likely have accepted
it too. One thing CR127 may have carried is the display load at ~`17:12:17Z`, which read the still-invalid
on-disk manifest while the pre-CR127 path was strict and threw; whether that throw would have blocked
opening the Journey cannot be determined from these records, and the artifact is now overwritten.

**D2 has no remaining field trigger.** The tolerance can only be exercised against a legacy
null-coordinate file, D4 guarantees no new one is written, and none remain. The branch is reachable in
test and currently unreachable in the field — debt of the same family as a field with no reader.

### The probe worth running next, with its uncertainty stated

A brand-new Journey's first turn is the nearest available exercise of the original scenario, and it
verifies **D4** rather than D2: the writer must omit absent coordinates instead of writing `null`.

It may not reproduce the zero-entry projection at all. The Sep 30 artifact shows the manifest was
projected while the session still had no entries even though turns existed, which implies a flush
ordering that is not understood and was never characterised. So this is the best available probe, not
a reliable reproduction, and it is recorded that way rather than as a plan.

### D4 verified in the field, and the scope was larger than this CR claimed (2026-10-08)

The Navigator created a Journey named `Journey nova` (`journey-nova`) and took one turn. This is the
probe recorded above as *"the best available probe, not a reliable reproduction"*. **It reproduced
exactly.**

**The zero-entry projection happens at generation activation, before any turn exists.** The manifest
was written at `18:05:22.894Z`, the same instant as the conversation's `createdAt` and ten seconds
after the Journey was created at `18:05:12.130Z`. The first turn was not created until
`18:05:44.610Z`, twenty-two seconds later.

```
conversation-segments/journey-nova/nautilus-thread-journey-nova/generation-1.json
{
  "generation": 1,
  "journeyId": "journey-nova",
  "piSessionId": "nautilus-journey-nova-g1-18dca00b1bb960e8",
  "schemaVersion": "1.0.0",
  "segments": [ { "segment": 1, "segmentId": "segment-1", "status": "current", "turnCount": 0 } ],
  "sourceEntryCount": 0,
  "threadId": "nautilus-thread-journey-nova"
}
```

**`sourceFromEntryId` and `sourceThroughEntryId` are absent, not `null`.** That is precisely what D4
changed, observed in production on the exact input that used to produce the defect.

**The turn settled.** Journal `phase: settled`, `revision` 5, `recoveryDisposition: complete`,
`18:05:44.610Z` → `18:05:50.527Z`. Settlement `outcome: settled`, 19 phases all `completed`,
`18:05:49.222Z` → `18:05:50.613Z` (1.39 s), with `load_segments` at 2 ms and `publish_segments`
completing in 79 ms. `failure` and `diagnostics` are both absent — correctly, because an absent
coordinate is valid and there was nothing to tolerate or report.

**This settles the flush ordering this document said was not understood.** The earlier note called the
Sep 30 artifact's ordering *"a flush ordering that is not understood and was never characterised."* It
is now characterised: the manifest is projected when the generation is activated, when the Pi session
file holds only its `session` header, and the turns arrive afterwards. `o-sentido-do-ser`'s artifact is
the same event, followed by three turns that never triggered a re-derivation.

**So the scope was understated, and the correction matters.** The claim *"this explains one of the five
and no more"* was wrong about exposure. Pre-CR127, **every newly created Journey's first turn met a
null-coordinate manifest**, because the writer emitted `null` at activation and the parser rejected it,
which threw inside `load_segments`, failed `save_projection` and failed the settlement.

The basis for each link, so this is traceable rather than asserted: the activation-time zero-entry
projection is observed directly above; the old writer's `null` is established by the Rust code path and
by D4's guard; the old parser's rejection is established by this CR's verdict-preservation replay, where
the baseline parser refused this exact shape; and the rejection-to-failure chain is this CR's root cause.

What tempers it: a Journey escaped if something re-derived the manifest between activation and
settlement. Nothing did here — the manifest's mtime stayed at `18:05:22` while settlement ran at
`18:05:49`.

**D2 still has no field trigger.** The file `journey-nova` produced is *valid*, because absent
coordinates are what the parser wants. The tolerance path can only be reached by a legacy `null` file,
and none exist. Unchanged by this verification.

**Residue.** `journey-nova` now exists in Mirror as a real Journey, created as a probe. Like `teste`, it
is left in place; removal would need explicit intent naming it.
