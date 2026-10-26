[< RS016](index.md)

# CR129: Let a Recovered Settlement Say It Happened

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/cr129-record-a-recovered-settlement`

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

## Implemented 2026-10-18

### The seam, established — and there are three routes, not two

The plan's first step was to find where a repaired turn's authority is known, because
`recoverPostTerminalPersistence` is Journey-grained and `convergeDelivery` returns a bare boolean.
Reading it: **`convergeDelivery` has three per-turn repair routes**, not the two this CR was captured
describing.

| route | enum value | where the per-turn authority comes from |
|---|---|---|
| `convergeLegacyItem` | `legacy_outbox` | `resolvePersistedSettlementRecovery`, mid-function |
| `convergePiBackedItem` | `pi_backed_outbox` | the journal `record.authority`, a parameter |
| `resumeProjectedRecord` | `projected_resume` | the journal `record.authority`, a parameter |

The enumeration is asserted at exactly three, because an unnamed fourth route would recreate this
CR's silence for that one path — a settlement repaired with no record — and nothing would fail.

The native route (`reconcile_pi_backed_mirror_delivery_debt`) stays excluded as planned: it is Rust
and this ledger is renderer-written. It produces the outbox items the first two routes then settle,
so its work is represented by the route that completed it, and the record names which.

### Each route times its own steps

`legacy_outbox`: `advance_journal`, `inspect_occupancy`, `cleanup_lease`, `append_and_acknowledge`.
`pi_backed_outbox`: `load_projection`, `load_thread`, `inspect_transcript`, `inspect_occupancy`,
`cleanup_lease`, `deliver_outbox`, `save_projection`, `advance_journal`, `acknowledge_outbox`.
`projected_resume`: `load_projection`, `execute_settlement`.

**An honest limit on the legacy route.** Its collector cannot be created at the top of the function,
because a legacy item need not have a journal record — the `loadJournal` and `loadProjection` above
are what *supply* the identity, so they cannot be timed under it. Its phases begin where the turn
does, and the comment at the line says so.

### The record leaves as an event, and the compiler enforced the other half

The coordinator must not learn about storage, so the record goes out as a new
`settlement_recovered` event and the shell appends it through the same `appendSettlementTiming` the
inline path uses. This was chosen over adding a dependency to `ConvergenceDeps`, which five test
files and a fixture construct.

**It was also the choice that could not be half-finished.** `App.tsx`'s subscriber narrows on one
event type and then reads `event.authority` on everything else, so adding a variant without a
handler is a type error. `tsc` reported it immediately — an emitted record nobody appends would be
the same silence with more code, and the compiler refused to let that compile.

### A failed repair is deliberately not recorded

The collector can mark a failed repair, and that capability is unit-tested. **It is wired to
nothing.** Recovery runs on Journey load and on idle, so a persistently failing repair would write a
record on *every pass* — the write traffic CR115 and CR116 exist to have removed, and this CR's own
acceptance calls non-negotiable. Only a successful repair is recorded, which also makes *a pass that
repairs nothing writes nothing* true **by construction**: no repaired turn means no collector, so
there is nothing to finish and nothing to emit.

A failure record becomes worth wiring when there is a trigger that fires once rather than once per
pass. Recorded as this slice's remaining debt rather than left as an accident.

### A subscriber that throws cannot undo a repair

The repair is already on disk when the record is emitted, so the emit is wrapped: a throwing
subscriber is swallowed. Acceptance requires it, and a test drives a real recovery with a throwing
subscriber and asserts the durable evidence still settles.

### A guard of mine found vacuous, and repaired as a pattern

`journeyRuntimeIntegration.test.ts` ordered two steps with
`expect(section.indexOf(a)).toBeLessThan(section.indexOf(b))`. This slice renamed one of those
literals, which made `indexOf` return **`-1`** — and `-1` is less than every real index, so **the
ordering guard would have kept passing while guarding nothing.** The rename is incidental; the
missing presence assertion is the defect. Both indices are now asserted present before being
compared.

My own first check for this missed it, because I verified the guard's literals against the whole
coordinator source while the ordering literals are matched against a *slice*. Same class as the two
key errors this CR already corrected: **the instrument's scope has to match the assertion's scope.**

### Two predecessor guards narrowed, not deleted

- The post-frontier save and outbox acknowledgement guards pinned `authority`; a `let … | undefined`
  does not keep its narrowing inside the closure a timing wrapper needs, so they pin
  `settlementAuthority` now. The claim is unchanged.
- The write census moved from **2 to 3** — and the comment records that the previous mutual-exclusion
  argument **does not extend** to the third site. A recovery record is deliberately a *second* record
  for a turn whose inline attempt already wrote a failed one. That is exactly how a reader tells
  `failed` from `failed and repaired`, which is what this CR is for.

Gates: vitest **271 files / 2,250 tests** (from 270 / 2,236), `cargo test` 332 passed / 3 ignored,
`tsc --noEmit` clean, `npm run build` clean, `roadmap:check` READY.

### Shipped in v0.2.0-alpha.55 (2026-10-19)

Published and independently verified. The release carries CR129 and CR158. Every route literal is
present in the built bundle against an instrument shown able to return zero, and the binary inside
the served tarball is byte-identical to the locally built one. Pre-state for the field check:
**0 of 970 settlement-timings records across 18 Journeys carry a `recovery` marker.** Full chain in
`docs/update/alpha-55-release-publication-2026-10-19.md`.

### Field verification owed

Unreleased, and the check belongs to production. **The validator is the instrument this CR corrected:**
search `settlement-timings/<journey>.json` by `runId`. The next production recovery must appear
there, `outcome: "settled"`, with a `recovery.route` — where the two measured on 2026-10-18 are
absent. The control is unchanged: healthy turns present, and 232 of 232 records carrying a `runId`
proves the search can return non-zero.

**What would refute it:** a recovery that lands and leaves no record, which would mean the emit or
the append is not reached on the route that ran. **What it cannot establish:** whether the phase
*names* are the useful ones. That is only answerable by reading a real record for a real repair.

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

## Field Verification Passed (2026-10-26)

Two recovered turns on production `alpha.55`, in **two different Journeys**, both on 2026-10-22:

| Journey | run | outcome | route | totalMs | phases |
|---|---|---|---|---|---|
| `alissonvale-com` | `agent-run-2026-10-22T13:30:50.549Z` | `settled` | `pi_backed_outbox` | 1,602 | 8 |
| `mirror-desktop` | `agent-run-2026-10-22T13:34:35.721Z` | `settled` | `pi_backed_outbox` | 6,246 | 8 |

Measured against the pre-release baseline recorded before the Navigator upgraded: **0 of 970 records
across 18 Journeys carried a `recovery` marker.** Today: **2 of 1,098 across 20 Journeys.** The
control is the other 1,096 — every inline settlement still carries no marker, so the key appears
exactly when a repair happens and not otherwise. Both runs were found by searching the ledger on the
flat top-level `runId`, which is the instrument this CR corrected.

### The question only a real record could answer, answered

This document recorded that the fixtures could not establish whether the phase *names* are the useful
ones, and that reading a real record for a real repair was the only way to know. **They are, and the
evidence is that they carried an investigation four days later** — the one that became
[CR163](../rs025-legible-endings-for-a-turn-that-ends-badly/cr163-a-hung-mirror-append-freezes-every-exit.md):

- The `mirror-desktop` record has **no lease phases** — no `cleanup_lease`, no
  `notify_lease_released` — which is how it was established that the inline attempt had already got
  past them, so the hang had to be downstream of the lease.
- `deliver_outbox` took **1,659 ms** at recovery, against the eleven minutes the inline attempt spent
  without returning. That contrast is what pinned the hang to the Mirror append rather than to
  anywhere else in the settlement.
- `recovery.route: pi_backed_outbox` named *which* of the three routes ran, which is what made the
  first inference legitimate rather than a guess.

Without this record the CR163 timeline would have had the same shape as CR160's: file mtimes and
inference. That is the friction this CR was opened to remove, and it is the first time the removal can
be shown rather than argued.

### What this does not verify

- **Only `pi_backed_outbox` has been exercised in the field.** `legacy_outbox` and `projected_resume`
  remain covered by fixture alone. They stay unverified rather than being claimed by association — the
  route field exists precisely so this distinction stays readable.
- **The failure-marking capability is still wired to nothing**, as recorded in the implementation, so
  it remains unexercised by construction rather than by chance.
- **The native Rust recovery route still writes no record**, as excluded in scope.

### A derived-surface error of mine, found while closing this

Closing this CR required recomputing the Canvas, and that surfaced **two** wrong rows, both mine.

- **RS016 read `5 🟡`** — five *captured* — while only four CRs were captured. This CR's `in_progress`
  had been folded into that count when I selected it on 2026-10-18, and stayed there through two
  releases.
- **RS025 read `de 4`** while RS025 holds five CRs, and carried no `captured` count at all. I
  introduced that one **in the previous turn**, when CR163 was captured.

The Canvas is derived from the canonical index, and **there is no committed guard over its
derivation**: `journeyCanvas.test.ts` covers the application's canvas *transport*, and `roadmap:check`
compares statuses between the index and each document. Neither reads this file's counts.

The per-turn check I run asserted the **bar** (`done / total`) and never the per-status counts — and
the RS025 case shows why that substitution is not merely incomplete but actively misleading: the bar
is insensitive, because `round(1/4 × 10)` and `round(1/5 × 10)` are both `2`. The row gained a CR, lost
its total, and the check reported the surface consistent. **An instrument that cannot distinguish the
before from the after is not evidence that nothing changed.**

Both rows are corrected here and the check now asserts every per-status count and the total. That check
is still mine and ad-hoc; making it a committed gate is a real gap, and it is named rather than quietly
patched.
