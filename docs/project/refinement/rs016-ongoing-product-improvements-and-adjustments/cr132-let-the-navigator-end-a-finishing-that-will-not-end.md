[< RS016](index.md)

# CR132: Let the Navigator End a Finishing That Will Not End

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr132-end-a-finishing-that-will-not-end`

## Friction

**Navigator report (2026-10-08):** *"eu acabei de ficar preso nessa sessão em um 'finishing' que não
libera. Tive que reiniciar o app pra retomar o controle e mandar novo turno. Eu não precisaria ter que
fazer isso, bastaria liberar o botão cancelar na fase de finishing e fazer um cancelamento apropriado
para os casos que ficar preso nisso."*

The app had to be restarted to regain control of a Journey. There is no way to end a wait from inside
the application.

## What the Record Shows

Read from this Journey's own durable stores while the evidence was fresh.

### The stall

| fact | value |
|---|---|
| Turn created | `2026-10-08T11:58:40.993Z` |
| Marked `interrupted` / `cancelled` | `2026-10-08T12:42:09.595Z`, `revision` 5 |
| **Time in flight** | **43 min 28.6 s** |
| Median settled turn, this Journey | **4,976 ms** across 43 records |
| Longest settlement ever *recorded* here | 41,741 ms |

The stall ran roughly **520× the median** and **62× the worst settlement this Journey has ever
recorded**. It is not a slow settlement; it is a different event.

### The instrument recorded nothing

The settlement timing ledger's last entry is `2026-10-08T11:56:56.849Z` — the *previous* turn, settled
in 4,982 ms across 19 phases. **The 43-minute turn produced no timing record at all.**

The cause is structural, not a bug: the collector is opened at `App.tsx:3321` and written once at
`:3363`, by design — CR119's module states that it never writes per event, because CR116's strand was
caused by per-event persistence traffic on the settlement path. A settlement that **never ends**
therefore never writes.

So the instrument built to explain a long `Finishing` cannot explain the longest one. This is the same
shape as [CR129](cr129-let-a-recovered-settlement-say-it-happened.md) — recovery writes nothing — met
from the other side: a stall writes nothing either. CR129 and this CR share a cause and are not the
same fix.

### The restart left an orphan

A second turn was created at `12:42:24.766Z`, fifteen seconds after the first was marked interrupted.
It still reads `phase=running`, `revision=2`, `recoveryDisposition=resume_execution` — never advanced,
orphaned by the restart at `09:48:58` local (`12:48:58Z`). The turn that replaced it was created at
`12:50:46.895Z`.

**What the Navigator pressed at `12:42:09` is not established** and is not claimed. The record shows the
run resolved as `cancelled`; it does not record who or what resolved it.

## Why Automatic Recovery Cannot Be the Answer

`recoverPostTerminalPersistence` (`App.tsx:3582`) is the existing repair route, and it **correctly
refuses** to act here:

```ts
if (hasActiveNativeExecution(piInvocationOccupancy, ownerJourneyId)) return;
```

CR116 wrote that guard deliberately, replacing a renderer flag that *"a settlement that stopped leaves
set forever — so the repair route declined exactly the state it exists to heal, and the Navigator had
no way out but quitting."* Native occupancy is the authority on whether work is live.

That fix handled a settlement that had **stopped**. Today's case is the opposite: something was still
alive. **A hung-but-live process is indistinguishable from a working one** at the occupancy level, so
loosening this guard would re-break what CR115 and CR116 built, and would let recovery interrupt real
work.

The only party who knows the wait is futile is the Navigator. That is why this needs an affordance
rather than a smarter heuristic.

## The Capability Exists; the Affordance Does Not

The durable interrupted path is already built and tested: `finalizeInterruptedTurn`
(`turnFinalizationCoordinator.ts:372`) → `executeInterruptedSettlement` (`journeySettlement.ts:162`) →
`saveInterruptedTurnLifecycle` (`App.tsx:3540`). CR089 preserves the partial response and CR128 recovers
an answer a restart stranded.

But `finalizeInterruptedTurn` has **exactly one caller** (`App.tsx:3292`), reached from the run
lifecycle when the run itself reports it ended. **Nothing the Navigator can press reaches it.** A search
of the composer and runtime surfaces finds no Stop or Cancel for a live or finishing turn; every
`Cancel` in the application dismisses a dialog.

So the missing piece is a trigger, not a mechanism.

## Outcome

A Navigator who judges a `Finishing` to be stuck can end it from inside the application, get the
composer back, and keep whatever the turn had already produced — without quitting.

## First Investigation

- **What does "appropriate cancellation" have to mean?** Settlement is what makes a turn durable, so
  aborting its writes mid-flight is the one thing this must not do. The likely shape is: stop *waiting*,
  mark the turn interrupted through the existing path, release the composer, and leave the durable work
  to the recovery route that already exists — not cancel the persistence.
- **When should the control appear?** CR119 already withholds the phase name for the first three
  seconds so a fast turn looks unchanged. A cancel offered immediately would invite ending healthy
  five-second settlements. Some threshold is needed, and the median of 4,976 ms is the evidence for it.
- **What happens to the live Pi process?** If native occupancy says work is executing, does the
  Navigator's act kill it, detach from it, or only release the renderer? Each has different consequences
  for the lease, for occupancy, and for whether the answer survives.
- **Is one press enough?** A stuck turn today also leaves an orphan at `phase=running`. Whether ending a
  turn should also resolve a trailing open record, or whether that stays recovery's job, is open.
- **Should the stall itself be recorded?** The strongest finding here is that nothing was written. That
  may belong to CR129, to this CR, or to a third — but a stall that leaves no trace will keep costing a
  reconstruction from four artifacts.

## Boundaries

**Not CR116.** That one made automatic recovery work for a settlement that had stopped. This is a
Navigator-initiated exit for one that has not.

**Not CR128.** That recovers an answer after a restart. This is about not needing the restart.

**Does not loosen the occupancy guard.** `hasActiveNativeExecution` stays as CR115 and CR116 left it.
This CR adds an explicit act; it does not make a heuristic braver.

**Not a timeout.** Nothing here should end a settlement on its own. The Navigator judges; the
application obeys.

**Not the diagnostics gap itself.** That a stalled settlement writes no record is named above as the
reason this was hard to read, and is CR129's family. It is not folded into this CR's scope.

## Provenance

Established read-only from `turn-journal/mirror-desktop.json`, `settlement-timings/mirror-desktop.json`,
the running process start time, and the code paths cited. The Navigator's words are quoted as report;
every duration and phase above is from the durable record.

## Plan (2026-10-08)

### The premise is provable from the code, not inferred from the incident

Reading the three functions that decide what the Navigator can do removes the need to attribute the
incident at all.

```ts
// composerTurnStatus.ts
if (isStreaming || agentRunStatus === "running") return "working";
if (isFinalizingTurn) return "finishing";

// journeyNavigationCoordinator.ts
const cancelVisible = selectedRuntime.mode === "live"
  && selectedRuntime.agentRun.status === "running"
  && Boolean(selectedRuntime.identity);
sendBlocked: isJourneyRuntimeActiveOrFinalizing(selectedRuntime),
  // = isStreaming || isFinalizingTurn || agentRun.status === "running"
```

`Finishing` is displayed **exactly when** the run is not running and not streaming. `cancelVisible`
**requires** the run to be running. Therefore:

> **`Finishing` and a visible Cancel are mutually exclusive by construction.** Whenever the Navigator
> sees `Finishing`, the Cancel control is provably absent — and `sendBlocked` is provably true.

This is a logical gap, not a timing accident, and it holds regardless of which of yesterday's two
turns produced the report. **Which turn the Navigator experienced as a stuck `Finishing` is still not
established** and this plan does not depend on it.

The lockout state is therefore exactly `isFinalizingTurn && !isStreaming && agentRun.status !==
"running"`. Note that the third path into the `Finishing` label, `reconciliationBlocksInvocation`, is
**not** in `sendBlocked`, so it does not lock the Navigator out and is not this CR's target.

### Two acts, not one widened act

The existing Cancel must not simply be made visible during `Finishing`.
`cancelExactJourneyRun` (`journeyCancellation.ts:9`) throws *"Only live Pi invocations have native
cancellation authority"* unless `identity.kind === "live"`, and `cancel_pi_invocation`
(`main.rs:5635`) journals a cancellation, marks the registry and **kills the child process**. During
`Finishing` the run has already terminalized; there is no child to kill and nothing to cancel.

So this CR adds a **second, differently-meaning act**: the running phase keeps *cancel the run*, and
the finishing phase gains *stop waiting for this turn to settle*. Same button position, different
verb, different mechanism.

### Slices

- **D1 — name the lockout in the domain.** A pure function in `journeyNavigationCoordinator.ts`:
  `abandonSettlementOffer({ ownerPhase, finalizingSince, now, threshold })` returning whether the act
  is offered. It is offered only in the lockout state and only once the wait exceeds the threshold.
  `cancelVisible` is left byte-identical.
- **D2 — carry it through presentation.** `JourneyNavigationPresentation` gains
  `abandonSettlementVisible`. `sendBlocked`, `cancelVisible`, `draftEditable` and `attachmentsBlocked`
  keep their current semantics exactly.
- **D3 — the act routes through the path that already exists.** A handler that calls
  `turnFinalizationCoordinator.finalizeInterruptedTurn` with the live settlement authority and the same
  three ports the run-lifecycle caller uses (`loadActiveEvidence`, `saveInterruptedProjection`,
  `cleanupLease`). No new persistence, no new native command, and **no abort of an in-flight write**:
  if settlement is mid-write, the interrupted path records its own outcome and
  `recoverPostTerminalPersistence` converges later, as it does after a restart.
- **D4 — release the composer.** Clearing `isFinalizingTurn` for the entry is what makes `sendBlocked`
  false. This needs a runtime action in `journeyRuntimeState.ts`; the reducer must not clear it for a
  Journey that is still streaming or running.
- **D5 — the surface, with a confirmation that tells the truth.** The control appears in the composer
  runtime footer region beside the `Finishing` label. The confirmation states what is kept (the partial
  answer, per CR089), what the turn becomes (recorded as interrupted), and what may still be owed
  (Mirror delivery, which recovery finishes). It must not promise the settlement was undone.
- **D6 — make the abandoned wait write a record.** A stall currently writes nothing, because CR119's
  collector only writes at `end`. This is the one case where the application *knows* the wait is over,
  so the act calls `settlementTimingRegistry.end(journeyId, "failed", reason)` with a reason naming the
  Navigator's act. Narrowly scoped: only this path. Stalls in general and recovery remain CR129's.

### Threshold, derived rather than chosen

| measurement (this Journey, 43 records) | value |
|---|---|
| Median settled turn | 4,976 ms |
| Longest settlement ever recorded | 41,741 ms |
| CR119's phase-naming delay | 3,000 ms |

Offering the act at CR119's 3 s would put it in front of every healthy five-second settlement.
`ABANDON_SETTLEMENT_OFFER_AFTER_MS` is proposed at **60,000 ms** — past every settlement this Journey
has ever completed, with margin — and defined beside `FINISHING_PHASE_VISIBLE_AFTER_MS` so the two
thresholds are read together. The number is falsifiable: if a legitimate settlement is later recorded
above it, the constant moves and the record says why.

### Files

- `src/app/journeyNavigationCoordinator.ts` — D1, D2.
- `src/app/settlementPhaseTiming.ts` — the threshold constant, beside CR119's.
- `src/app/journeyRuntimeState.ts` — D4 action and reducer case.
- `src/app/App.tsx` — D3 handler, D5 wiring and confirmation state, D6 record.
- `src/app/ComposerRuntimeFooter.tsx` — D5 control.
- `src/tests/journeyNavigationCoordinator.test.ts` — D1/D2 including threshold boundaries.
- `src/tests/settlementAbandonment.test.ts` (new) — D3, D4, D6.
- `src/tests/finishingPhaseSurface.test.tsx` — D5.

### Acceptance

- In the lockout state, once the wait exceeds the threshold, the act is offered.
- It is **never** offered while the run is running or streaming — that phase keeps the native Cancel —
  and never before the threshold.
- Accepting it marks the turn interrupted through `finalizeInterruptedTurn`, releases the composer so
  `sendBlocked` becomes false, and preserves the partial response.
- It writes one settlement timing record with `outcome: "failed"` and a reason naming the act, so the
  event that previously wrote nothing is now readable from the ledger alone.
- It is **idempotent**: a second press neither throws nor writes a second record.
- A settlement that completes normally during the wait still settles normally; the offer disappearing
  must not interrupt it.
- `hasActiveNativeExecution` and `recoverPostTerminalPersistence` are untouched, and
  `cancelVisible`'s derivation is unchanged.
- The orphaned `phase=running` record that a restart leaves behind is **unchanged** by this CR.

### Validation

- `npx tsc --noEmit`, full `vitest`, `cargo test`, `npm run build`, `npm run roadmap:check`.
- A guard asserting `cancelVisible`'s three conditions are intact, so widening the new act can never
  silently widen native cancellation.
- Threshold boundary tests at just-below and just-above, with an injected clock.
- Field verification is owed and **can be provoked**: the next time a `Finishing` passes a minute, the
  control should appear, and after use the ledger should carry a `failed` record naming the act while
  the composer accepts a new turn without a restart.

### Exclusions

- **Not a timeout.** Nothing ends a settlement on its own. The threshold only decides when to *offer*;
  the Navigator decides.
- **Does not widen native cancellation.** `cancel_pi_invocation` stays reachable only while the run is
  live.
- **Does not loosen the occupancy guard.** CR115's and CR116's `hasActiveNativeExecution` refusal is
  untouched; this CR adds an explicit act instead of a braver heuristic.
- **Does not abort persistence.** No in-flight durable write is cancelled or rolled back.
- **Does not diagnose the stall.** Why a settlement hangs is unknown and stays unknown; this makes the
  consequence survivable, not the cause understood. D6 is what will eventually supply the evidence.
- **Does not resolve the trailing `phase=running` orphan**, and does not touch
  `reconciliationBlocksInvocation`, which renders the same label but does not block sending.
- **Not CR129.** Recovery still writes nothing; only this new act writes its own record.

## Implementation and closure (2026-10-08)

### The lockout's real root, found while wiring it

CR116 made `recoverPostTerminalPersistence` able to repair a settlement that stopped **during**
finalization, by refusing only on native occupancy rather than on a renderer flag. That fixed the
durable side and left the surface behind:

**Nothing clears `isFinalizingTurn` except the settlement block's own `finally`** (`App.tsx:3369`),
and that `finally` never runs when the settlement's `await` never returns. So the durable state could
already be fully repaired by recovery while the composer stayed locked **forever**, with
`sendBlocked` true and `cancelVisible` false.

That is why restarting the app was the only exit, and it is why the fix is small: the flag is stale by
construction in exactly the state this act addresses.

### Two corrections to the plan, forced by reading the code

**1. The act does not route through `finalizeInterruptedTurn`.** The plan said it would. Reading the
settlement block showed why it must not: the hung settlement's promise may still resolve, and
advancing the journal to `interrupted` underneath it would turn a late success into a loud failure.
Repair stays with `recoverPostTerminalPersistence`, which was built for exactly this and is kicked
immediately rather than waited for. This also removed the double-write race the plan had not seen.

**2. The offer is withheld while native execution is active, which the plan did not require.**
`derivePiInvocationAdmission` and `hasActiveNativeExecution` share one predicate,
`isActivePiInvocationLease`. So an active lease means **both** that the composer is blocked by
occupancy **and** that CR115's and CR116's repair route must refuse. Two consequences:

- Offering the exit there would achieve nothing unless it released the lease — and releasing a lease
  while Pi may really be executing is precisely what CR115 and CR116 exist to prevent.
- Withholding it confines the act to the state where the flag is stale and recovery is already free.

This answered the plan's open question *"what happens to the live Pi process?"* with **nothing, by
construction**: no lease is released, no process is signalled, and the plan's `cleanupLease` step was
dropped.

**3. D1 and D2 moved out of `journeyNavigationCoordinator.ts`** into a new `settlementAbandonment.ts`.
Not touching the coordinator is a stronger guarantee that `cancelVisible` did not change than any
assertion about it — and the assertion is there too.

### What shipped

- **`src/app/settlementAbandonment.ts`** — `settlementAbandonmentOffer` and
  `ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000`. The offer requires owner phase `finalizing`, known
  occupancy, no active native execution, and a wait past the threshold. Each refusal names itself
  (`not_finishing`, `occupancy_unknown`, `native_execution_active`, `too_soon`).
- **The act** (`abandonSettlementWait`) ends the timing collector with `outcome: "failed"` and reason
  `settlement_wait_abandoned_by_navigator`, clears the finishing-phase entry, dispatches
  `finalization_finished` — which is what releases `sendBlocked` — and kicks recovery. It writes no
  turn record, releases no lease, cancels no invocation.
- **The surface** — a notice naming how long the wait has run, and a confirmation that states what is
  kept, what is still owed, and that the turn will be recorded as one that did not finish settling. It
  does not claim the settlement was undone.
- **A stall finally leaves a trace.** This is the one moment the application knows the wait is over,
  so the event that previously wrote nothing now produces a record.

### Validation

| gate | result |
|---|---|
| `npx tsc --noEmit` | clean |
| `vitest` | **240 files / 1,769 tests** (from 239 / 1,755) |
| `cargo test` | 269 passed, 3 ignored |
| `npm run build` | clean |
| `npm run roadmap:check` | READY |

`settlementAbandonment.test.ts` carries 14 guards, including the threshold at its exact boundary, the
refusal while native execution is active, a reducer-level proof that `Finishing` has
`cancelVisible: false` with `sendBlocked: true` and that clearing the flag releases the composer, and
a guard that the act does not reach `finalizeInterruptedTurn`, `releaseDurablePiInvocationLease` or
`cancelLivePiInvocation`.

**One guard re-aimed, not deleted.** CR119's write-once assertion counted exactly one
`appendSettlementTiming(` call site; there are now two. The invariant it protects — never writing from
inside a phase — is intact, and the stronger property is now proved behaviourally instead of by
counting: `registry.end` deletes the collector, so the settlement's own `finally` and the Navigator's
act cannot both produce a record for one turn, whichever arrives first.

### Debt

- **No field verification yet**, with a provocable trigger: the next `Finishing` that passes 60 s
  should show the control, and after use the ledger should carry a `failed` record whose reason is
  `settlement_wait_abandoned_by_navigator` while the composer accepts a new turn with no restart.
- **The hung promise is still pending after the act.** Nothing cancels it. If it later resolves its
  writes are correct — that is the turn settling — and its `finally` becomes a no-op. Nothing has been
  observed to go wrong here, and nothing proves it cannot.
- **A hung-but-live Pi has no exit, and the surface says nothing.** When the lease is genuinely
  active, the offer is withheld and no control appears, so the Navigator sees the same silence as
  before. Refusing is correct; being silent about refusing is not. A candidate CR.
- **The threshold is measured on one Journey.** 60,000 ms was derived from `mirror-desktop`'s 43
  records. Other Journeys' settlements were not measured.
- **The trailing `phase=running` orphan is untouched**, as the plan excluded.
- **Why settlements hang is still unknown.** This makes the consequence survivable, not the cause
  understood — and the record it now writes is what may eventually explain it.
