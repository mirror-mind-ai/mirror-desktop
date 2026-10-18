[< RS016](index.md)

# CR129: Let a Recovered Settlement Say It Happened

**Status:** planned
**Driver:** @alissonvale
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

## Planned 2026-10-18

Selected by the Navigator. Delivery not named; **nothing implemented.**

### The premise, measured for the first time with a working instrument

Every earlier reading of this CR's friction used the ledger file's **mtime**, because I had recorded
that a settlement-timings record carries no `runId` and that searching by it was invalid. **That was
wrong**, and the correction is on CR160 where the claim was made: the record carries `runId` and
`turnId` **flat at its top level**, not nested under `authority`. I read the key at the wrong level.

Read correctly, with its control run alongside rather than after:

| | |
|---|---|
| `mirror-desktop.json` records carrying a `runId` | **232 of 232** — the instrument can return non-zero |
| control: healthy turns (`…T17:33:12.282Z`, the 14:34 settlement) | **present** |
| `agent-run-2026-10-17T11:27:13.196Z` — CR160's second recovered orphan | **absent** (232 records) |
| `agent-run-2026-10-16T13:00:42.068Z` — CR160's first recovered orphan | **absent** (256 records) |

So this CR's premise is now **directly measured** rather than inferred from a file timestamp. These
are the fifth and sixth observed instances, and the first two established by an instrument whose
control proves it capable of the opposite answer.

**And the corrected instrument is this CR's field validator**, which is the cleanest part of the
arrangement: the measurement that confirms the defect is the same one that will confirm the repair.

### A correction to this CR's own reading of the code

The *First Investigation* above says `recoverPostTerminalPersistence` never calls `begin`. That is
true, and it implies the collector belongs there. **It does not.** That function is Journey-grained
and has no per-turn visibility at all — it delegates everything to
`turnFinalizationCoordinator.convergeDelivery(ownerJourneyId, deps)`, which returns a bare
`Promise<boolean>`. The per-turn authority this CR's acceptance requires is known only inside that
call.

So the first implementation step is to **establish the seam** where a repaired turn's authority is
known, rather than to add a `begin` at the entry point. Recorded here because planning on the
original reading would have put the collector where the data is not.

### Scope

- **A per-turn collector, created where the repaired turn is identified.**
  `createSettlementTimingCollector(authority, clock)` is already exported and already takes a full
  `SettlementTimingAuthority` of `journeyId`/`runId`/`turnId`/`generation`. Recovery holds one per
  repaired turn **locally** and never touches the registry's `collectors` map, which is keyed by
  `journeyId` alone. This answers this CR's own worry that one collector per Journey is the wrong
  grain, **without widening the inline path's keying**.
- **A new optional field naming the record as a repair**, and which recovery route produced it. The
  record shape has nowhere to say it today, and inferring it from a phase name would be reading prose.
  Additive and optional, following the precedent of `failure?` (CR121) and `diagnostics?` (CR127),
  both added without moving `schemaVersion: "0.1.0"`.
- **A pass that repairs nothing writes nothing — by construction.** No repaired turn means no
  collector, so there is nothing to finish and nothing to append. Not a conditional around a write.
- **One write per repaired turn, after the work**, through the existing
  `appendSettlementTiming(record, onWarning)`, which already reports rather than throws.

### Files

`src/app/settlementPhaseTiming.ts` (the optional field and its plumbing through `finish`),
`src/app/turnFinalizationCoordinator.ts` (the seam), `src/app/App.tsx` (the append),
`src/tests/settlementPhaseTiming.test.ts`, and a new test file for the recovery record.

### Validation

- **Unit, with the fake clock already used by `settlementPhaseTiming.test.ts`:** a repaired turn
  produces a record with its own `runId`/`turnId`, `outcome: "settled"`, its phases, and the repair
  field; a pass that repairs nothing produces none; a failed append never fails the recovery.
- **A control for each**, because a test that cannot fail on the defect proves nothing: a record
  written by the inline path must **not** carry the repair field.
- **Field, with the corrected instrument:** the next production recovery is searched by `runId` in
  `settlement-timings/<journey>.json`. It must now be **present** and marked as a repair, where the
  two measured above are absent. The control is the same as today's — healthy turns present.
- **Deliberately not attempted:** replaying the `mirror-mind` and `softwarezen` readings against a
  store written by the new code, which acceptance item 5 asks for. Those stores are historical and
  the new code cannot retrofit them; what can be checked is the *next* recovery, not a past one.

### Exclusions

- **The native route is out of this slice.** `reconcile_pi_backed_mirror_delivery_debt` is Rust, and
  this ledger is written from the renderer. Whether it can write the same record, or needs its own
  mechanism, is a separate decision and is **not** assumed here. This CR's own text says the two kinds
  of recovery should not produce identical records; slice 1 covers the renderer route only, and the
  record names which route wrote it precisely so the other can be added without ambiguity.
- Not the surface, not the turn journal, not a new artifact — as the Boundaries below already state.

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

## Field Evidence Arrived Unprompted (2026-10-10)

This CR was captured on reasoning: a settlement that only succeeds through recovery writes no
record. It now has a measured instance, dated, from the Dev channel.

A turn completed natively at `17:38:42` and its renderer-side settlement never ran. The journal held
`phase: terminal_durable`, `terminalOutcome: completed`, `recoveryDisposition: resume_projection`
for seventy minutes. On the next launch, at `18:46:09`, recovery projected the answer and advanced
the record to `phase: settled`, revision 5.

**And `settlement-timings/mirror-desktop.json` was not touched.** Its mtime stayed at `14:37:30`
and its newest entry remained the preceding turn's. So the ledger shows the Journey's last
settlement as the turn *before* this one, and a reader reconstructing the session from timings
would conclude this turn never settled — while the journal says it did.

This was predicted as part of a CR142 experiment and the prediction **failed on exactly this
point**, which is why it belongs here as evidence rather than as an assumption: the recovery was
expected to write a timing record, and it did not.

Consequences this sharpens for planning:

- the ledger undercounts settlements by exactly the ones that needed recovery, so any rate derived
  from it is biased toward the healthy path;
- CR132's threshold was derived from timings, and timings are blind to this class;
- a recovered settlement and a settlement that never happened are **indistinguishable in the
  ledger**, which is the distinction CR142 needs and cannot get from it today.

Run for reference: `agent-run-2026-10-10T17:38:10.504Z`, thread
`desktop-thread-mirror-desktop-18d5cf4842b669b0`. Full context in
`docs/update/rs024-field-verification-baseline-2026-10-10.md`.

## Neighbour recorded 2026-10-10 — CR142

A Dev field attempt produced the sharper case of this CR's silence. A turn executed, the native side
wrote `terminalOutcome: completed` into the journal, and there was **no settlement record, no
conversation message and no segment** carrying the answer — while the surface read *"Working…"*
indefinitely.

This CR is about a settlement that *succeeds through recovery and says nothing*. That one is a
settlement that **did not happen at all** and also says nothing. They share the silence and not the
mechanism, so they stay separate: see
[CR142](cr142-stop-losing-a-turn-the-journal-already-answered.md). Whichever is planned first should
read the other, because a diagnostic that distinguishes "recovered silently" from "never ran" would
serve both.

## RS025 Membership, Questioned (2026-10-16)

Status unchanged. Moved into RS025 with the three other live CRs of the theme, and then read against
RS025's intake rule — *every CR must name which half of the criterion it serves: naming or exit*.

This CR does not serve either. Its own Boundaries say **"Not the surface"**: it is about the
settlement-timings ledger telling a *reader* that a settlement was a repair. RS025's criterion is
about the *Navigator* being told, in the application. The ledger record is valuable and may well be
the evidence a later surface reads from, but it is not an abnormal ending naming itself.

Recorded rather than silently acted on. Two honest options, for the Navigator: return it to RS016,
or keep it in RS025 as explicit groundwork for a naming CR that does not exist yet. It is **not**
planned in either batch until that is decided.

## Field Evidence (2026-10-17)

Status unchanged; membership still the open question above.

CR160's repair recovered a stranded turn in production on 2026-10-17: the journal record for
`agent-run-2026-10-16T13:00:42.068Z` went `running → settled` with `terminalOutcome: completed` and
full `piExecution` evidence, receipt `settled-agent-run-…`.

**`settlement-timings/alissonvale-com.json` holds zero records for that run, before and after.**

A settlement completed through recovery and the ledger says nothing about it — exactly the friction
this CR described from reading the code, now observed rather than reasoned about. It does not move
the membership question: this is still a ledger reader being uninformed rather than the Navigator,
which is why it serves neither half of RS025's criterion. It does mean the friction is real and
currently happening.

## Returned to RS016 (2026-10-18)

Status unchanged at `captured`. Moved back by the Navigator's call, on the reading recorded in
*RS025 Membership, Questioned* above: RS025's intake rule requires every CR to name which half of its
criterion it serves — **naming** or **exit** — and this CR's own Boundaries say *"Not the surface"*.
It serves a ledger reader, not the Navigator in the application.

Keeping it would mean RS025 could never satisfy its closure criterion cleanly: it would close holding a
member structurally unable to serve the criterion, which weakens the criterion the Story was carved to
supply. Moving costs nothing here because this CR is `captured`, not closed — the principle against
shuffling work between Stories is about *closed* work, which rewrites history without delivering.

The field evidence gathered on 2026-10-17 travels with it and is unaffected: `settlement-timings`
holds **zero** records for the run that recovery settled, so a settlement completed through recovery
and the ledger says nothing. That is this CR's premise, now observed rather than argued.
