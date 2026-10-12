[< RS016](index.md)

# CR149: Keep the Composer Responsive While a Turn Is Finishing

**Status:** planned
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr149-keep-the-composer-responsive-while-finishing`
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


---

## Plan (2026-10-12)

### What the tick actually serves

`finishingTick` feeds exactly one call, `settlementAbandonmentOffer` at `App.tsx:1355`, and that
result has exactly three consumers:

| site | what it reads | needs a per-second value? |
|---|---|---|
| `:4054`, inside `abandonSettlementWait()` | `.offered`, as a guard | **no** — it is read when the act runs, not when the tree renders |
| `:6183` | `.offered`, to render the notice at all | **no** — it changes once, when the threshold is crossed |
| `:6185` | `Math.round(waitedMs / 1000)` | **yes** |

So **one span of text** needs a clock, and the application re-renders from its root once per second
to produce it.

### The repair removes the root clock entirely

Three moves, none of which touch the domain function:

1. **The act's guard moves to the instant of the act.** `abandonSettlementWait()` computes the offer
   with `Date.now()` instead of reading a render-time value. This is **strictly more correct than
   today**, where the guard can be up to a second stale — it is not merely a relocation.
2. **A new component owns the clock.** It receives the four slow inputs, keeps its own 1 Hz
   `setInterval`, calls `settlementAbandonmentOffer` itself, and renders the notice. This is exactly
   the pattern `ComposerRuntimeStatus` already uses in `ComposerRuntimeFooter.tsx:74`–`:84`, with the
   same `now?` test seam, so the house already has one of these to copy.
3. **`finishingTick` and its `setInterval` are deleted** from the App root.

The result: during `Finishing`, **no state in the App root advances on a per-second clock.** The
clock survives only in the component that draws a second counter.

### This ships on structural grounds, not on the performance claim

A root-level state change once per second, to evaluate one threshold and draw one text span, is wrong
whether or not it is the measured cause of the Navigator's typing lag. **That matters because I cannot
measure the lag.** Typing in the application is the Navigator's act, so:

- **The before-state is their report**, which is why it is quoted verbatim in the Friction above.
- **The after-state is a field check with a falsifier written before the build is handed over**: if
  typing during `Finishing` is still slow, the hypothesis in this document was wrong, the structural
  repair still stands, and CR149 needs a second pass against a different cause. **That outcome is the
  finding, not a failure** — and it is the reason the hypothesis was labelled as one rather than
  asserted.

### The other root clocks, named and left

Two more root-level clocks exist and are deliberately out of scope, so this survey is not mistaken
for an exhaustive one:

| clock | interval | relative frequency |
|---|---|---|
| `finishingTick` (`:1348`) | 1,000 ms | the subject of this CR |
| `strandedTurnTick` (`:702`, polled at `:2588`) | `STRANDED_TURN_POLL_MS = 15_000` | 1/15th |
| `relativeTimeNow` (`:632`, `:2558`) | 60,000 ms | 1/60th |

If the field check fails, these are the next candidates — which is a better reason to leave them
than to touch them now.

### Files

- `src/app/SettlementAbandonmentNotice.tsx` — **new**. The component and its clock.
- `src/app/App.tsx` — delete the tick, move the guard to call time, render the component.
- `src/tests/settlementAbandonment.test.ts` — the source guard and the call-time guard.
- `src/tests/settlementAbandonmentNotice.test.tsx` — **new**. The component's own behaviour.

`src/app/settlementAbandonment.ts` is **not** in this list, and that absence is the point: the
decision stays where CR132 put it.

### Acceptance

- While `Finishing`, the App root holds no state advanced by a sub-minute clock. Asserted as a
  **source guard**, so re-adding one is caught rather than noticed.
- The notice still appears only once the threshold is crossed, and still names the wait in seconds,
  advancing every second.
- `settlementAbandonment.ts` is **unchanged**, verified by the diff rather than claimed.
- The act's guard is evaluated against the clock at the moment of the act.
- The act remains idempotent, still writes exactly one timing record, and still refuses while native
  execution is active.
- `cancelVisible` and `sendBlocked` derivations are untouched.
- CR132's 14 existing guards in `settlementAbandonment.test.ts` pass unmodified. **Needing to edit
  them is the signal to stop.**

### Validation

- `npx tsc --noEmit`, full `vitest`, `cargo test`, `npm run build`, `npm run roadmap:check`.
- **A control for the source guard**: re-introduce a root-level per-second clock and confirm the
  guard fails. A guard that cannot fail is not a guard.
- **A control for the call-time guard**: a test proving the act refuses when the threshold has not
  been reached at the moment it is called, even if a stale render said otherwise.

### Exclusions

- Does not change `ABANDON_SETTLEMENT_OFFER_AFTER_MS`, the four refusal reasons, or what the act does.
- Does not touch `ComposerRuntimeStatus`'s own clock, which is already local and already correct.
- Does not touch the other two root clocks.
- **Does not claim to have fixed the typing lag.** It removes a mechanism that could plausibly cause
  it; the field decides.
