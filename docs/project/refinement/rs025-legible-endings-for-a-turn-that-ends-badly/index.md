[< Refinement Workbench](../index.md)

# RS025 — Legible Endings for a Turn That Ends Badly

**Status:** active

## Framing

Twenty-one Change Requests across five Refinement Stories have repaired some way a turn can end
badly. Eighteen of them are closed. On 2026-10-16 the field hit the theme **twice in one day** in a
single conversation on production `alpha.50`: once as a provider refusal that was never named
([CR159](cr159-say-why-the-provider-refused-a-turn.md)),
and once as a turn whose answer arrived while the journal never heard it finish
([CR160](cr160-notice-a-turn-the-journal-never-heard-finish.md)).

That is not a grouping problem. It is the signal that **every repair in this theme has been local**,
and the theme itself has never had a closure criterion. Each of the eighteen fixed one named path.
None of them asked whether *every* abnormal ending is legible and escapable, so each new shape
arrives with no net and gets its own local repair.

This RS exists to ask that question once, with a criterion that can fail.

## Desired Outcome

**Closure criterion.** Every way a turn can end abnormally either **names itself** to the Navigator
or **offers an exit** that is not force-quitting the application. No abnormal ending leaves the
Navigator in front of a surface that knows something and says nothing.

The criterion is falsifiable on purpose: one field occurrence of a silent abnormal ending reopens
this RS, whatever the CR census says.

A clause worth stating because the theme keeps violating it: **a repair here must not fire on healthy
turns.** A detector that calls a long legitimate turn stranded is worse than the silence it replaces.
Every CV in this RS carries a negative case with its own fixture.

## Intake Rules

- A CR enters this RS only if its symptom is a turn **ending** abnormally — not a turn starting
  badly, not a turn running slowly, not persistence performance.
- Every CR must name which half of the criterion it serves: **naming** or **exit**.
- Every CR carries a negative fixture proving it leaves healthy turns alone.
- Closed CRs from the lineage below are **not** migrated. They are referenced. Moving a closed CR
  between Refinement Stories rewrites history without delivering anything.

## Lineage

Closed work this RS inherits and does not re-litigate. Each stays in its own Refinement Story with
its own evidence intact:

| RS | Change Requests |
|---|---|
| RS009 | CR019 |
| RS016 | CR031, CR039, CR054, CR055, CR056, CR062, CR115, CR116, CR119, CR121, CR132, CR142, CR149 |
| RS017 | CR034 |
| RS019 | CR057, CR059, CR060 |
| RS021 | CR088, CR089, CR108 |

Two debts in that lineage are the direct reason this RS has live work:
[CR142](../rs016-ongoing-product-improvements-and-adjustments/cr142-stop-losing-a-turn-the-journal-already-answered.md)
left its loss mechanism unestablished, and
[CR132](../rs016-ongoing-product-improvements-and-adjustments/cr132-let-the-navigator-end-a-finishing-that-will-not-end.md)
has a falsified threshold and a field verification still owed.

## Change Requests

- [CR155: Give the Navigator an Exit From a Finishing That Holds a Live Lease](cr155-give-the-navigator-an-exit-from-a-finishing-that-holds-a-live-lease.md) — **in_progress · Batch A** · **naming**, then **exit** · a field occurrence recorded 2026-10-16
- [CR159: Say Why the Provider Refused a Turn](cr159-say-why-the-provider-refused-a-turn.md) — **in_progress · reopened** · field falsifier failed 2026-10-22 on alpha.55: three refusals, no reason shown · the reading works; restore never ran it after a live failure · now read by the failure itself · `refinement/cr159-name-the-refusal-on-a-live-failure`
- [CR160: Notice a Turn the Journal Never Heard Finish](cr160-notice-a-turn-the-journal-never-heard-finish.md) — **done** (2026-10-18) · **exit** · B1 field-verified twice in production; B2's verification transferred to CR161, which opened the gate it shipped behind
- [CR161: Give Every Finishing the Same Exits](cr161-give-every-finishing-the-same-exits.md) — **in_progress** · `refinement/cr161-unify-finishing` · **naming**, then **exit** · from the field, production alpha.52 · *Finishing* has two sources and every exit is attached to one of them · corrects CR155's own allow-list
- [CR163: A Hung Mirror Append Freezes Every Exit](cr163-a-hung-mirror-append-freezes-every-exit.md) — **in_progress** · shipped in alpha.57, field check owed · `refinement/cr163-bound-the-mirror-append` · built 2026-10-27: bounded runner, group kill proved by control + mutation, failure record with stderr tail · planned 2026-10-27 · bound 30 s from 1,141 field deliveries (max 10.7 s) · kill the process **group** — measured: killing `uv` alone leaves python alive · field 2026-10-22, alpha.55: eleven minutes at *Finishing* · the Mirror append waits on its child with no bound while holding the native serialization mutex 71 commands share · every exit's act joined the queue · recovery settled the same delivery in 1.7 s after relaunch

## Census (2026-10-18)

Four CRs, recomputed from the documents' own `**Status:**` lines rather than from this list: **1 done,
3 in_progress**. CR160 is `done` on its B1 clause, field-verified twice in production; CR155, CR159 and
CR161 remain `in_progress` with field checks owed.

**The closure criterion is not met and the Story stays active.** Three of the four open verifications
wait on the same rare event — a turn that freezes at *Finishing* — and one of them, CR161, is the gate
that makes CR160's B2 half reachable at all. A `done` count of one proves a repair worked; it does not
prove that *every* abnormal ending is legible, which is what this Story asked.

## Delivery Shape

**Decided by the Navigator on 2026-10-16**: plan as one batch, implement and validate in two.

Planning as **one batch** — that is this RS's whole purpose, and planning the four together against
one criterion is what stops a nineteenth local repair.

Implementation and validation as **two batches, in this order**, because one masks the other:

**Batch A — naming.** CR155's first slice (render the refusal reasons that are already computed) plus
CR159 (read the `errorMessage` the transcript entry already carries). Both are pure legibility with
no behavioural change, they touch different files, and each is verifiable on the next bad turn of any
kind.

**Batch B — exit.** CR160 (detect the journal/transcript disagreement and route it through existing
recovery). It changes what happens. ~~Plus CR129~~ — **CR129 was returned to RS016 on
2026-10-18**, by the intake rule above: its own Boundaries say *"Not the surface"*, so it serves a
ledger reader rather than the Navigator and names neither half of this criterion. Batch B opens only after Batch A has shipped **and** been
field-checked on at least one abnormal ending.

The ordering is not preference. **When CR160 works, the turn stops hanging, so CR155's surface is
never reached** — shipping them together makes the next hang untestable for A. Abnormal endings are
rare and not provokable on command, so each field occurrence is a scarce measurement and must test
one thing. The theme's own history is the argument: eighteen repairs that could not be attributed to
a moving symptom is how it got here.
