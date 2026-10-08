[< RS016](index.md)

# CR132: Let the Navigator End a Finishing That Will Not End

**Status:** captured
**Driver:** —
**Delivery:** —

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
