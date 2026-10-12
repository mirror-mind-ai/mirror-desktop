[< RS016](index.md)

# CR149: Keep the Composer Responsive While a Turn Is Finishing

**Status:** captured
**Driver:** —
**Delivery:** —
**Navigator priority:** 1 of 8 (intake 2026-10-12)

## Friction

**Navigator report (2026-10-12):** *"performance de escrita no composer quando um agente entra em
estado de 'finishing' (fica muito lento e travado)"*

Typing in the Composer degrades specifically once the turn enters `Finishing`. The Navigator can
write normally before and after; the slowness is bound to that phase.

## A Located Hypothesis, Not an Established Cause

A plausible mechanism was found by reading, and it is written down as a hypothesis so the repair is
not aimed at the wrong thing.

`App.tsx:1348` holds `finishingTick` as state **in the App root component**, advanced every
1,000 ms for as long as `composerTurnStatus === "finishing"`:

```ts
// CR132: while a wait is visibly running, the offer to end it has to be re-evaluated on a clock
// rather than only when some other state changes […]
const [finishingTick, setFinishingTick] = useState(() => Date.now());
useEffect(() => {
  if (composerTurnStatus !== "finishing") return undefined;
  setFinishingTick(Date.now());
  const handle = setInterval(() => setFinishingTick(Date.now()), 1_000);
  return () => clearInterval(handle);
}, [composerTurnStatus]);
```

**Its only consumer is one line** — `now: finishingTick` at `:1362`, feeding
`settlementAbandonmentOffer`'s threshold comparison. So a root-level state change re-renders the whole
application tree once per second to decide whether a 60-second threshold has been crossed.

Two facts make this worth testing first:

- **The phase boundary matches the symptom exactly.** The effect returns early unless the status is
  `finishing`, so the tick exists only in the phase the Navigator reports.
- **The footer already has its own clock.** `ComposerRuntimeFooter.tsx:81` runs a local
  `setInterval(() => setTick(Date.now()), FINISHING_CLOCK_TICK_MS)`. A second clock at the root may
  not be needed at all.

This is consistent with CR113's domain: that CR made Composer typing responsive in large Journeys, so
the tree being re-rendered here is known to be large and known to be sensitive to re-render cost.

**Not established:** that this tick is the cause, or the only cause. A 1 Hz re-render and
per-keystroke input lag are different frequencies, and the mechanism connecting them — a controlled
input whose commit competes with a root re-render, or memoization defeated once per second — has not
been measured.

## Introduced by CR132, and not folded back into it

The tick's own comment names CR132, which shipped in `alpha.42`. CR132 is closed and released, so
this is captured as its own CR rather than reopening it — a defect a change caused belongs to that
change, but a closed change is corrected by the next one, in the open.

## Outcome

Typing in the Composer during `Finishing` is as responsive as typing in any other phase, and the
abandonment offer still appears when its threshold is crossed on a Journey that is otherwise idle.

## First Investigation

- **Measure before repairing.** Record input latency while typing during `Finishing` against the same
  measurement outside it, on a Journey large enough to show CR113's effect. A repair shipped without
  this number cannot be shown to have worked, and the mechanism above would become an assumption.
- **Test the hypothesis directly.** Suppress the root tick and re-measure. If latency does not move,
  the cause is elsewhere and this CR's premise is wrong — which is the finding.
- **Can the clock live where it is read?** The offer is consumed by the footer, which already ticks.
  Whether the threshold can be evaluated there, or by the existing tick, without moving the decision
  out of the domain function that owns it.
- **What else re-renders in this phase?** `composerTurnStatus === "finishing"` may drive other
  subscriptions. Surveying one path is not surveying the system.

## Boundaries

Does not change when the abandonment offer appears, its threshold, or
`settlementAbandonmentOffer`'s refusals — that behaviour is CR132's and is correct. This is about the
cost of evaluating it, not its semantics. Does not touch `cancelVisible`, `sendBlocked` or the
occupancy guard.

## Provenance

`App.tsx:1348`–`:1362` and `ComposerRuntimeFooter.tsx:81` read from source on 2026-10-12. The
symptom and its phase binding are the Navigator's report. No latency measurement exists yet.
