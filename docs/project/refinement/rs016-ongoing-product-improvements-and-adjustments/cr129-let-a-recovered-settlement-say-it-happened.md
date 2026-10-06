[< RS016](index.md)

# CR129: Let a Recovered Settlement Say It Happened

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

A turn that fails its inline settlement and is then repaired by recovery leaves **no record of the
repair**. The timing ledger keeps the failure and nothing after it. Reading the store, a settlement
rescued seconds later is indistinguishable from one that was never rescued at all.

This is not a theoretical gap. It has blocked a diagnosis twice in two days, in both directions:

1. **`mirror-mind`, 2026-10-06.** The inline settlement failed at `load_segments`. The journal recorded
   `phase=settled`, `terminalOutcome=completed`, `revision=5`, and both messages reached Mirror. The
   timing ledger shows a failure with no successor. Judging the Journey by the ledger alone says the
   turn failed; judging it by the journal says it completed. Only cross-referencing four artifacts
   resolved it.
2. **`softwarezen`, 2026-10-06 (`alpha.39`).** CR128's recovery settled a stranded turn at `14:16:00Z`.
   The timing ledger for that Journey still ends at `12:17:13Z`. When a published claim about that
   turn's harness body had to be corrected, the sequence could not be reconstructed — there was no
   phase trace to read. The correction had to record "not established" where a trace would have given
   an answer.

The ordinary path is healthy by contrast: the next `softwarezen` turn wrote a full 19-phase record.
The absence is specific to recovery.

## Outcome

A settlement that completes through recovery writes a record saying so, in the same ledger and the
same shape as an inline settlement. A reader can tell *failed* from *failed and repaired* without
cross-referencing other artifacts, and the phases of the repair are visible.

## First Investigation

The instrument already exists and is good. `settlementPhaseTiming.ts` provides
`createSettlementTimingRegistry` with `begin` / `time` / `end`, phases carry `depth` so nested steps
explain their parent, and CR121 added a `failure` field that names the reason and the phase. The
inline path uses all of it: `settlementTimingRegistry.begin` at `src/app/App.tsx:3317`, `end` and the
single write at `:3359`.

**`recoverPostTerminalPersistence` (`src/app/App.tsx:3562`) never calls `begin`.** It therefore has no
collector, every `registry.time(...)` inside its call tree falls through to `operation()` untimed —
that fallthrough is deliberate and correct in `createSettlementTimingRegistry.time` — and `end`
returns `undefined`, so nothing is written.

So this is a wiring gap, not a missing capability.

### What makes it non-trivial

**The module's own constraint.** `settlementPhaseTiming.ts` opens by stating that it never writes, and
that per-event persistence traffic on the settlement path is what caused CR116's strand. Recovery runs
on Journey load and on idle — paths that CR115 had to quiet. A collector per recovery attempt that
writes on every pass would reintroduce exactly the traffic the module was built to avoid. A record
should probably be written only when recovery **did** something.

**Attribution.** The registry is keyed by Journey id, which works inline because the coordinator
serializes finalization per Journey. Recovery can repair several turns in one pass
(`StaleRecoveryReport` counts `recovered` and `skipped`), so one collector per Journey may not be the
right grain. The authority a record needs (`journeyId`, `runId`, `turnId`, `generation`) is per turn.

**Distinguishing the two kinds of recovery.** `recoverPostTerminalPersistence` repairs a turn whose
inline settlement failed. `reconcile_pi_backed_mirror_delivery_debt` plus CR128's attribution repairs a
run the app never saw end. Both currently write nothing; they are not the same event and probably
should not produce identical records.

## Acceptance

- A turn repaired by recovery produces a timing record in `settlement-timings/<journey>.json` with its
  own `turnId` and `runId`, `outcome: "settled"`, and its phases.
- The record is distinguishable from an inline settlement — a reader can tell that this settlement was
  a repair, and which failure it repaired.
- A recovery pass that repairs nothing writes **nothing**. Idle recovery adds no write traffic, which
  is CR115's and CR116's constraint and is not negotiable.
- A failure to write a timing record never fails a recovery, exactly as it never fails a settlement
  today (`appendSettlementTiming` already takes a warning callback rather than throwing).
- The `mirror-mind` and `softwarezen` readings, replayed against a store written by the new code, each
  answer from the ledger alone the question that previously needed four artifacts.

## Boundaries

**The one-write-per-turn rule holds.** The record is written after the work, once, and never during it.

**Not a new artifact.** These records belong in the existing ledger, in the existing shape. A second
file describing the same events would be a third place to disagree.

**Not the turn journal.** `settlementPhaseTiming.ts` already records why a diagnostic must not go
there: the journal is serde-strict and its revision, phase and receipt fields gate the recovery guards
CR116 depends on.

**Not the surface.** That nothing distinguishes a recovered settlement from slow work *in the UI* is a
related standing observation and a different change. This CR is about the durable record.

**Not CR127.** CR127 is now planned on an established cause and does not depend on this. The two share
a witness, not a fix.
