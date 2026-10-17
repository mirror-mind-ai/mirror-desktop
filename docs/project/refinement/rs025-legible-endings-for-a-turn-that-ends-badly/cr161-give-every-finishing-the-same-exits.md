[< RS025](index.md)

# CR161: Give Every Finishing the Same Exits

**Status:** planned
**Driver:** @alissonvale
**Delivery:** —

## Friction

Field occurrence on 2026-10-17, production `v0.2.0-alpha.52` — the build carrying **both** RS025
batches — in the Navigator's own `mirror-desktop` conversation:

> *"Essa conversa acabou de travar no finishing. Forcei o encerramento do app e reiniciei."*

Asked whether the sentence [CR155](cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md)
shipped had appeared — *Still finishing after Ns*, with the native-execution explanation — the answer
was **"não vi a mensagem"**.

Two notices were built for exactly this moment, shipped in `alpha.51` and `alpha.52`, and **neither
could render**. Both were correct in isolation. The defect is between them.

## The Mechanism, Established From the Artefacts and the Code

`alpha.52` shows *Finishing* through **two independent sources**, and every exit is attached to only
one of them.

```text
deriveComposerTurnStatus:
  if (isStreaming || agentRunStatus === "running") return "working";
  if (isFinalizingTurn)                            return "finishing";   ← source 1
  if (mirrorRepairPending)                         return undefined;
  if (reconciliationBlocksInvocation)              return "finishing";   ← source 2
```

**Source 1** sets `isFinalizingTurn`, which is what `selectJourneyRuntimeOwnerPhase` reports as
`ownerPhase: "finalizing"`. CR132's exit and CR155's naming are both attached to it.

**Source 2** is `dedicatedTurnBlocksNewInvocation(dedicatedTurnState)` — true while the turn state is
`provider_running` or `projection_pending`. It sets **nothing** in the runtime state, so `ownerPhase`
is not `finalizing`.

### This occurrence took source 2, and that is established rather than guessed

`finalization_started` is dispatched **inside the settlement path** (`App.tsx:3736`), immediately
before `settlementTimingRegistry.begin(...)`. So:

| fact | evidence |
|---|---|
| the journal never advanced past `running` | the record for `agent-run-2026-10-17T11:27:13…` was still `running` when the app was force-quit, and only reached `settled` at 11:33:52 **after relaunch**, through recovery |
| the settlement therefore never ran | `settlement-timings/mirror-desktop.json` has an mtime of 11:20:52, before this turn; nothing was appended for it |
| so `finalization_started` was never dispatched | it is dispatched only on that path |
| so `isFinalizingTurn` was false, and `ownerPhase` was not `finalizing` | `selectJourneyRuntimeOwnerPhase` derives `finalizing` from `isFinalizingTurn` alone |
| so the surface's *Finishing* came from source 2 | it is the only remaining source |

### Both notices were then silent, for two different reasons

| layer | returned | why |
|---|---|---|
| `settlementAbandonmentOffer` | **`not_finishing`** | `ownerPhase !== "finalizing"` — and `finishingSince` was never set either, since that too is populated by the settlement path |
| `deriveStrandedTurn` | **`not_streaming`** | a surface reading *Finishing* proves `isStreaming` is false, because `deriveComposerTurnStatus` returns `"working"` whenever it is true |

Neither predicate is wrong about its own question. Together they leave the one state the Navigator
actually reaches with no sentence and no exit.

## A Correction I Owe to My Own Batch A

CR155's slice 1 added an allow-list over the refusal union so that a refusal could not be silent by
default. It listed two refusals as **deliberately silent**:

```ts
const deliberatelySilent = new Set(["not_finishing", "too_soon"]);
```

`not_finishing` was listed on the assumption that it means *there is no finishing at all*, and that a
sentence there would appear in front of an idle conversation. **That assumption is false in exactly
the state this CR describes:** `not_finishing` is returned while the composer says *Finishing*. The
predicate's name is true about `ownerPhase` and false about the screen.

So the guard I wrote to stop a refusal from being silent by default is itself the thing that kept
this one silent, by my own explicit listing. That is worse than an oversight and it is recorded here
rather than quietly repaired.

## Expected Behavior

Whatever path puts *Finishing* on the screen, a Navigator who has been waiting long enough is told
what the application believes, and is offered an exit wherever one can be offered safely. No path to
*Finishing* is reachable without the exits that belong to *Finishing*.

## Scope — Planned 2026-10-17

Selected by the Navigator. Delivery not yet named; nothing implemented.

**Scope.** Make the exits key on *the state the surface is in* rather than on the one mechanism that
happens to record it.

- Give source 2 an owner phase. Either `selectJourneyRuntimeOwnerPhase` learns about the
  reconciliation-blocked state, or the composer's two sources are unified into one derived value
  that both the surface and `settlementAbandonmentOffer` read. **The second is preferable**: one
  derivation cannot disagree with itself, and this CR exists because two of them did.
- Open the stranded predicate's gate. `deriveStrandedTurn` and its poll currently require
  `believedStreaming`; they should run while the turn is finishing by either source.
- Reconsider `not_finishing` as deliberately silent once it can no longer be returned while the
  screen says *Finishing*.
- `finishingSince` needs a source for path 2, or the wait cannot be counted and every
  threshold-based notice stays silent regardless of the other repairs.

**Files.** `src/app/composerTurnStatus.ts`, `src/app/journeyRuntimeState.ts`,
`src/app/settlementAbandonment.ts`, `src/app/strandedTurn.ts`, `src/app/App.tsx`, plus tests beside
each.

**Acceptance.** A turn whose journal froze before settlement, with the composer showing *Finishing*,
produces a named sentence after the threshold and an exit where one is safe. The existing
settlement-path behaviour is unchanged. **Negative, and non-negotiable:** an idle conversation and a
healthy long turn acquire neither sentence nor poll — this is what CR115's gate protects, and the
reason the current gate exists.

**Validation.** A fixture per source of *Finishing*, asserting the same sentence from both. A
cross-check that the composer's status and `settlementAbandonmentOffer` are derived from one value,
so they cannot disagree again. The allow-list from CR155 extended to assert that `not_finishing` is
unreachable while the composer reads *Finishing*, which is the guard this occurrence proves was
missing.

**Exclusions.** Does not change what the native terminal path writes, and does not touch the
attribution rule — CR160's B1 is field-verified twice and recovers these turns on relaunch. This CR
is about the wait, not the repair.

**Boundaries.** Not the ledger, and not recovery's own silence — the skips file still has a producer
and no reader, which is CR160's recorded Next Horizon and stays there. Not CR155's remaining slices:
a *measured* exit for a dead lease still depends on `measure_child_liveness` and on reversing CR132's
timeout exclusion, and this CR deliberately offers only exits that are already safe to offer. Not the
composer's responsiveness — CR149 owns that, and the unification here must not add per-second state
to the App root. Does not touch the surface for any Journey other than the selected one.

## Slice Order, and Why It Is This Order

1. **Unify the two sources** into one derived value that both the composer and
   `settlementAbandonmentOffer` read. Structural, and the reason this CR exists.
2. **Give that value a `since`.** Precondition for everything measured by a threshold — without it
   the wait is not countable and every notice stays silent regardless of slices 3 and 4.
3. **Open the stranded predicate's gate** to the unified finishing state, with CR115's negative case
   guarded explicitly.
4. **Re-examine `not_finishing`** in CR155's allow-list, once it can no longer be returned while the
   screen says *Finishing*.

Slices 1 and 2 are a precondition for 3 and 4 producing anything visible at all. **One batch**, which
is a departure from RS025's Batch A/B split and is justified below rather than assumed.

## A Masking I Am Naming Before It Happens

Opening the stranded gate (slice 3) will put a recovery exit on screen at roughly the 10-second grace.
CR155's naming sentence fires at 60 seconds. **So a Navigator who acts on the recovery exit will never
reach the sentence**, and the field verification CR155 is still owed becomes unobtainable by the same
mechanism that made CR160's B2 unobservable.

That is the Batch A/B argument again, and it points at splitting. **I am deliberately not splitting.**
Shipping the naming alone first would verify my fixture at the cost of leaving the Navigator another
cycle with no exit from a state they have now hit three times in two days — optimising my measurement
over their use of the application. The recovery exit is the better outcome and it ships with the rest.

**Consequence, accepted and recorded:** CR155's 60-second sentence will be verified by fixture and by
the allow-list guard, not by the field, and it must not later be claimed as field-verified. This is
the same limit I failed to notice for B2, named in advance this time.

## What Cannot Be Established

**Nothing durable records which notice was on screen.** The Navigator's *"não vi a mensagem"* is
consistent with the mechanism above, but it cannot be distinguished from a notice that rendered and
was not noticed. The mechanism is established from the artefacts and the code; the observation is
corroboration, not proof.

That absence is itself a candidate finding: every other claim in this Refinement Story has been
settled from a durable artefact, and this one could not be.

## Provenance

Production app data read on 2026-10-17, read-only, with production running at pid 95585. Journal,
Pi session JSONL, settlement timings and `mirror-append-recovery-skips.jsonl` inspected directly.
`deriveComposerTurnStatus`, `selectJourneyRuntimeOwnerPhase`, `dedicatedTurnBlocksNewInvocation`,
`settlementAbandonmentOffer`, `deriveStrandedTurn` and the `finalization_started` dispatch site read
from source. Nothing was written to production state.
