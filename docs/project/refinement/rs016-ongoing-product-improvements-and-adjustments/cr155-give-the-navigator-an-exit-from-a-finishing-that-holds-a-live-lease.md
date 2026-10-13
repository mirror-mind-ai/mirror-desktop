[< RS016](index.md)

# CR155: Give the Navigator an Exit From a Finishing That Holds a Live Lease

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 7 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"finishing travado nao libera cancelamente nem envio de novo
turno (timeout tambem nao funciona)"*

A `Finishing` that will not end still locks the Navigator out. No cancel, no new turn, and waiting
does not help.

## CR132 Predicted This Exactly, and Named It

CR132 shipped the exit in `alpha.42` and recorded, in its own closure, the state where the exit does
not appear:

> **A hung-but-live Pi has no exit, and the surface says nothing.** When the lease is genuinely
> active, the offer is withheld and no control appears, so the Navigator sees the same silence as
> before. Refusing is correct; being silent about refusing is not. A candidate CR.

**This report is that candidate CR arriving from the field.** It is not a refutation of CR132 — it is
the half CR132 deliberately did not build, hit in use.

`settlementAbandonment.ts` names its four refusals, and one of them is this:

| refusal | means |
|---|---|
| `not_finishing` | the phase is not `finishing` |
| `occupancy_unknown` | the native registry could not be read |
| **`native_execution_active`** | **a lease says Pi is still executing** |
| `too_soon` | the wait has not passed 60 s |

The refusal is already computed and already named. **Nothing shows it to the Navigator.** The
difference between *your wait has not reached a minute* and *the system believes work is still
running* is the whole difference between waiting and being stuck, and both look identical on screen.

## "Timeout também não funciona" — there is no timeout, by decision

CR132 excluded one in writing:

> **Not a timeout.** Nothing here should end a settlement on its own. The Navigator judges; the
> application obeys.

And `ABANDON_SETTLEMENT_OFFER_AFTER_MS = 60_000` is a threshold for **offering** the act, never for
performing it. So the Navigator is reporting the absence of something that was a conscious design
choice — which means the choice is what this CR has to revisit, not a broken implementation.

That exclusion was well reasoned and is the reason the two halves must be separated here: the silence
is a defect, while the absent timeout is a decision that may or may not deserve reversing.

## Why Refusing Was Correct, and Why That Is Not Enough

`derivePiInvocationAdmission` and `hasActiveNativeExecution` share one predicate,
`isActivePiInvocationLease`. An active lease therefore means both that the composer is blocked and
that CR115's and CR116's repair route must refuse. CR132 withheld the offer there because releasing a
lease while Pi may really be executing is what CR115 and CR116 exist to prevent, and because a
hung-but-live process is indistinguishable from a working one at the occupancy level.

All of that still holds. What does not follow is that the Navigator should be told nothing.

**CR147 changed the ground under this.** It closed the two ways a run-loop thread could die without
terminalizing, so a lease that stays active after the work is gone is now a narrower case than it was
when CR132 was written. Whether it is now rare enough to be handled differently is a question CR132
could not ask.

## Outcome

A Navigator facing a `Finishing` that will not end is told what the application believes and what
their options are, and is not left in a silence that is indistinguishable from a wait. Where an exit
can be offered safely, it is offered.

## First Investigation

- **Say the refusal before changing it.** The cheapest honest improvement is to surface
  `native_execution_active` and `occupancy_unknown` as what they are. That alone converts an
  unexplained lockout into a legible one, and needs no new authority. **It should be measured as a
  slice of its own before anything braver is built.**
- **Is the lease real?** `measure_child_liveness` can establish whether the child process still
  exists. A lease whose process has exited is a dead lease, and CR145 already releases those — so the
  first question is whether this state is a missing *measurement* rather than a missing control.
- **What did the field actually show?** This report has no run id, no journal record and no timing
  ledger entry attached. The next occurrence should be read from `turn-journal`,
  `settlement-timings` and **`native-panics.jsonl`**, which CR147 added precisely so a recurrence
  leaves a record. If a panic trace exists, this is CR147's mechanism and the diagnosis is already
  written.
- **The 60-second threshold is already falsified, and that lands here.** Measured 2026-10-12 over
  **779 production settlements** (see
  [`production-settlement-distribution-2026-10-12.md`](../../../update/production-settlement-distribution-2026-10-12.md)):
  production settles in **4,821 ms at the median and 7,897 ms at p90**, and **two legitimate
  settlements completed above 60 s** — `mirror-desktop` at **81,338 ms** and
  `livro-lideranca-soberana` at **113,048 ms**, both `outcome: settled`, with their phases accounting
  for ~100% of the window. **Both would have been offered "Stop waiting" while working correctly**,
  and one is in this Journey. CR132 wrote the condition itself — *"if a legitimate settlement is ever
  recorded above this, the constant moves and the record says why"* — and its own debt line admitted
  the threshold came from one Journey's 43 records. Those two records **predate the derivation**: the
  data was there and the wrong 43 were read. Moving the constant is a Workbench decision and the
  evidence for it is now on file; p99 across all Journeys is 41,741 ms, which is the number a new
  threshold should be argued from.
- **Does the timeout exclusion survive?** CR132's argument was that only the Navigator knows a wait
  is futile. If the field shows the application can know it — a dead child under a live lease is
  exactly that — then a bounded automatic action becomes defensible. **Reversing that exclusion is a
  Workbench decision, not mine**, and it should be reversed on evidence rather than on frustration.
- **Is `sendBlocked` the right thing to hold?** A new turn is refused because occupancy says a lease
  is active. Whether a Navigator may start a new turn in the same conversation while an old lease is
  stuck is a product question RS024's workspace grain may already answer differently than the
  Journey grain did.

## Boundaries

Does not loosen `hasActiveNativeExecution`, does not release a lease while a child may be executing,
and does not kill a process the application has not measured. CR115's and CR116's guard stays as they
left it. Does not change `cancelVisible` or native cancellation authority. Does not re-decide CR132's
threshold for the existing offer.

## Provenance

CR132's closure debt and exclusions quoted verbatim from its own document.
`settlementAbandonment.ts` refusal reasons and `ABANDON_SETTLEMENT_OFFER_AFTER_MS` read from source
on 2026-10-12. The friction is the Navigator's report; **no durable record of this specific
occurrence has been read**, and nothing here attributes it to a mechanism.
