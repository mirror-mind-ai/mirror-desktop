[< RS016](index.md)

# CR122: Make the Checkpoint Count the Same Thing Every Turn

**Status:** captured
**Driver:** —
**Delivery:** —

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

## Proposed scope

Three decisions, in dependency order. The first is the fix; the other two are what the fix exposes.

**D1 — Give the harness checkpoint one definition that does not depend on what is loaded.**
Candidates: the count of committed turns in `reconciliation.turns`, which is monotone by
construction; or the Pi entry count already carried as `checkpoints.pi.entryCount`. Recommendation:
committed-turn count, because it is owned by the same artifact, needs no new read, and a regression
in it is a genuine corruption signal rather than a navigation artefact. `messages.length` must stop
feeding the guard.

**D2 — A refused commit must not erase the turn's own evidence.** `conflict()` should record the
harness body as committed *and* append the reason; classification is a judgement about the state, not
a veto on facts the turn already established. This alone unsticks future turns and removes the step-8
throw for this cause. The 17 existing stuck turns need a one-time pass that commits their harness body
from the evidence already present; that pass is part of this CR, not a separate repair.

**D3 — Decide whether a conflict can clear.** Today it cannot, by code. Options: (a) keep the
ratchet and say so in the surface; (b) recompute `classification` from the current turns on every
successful commit, keeping `reasonCodes` as history; (c) clear a reason when its condition is no
longer observable. Recommendation: (b). It preserves the audit trail and lets a Journey that is fine
now say so. This is a product decision and is recorded here for the Navigator, not made.

**Also inside scope, small:** `interruptDedicatedTurn` should mark `mirror` as `failed` alongside
`pi`, so a cancelled send stops reading as delivery debt (4 phantom turns in the store).

**Explicitly outside scope:** the Mirror checkpoint's three producers (recorded; same class, its
own change); CR120 (unrelated write-order defect); the content of CR121 beyond this cause (the record
should still carry the error, and steps 7–8 should still be timed — that remains CR121's).

## Files expected to change

- `src/domain/conversationReconciliation.ts` — `observeHarnessTurnCommit`, `conflict`,
  `deriveClassification`, `isConflictReason`, `clearNonConflictReasons`
- `src/domain/threeBodyTurnCommit.ts` — `commitHarnessTurn`
- `src/domain/dedicatedTurnCommit.ts` — `interruptDedicatedTurn`
- one-time harness-body repair for already-stuck turns, run through the ordinary load path
- `src/tests/conversationReconciliation.test.ts`, `src/tests/threeBodyTurnCommit.test.ts`,
  `src/tests/mirrorAppendOutbox.test.ts`, `src/tests/journeySettlementRecovery.test.ts` — the
  tests that currently defend regression-as-refusal
- `docs/architecture/settlement-durable-state-model.md` §4 Class 2 table, once the definition
  changes
- `scripts/diagnostics/settlement_classify.py` — sections G and H should read zero afterwards

## Acceptance

- A bounded-surface commit following a complete-surface commit records harness evidence and does
  **not** raise `checkpoint_regression`.
- No turn in the production store has `pi: committed` with `harness: pending` after the repair pass;
  section G of the diagnostics reads zero.
- A settlement whose turn committed normally does not reach `createMirrorAppendOutboxItem` with a
  pending harness body; the `failed` timing-record rate for this cause drops to zero over one day of
  ordinary use in `livro-lideranca-soberana`.
- A cancelled send leaves no `mirror: pending` body.
- Whatever D3 decides is visible: either the surface explains a permanent `conflicted`, or a Journey
  with no current conflict stops reading as one.

## Validation

- Unit: the regression guard fed a shrinking surface and a growing turn count; a refused commit that
  still records evidence; an interrupted turn's three bodies.
- Replay: `scripts/diagnostics/settlement_classify.py` against the production store before and after
  the repair pass, sections G, H, I.
- Field: one day of ordinary use on Dev in a Journey that currently regresses, reading the
  settlement-timings file for `failed` records with `cleanup_lease` as the last phase.

## Relationship to open work

- **CR121** keeps its instrument improvements (carry the error, time steps 7–8) and loses its
  mystery: this CR names the throw. Recommend narrowing CR121 to the instrument.
- **CR119 slice 4** (the production reading of the Finishing tail) should be re-read after this
  ships; a large part of the tail is predicted to be this recovery detour.
- **CR120** is independent and unaffected.
- **CR114** is the trigger, not the cause. Bounding the surface was right; letting a surface length
  pose as a history length was the latent defect it exposed.
