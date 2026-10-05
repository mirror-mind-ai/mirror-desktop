[< RS016](index.md)

# CR122: Make the Checkpoint Count the Same Thing Every Turn

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr122-harness-checkpoint-identity`

## Problem

Since `v0.2.0-alpha.31` shipped CR114, the harness checkpoint `checkpoints.harness.messageCount`
has recorded the length of whatever the surface had loaded at the moment a turn committed. Before
CR114 the surface always held complete history, so that length *was* the history. Since CR114 the
surface holds the current chapter by default and complete history only after the Navigator asks for
it. The same field now means two different things on two different turns of the same Journey.

The reconciliation guard `checkpointRegressed` compares the new value with the old one and, when a
bounded-surface commit follows a complete-surface commit, declares `checkpoint_regression`. That
refusal returns without recording the turn's harness evidence. The turn's `harness` body stays
`pending` forever, the checkpoint never advances, and every following bounded commit regresses too.

A turn with a pending harness body then fails settlement: `createMirrorAppendOutboxItem` throws
`mirror_append_item_authority_invalid` on exactly that condition. Recovery's Pi-backed delivery takes
a different authority path and lands the content in Mirror roughly forty seconds later. The Navigator
sees a long `Finishing`; the ledger keeps a turn it can never repair; the Journey is classified
`conflicted` permanently, because no reason code is ever cleared.

This is the defect behind CR121's failure signature, a large share of CR119's `Finishing` tail, and
the `conflicted` state of three Journeys. It was found by pursuing an open question in
[the settlement model](../../../architecture/settlement-durable-state-model.md), §5a.

## Evidence

Read-only, production store, 2026-10-04 / 05, application `0.2.0-alpha.34`. Every number is
reproducible with `scripts/diagnostics/settlement_classify.py` sections G–I.

**The checkpoint tracks the surface, not the history.** Chapter snapshots carry the reconciliation
state at publication:

| Journey | chapters | surface length | harness checkpoint |
|---|---|---:|---:|
| `livro-lideranca-soberana` | segment-6 → 7 | 37 → 19 | 303 → 320 |
| `mirror-desktop` | segment-29 → 31 | 30 → 17 | 2,192 → 2,331 |
| `alissonvale-com` | segment-8 → 9 | 4 → 77 | 332 → 481 |

The checkpoint advanced only on turns where complete history happened to be loaded; it is a record of
the Navigator's navigation, not of the conversation.

**Refused commits accumulate.** 17 turns with `pi: committed` and `harness: pending`:
`livro-lideranca-soberana` 10, `alissonvale-com` 5, `mirror-desktop` 2. All dated 2026-10-04 or
later. Two of the 17 were refused in the minutes this capture was being written.

**The content is safe.** 15 of the 17 have both messages in Mirror's database, matched by
`sourceTurnId`; the remaining two are seconds old and in recovery. Nothing has been lost. The damage
is a ledger that cannot describe its own turns and a settlement that routinely fails first.

**It is CR121's throw.** Of 14 `failed` settlement timing records, 8 sit on these turns; all 14 stop
after `cleanup_lease`, immediately before step 8 where `createMirrorAppendOutboxItem` runs untimed.

**Two more Journeys are primed.** `venda-de-livros` (checkpoint 122, surface 24) and `fabio-henri`
(55, 26) will regress on their next completed turn.

**It is visible to the Navigator right now.** `classifyDedicatedTurnState` returns
`projection_pending` when `pi` is committed and `harness` is not, and
`dedicatedTurnBlocksNewInvocation` returns `true` for that state
(`src/domain/dedicatedTurnCommit.ts:11-24`). Checked against the live store: the latest turn in
`alissonvale-com` and in `livro-lideranca-soberana` is a refused commit, so **both Journeys block the
Composer**. This stops being a silent accounting defect at that point.

**The classifier is a ratchet.** 12 of 20 Journeys are `conflicted`. `isConflictReason()` returns
`true` for every code and `clearNonConflictReasons()` returns its input unchanged
(`src/domain/conversationReconciliation.ts:401-407`). Nine of the twelve carry only
`native_id_mismatch`, from re-commits as early as September; a Journey that re-committed once
reads `conflicted` indefinitely.

**The Mirror checkpoint has the same shape.** `checkpoints.mirror.messageCount` is produced by three
different rules — previous plus two (`src/domain/mirrorAppendOutbox.ts:182`), the count Mirror
reported (`src/domain/threeBodyTurnCommit.ts:268`), or `max(previous, 2)` when Mirror reported none
(`:212`) — and fed to the same regression guard.

## Mechanism

```text
CR114 bounds the surface
  → commitHarnessTurn records surface.length as the checkpoint  (threeBodyTurnCommit.ts:287)
  → a bounded commit after a complete one "regresses"           (conversationReconciliation.ts:236)
  → conflict() appends a reason and skips replaceTurn           (:388-399)
  → harness body stays pending, checkpoint frozen
  → createMirrorAppendOutboxItem throws on pending harness      (mirrorAppendOutbox.ts:117)
  → settlement fails after cleanup_lease; CR119 records "failed" with no phase to blame
  → recovery delivers by Pi-backed authority ~40 s later; Finishing stretches to cover it
  → reason code is permanent; Journey reads conflicted forever  (:401-407)
```

Six behaviours, each locally defensible. One defect: a field with two meanings guarded as if it had
one.

## The trap found while planning

D3 could not be implemented as recommended without first removing a landmine.

`parseConversationReconciliationState` ends with:

```ts
if (deriveClassification(candidate) !== candidate.classification) return undefined;
```

It **validates a derived field against the stored copy**. `persistedJourneyConversation.ts:156-159`
turns that `undefined` into `undefined` for the entire persisted conversation, so the stored ledger
is treated as absent. `preserveDurableConversationHistory(stored?.messages, projected)` then receives
`undefined` for `previous` and returns the projection verbatim — **the durable history is replaced by
the loaded window**.

So changing the derivation rule naively would make the ledgers of the 12 `conflicted` Journeys
unparseable and discard their durable history on the next save.

**Then the trap turned out to be already sprung.** Replaying the shipped derivation against every
stored ledger shows **three that the shipped build cannot parse right now**, because their stored
`classification` is `commit_pending` while the rule derives `in_sync`:
`nautilus-agentic-method`, `softwarezen`, `venda-de-livros`. Each reads as absent on every load.

And the consequence is visible in one of them. `venda-de-livros` has a harness checkpoint of **122**
over a stored array of **24** messages — the signature of a ledger that was replaced by the loaded
window. The chain is code, not inference:

```text
parseConversationReconciliationState rejects the stale derived field   (conversationReconciliation.ts)
  -> parsePersistedJourneyConversation returns undefined               (persistedJourneyConversation.ts:156)
  -> loadDedicatedJourneyConversation returns undefined                (journeyConversationStorage.ts:84)
  -> projectionForStorage passes undefined as `previous`               (journeyConversationStorage.ts:23)
  -> preserveDurableConversationHistory returns the window verbatim    (durableConversationHistory.ts:26)
  -> the file is overwritten with the current chapter
```

This is a mechanism for the 2,203 → 54 message drop recorded after the `alpha.33` upgrade and marked
unprovable at the time. It is **established as a live defect in three Journeys** and offered as the
**plausible, still unproven** explanation of that specific historical drop — no staging residue
survives to tie it to that event.

This makes a fourth decision mandatory and first in order.

## Scope

Four decisions, in dependency order. All four approved by the Navigator on 2026-10-04.

**D0 — A derived field is recomputed on read, not validated on read.**
`parseConversationReconciliationState` stops rejecting a record whose stored `classification`
disagrees with the derivation, and returns the record with `classification` recomputed. `reasonCodes`
and every turn body are preserved untouched. This is both the migration path for D3 and the removal
of a trap in which any future change to a derivation rule silently discards stored history.

**D1 — The harness checkpoint gets a quantity that does not depend on what is loaded.**
`HarnessCheckpoint` gains `committedTurnCount`: the number of turns whose harness body is committed.
It is monotone by construction, owned by the same artifact, and needs no new read. The regression
guard moves to it. `messageCount` is kept — removing it would invalidate every stored record — and is
demoted to what it has actually always been: the surface length when the checkpoint was written. It
is documented as descriptive and is guarded by nothing.

**D2 — A refused commit records the turn's evidence.** In the checkpoint-regression branch of
`observeHarnessTurnCommit`, `observePiTurnCommit` and `observeMirrorTurnCommit`, the body evidence is
recorded and the reason code appended, while the **existing checkpoint is kept** so a regression
cannot pull a checkpoint backwards. The `native_id_mismatch` branches are deliberately left alone:
there the body is already committed and overwriting it would destroy the first commit's record.
Applying D2 to all three bodies rather than only the one with a demonstrated defect is a deliberate
widening — leaving two of three on the old behaviour is the local reasoning this CR exists to stop.

The 17 already-stuck turns are healed by `healRefusedHarnessCommits`, applied where stored state
becomes live state (after parse, in `persistedJourneyConversation`). A turn qualifies when `pi` is
committed, `harness` is `pending`, and both harness message ids are already staged on the body — the
refusal recorded the ids and withheld only the state. Nothing is invented.

**D3 — `isConflictReason` finally means what its name says.** Today it returns `true`
unconditionally. It becomes true only for the codes that describe an artifact bound to the wrong
thing — `turn_identity_mismatch` and `mirror_conversation_mismatch` — which must not auto-clear.
`native_id_mismatch` and `checkpoint_regression` become advisory history: recorded in `reasonCodes`
forever, no longer pinning the classification. Nine of the twelve `conflicted` Journeys carry only
`native_id_mismatch` and will reclassify to their true present state. The no-op indirection
`clearNonConflictReasons` is removed rather than left to imply a clearing that never happened.

**Also inside scope, small:** `interruptDedicatedTurn` marks `mirror` as `failed` alongside `pi`, so
a cancelled send stops reading as delivery debt.

**Explicitly outside scope:** the Mirror checkpoint's three producers (same class, recorded, its own
change); the `mirror` checkpoint comparison in `turnFinalizationCoordinator.ts:156`, which has the
same window-dependence shape but guards projection choice rather than commit admission; CR120; and
CR121's instrument work, which this CR narrows rather than absorbs.

## Slices

1. **D0**: parse recomputes `classification`. Guards the migration before anything else moves.
2. **D1**: `committedTurnCount` added, written by `commitHarnessTurn`, guarded instead of
   `messageCount`.
3. **D2**: the regression branches record evidence; `healRefusedHarnessCommits` heals stored turns.
4. **D3**: `isConflictReason` restricted to identity codes; `clearNonConflictReasons` removed.
5. **Small**: `interruptDedicatedTurn` fails the `mirror` body too.

## Files expected to change

- `src/domain/conversationReconciliation.ts` — `HarnessCheckpoint`, `observeHarnessTurnCommit`,
  `observePiTurnCommit`, `observeMirrorTurnCommit`, `parseConversationReconciliationState`,
  `deriveClassification`, `isConflictReason`, `clearNonConflictReasons` (removed),
  `healRefusedHarnessCommits` (new)
- `src/domain/threeBodyTurnCommit.ts` — `commitHarnessTurn`
- `src/domain/dedicatedTurnCommit.ts` — `interruptDedicatedTurn`
- `src/domain/persistedJourneyConversation.ts` — apply the heal at the read boundary
- `src/tests/conversationReconciliation.test.ts`, `src/tests/threeBodyTurnCommit.test.ts`,
  `src/tests/mirrorAppendOutbox.test.ts`, `src/tests/persistedJourneyConversation.test.ts` — the
  tests that currently defend regression-as-refusal and classification-as-validated
- `src/tests/harnessCheckpointIdentity.test.ts` (new) — the CR's own guards
- `docs/architecture/settlement-durable-state-model.md` §4 Class 2 table and §5a
- `scripts/diagnostics/settlement_classify.py` — sections G and H should read zero afterwards

## Acceptance

- A stored ledger whose `classification` disagrees with the derivation **parses**, keeps its turns,
  checkpoints and reason codes, and comes back with the classification recomputed.
- A bounded-surface commit following a complete-surface commit records harness evidence and does
  **not** raise `checkpoint_regression`.
- A genuine regression in `committedTurnCount` still raises it, and still records the evidence.
- No turn in the production store has `pi: committed` with `harness: pending` after the repair pass;
  section G of the diagnostics reads zero.
- A settlement whose turn committed normally does not reach `createMirrorAppendOutboxItem` with a
  pending harness body; the `failed` timing-record rate for this cause drops to zero over one day of
  ordinary use in `livro-lideranca-soberana`.
- A cancelled send leaves no `mirror: pending` body.
- Whatever D3 decides is visible: either the surface explains a permanent `conflicted`, or a Journey
  with no current conflict stops reading as one.

## Verification against the production store

Read-only replay of the implemented rules against all 20 Journeys, 2026-10-05.

| Result | Count |
|---|---|
| Refused harness bodies healed | **28** |
| Composers released from `projection_pending` | **2** — `alissonvale-com`, `livro-lideranca-soberana` |
| Journeys reading `conflicted` afterwards | **0**, from 12 |
| Unparseable ledgers made readable | **3** |

After the change the 12 `conflicted` Journeys resolve to their real present state: 9 `in_sync`,
3 `commit_failed` (genuine interrupted turns), 1 `commit_pending`. No Journey is left reporting a
conflict it does not have, and none of the reason codes were deleted.

**The heal does not claim storage that did not happen.** Every one of the 28 turns it would commit
has *both* of its messages already present in the ledger's own message array — checked individually,
28 of 28, none partial. The refusal withheld a state flag from a turn whose content was already
stored. That is the whole safety argument for healing on read, and it is measured rather than
assumed.

**The defect is accumulating during the work on it.** The same count read three times in one session:
**17** at capture, **24** at implementation, **28** at verification. That rate is why this was pulled
ahead of CR120, and it is worth stating plainly that the fix only takes effect where it is installed:
production is on `alpha.34` and will keep accumulating stuck turns, with two Journeys' Composers
blocked, until a release carries this.

## Validation

- Unit: the regression guard fed a shrinking surface and a growing turn count; a refused commit that
  still records evidence; a stored record with a stale classification; a stuck turn healed from
  staged ids; an interrupted turn's three bodies.
- Source guard: a test asserting `parseConversationReconciliationState` has no classification
  equality rejection, so the trap cannot be reintroduced.
- Replay: `scripts/diagnostics/settlement_classify.py` against the production store before and after
  the repair pass, sections G, H, I.
- Field: one day of ordinary use on Dev in a Journey that currently regresses, reading the
  settlement-timings file for `failed` records with `cleanup_lease` as the last phase.

## Relationship to open work

- **CR121** keeps its instrument improvements (carry the error, time steps 7–8) and loses its
  mystery: this CR names the throw. CR121 was narrowed to the instrument when this CR was planned.
- **The Composer block** means this is not only an accounting fix. Two Journeys cannot be written to
  right now; the heal in D2 releases them.
- **CR119 slice 4** (the production reading of the Finishing tail) should be re-read after this
  ships; a large part of the tail is predicted to be this recovery detour.
- **CR120** is independent and unaffected.
- **CR114** is the trigger, not the cause. Bounding the surface was right; letting a surface length
  pose as a history length was the latent defect it exposed.
