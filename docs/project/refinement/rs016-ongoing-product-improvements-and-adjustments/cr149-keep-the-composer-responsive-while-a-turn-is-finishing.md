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


---

## Implementation (2026-10-12)

### What shipped

- **`src/app/SettlementAbandonmentNotice.tsx`** — new. Owns a 1 Hz `setInterval`, calls
  `settlementAbandonmentOffer` itself, renders the notice. Clock runs only while
  `ownerPhase === "finalizing"` and no test `now` was supplied, so a Journey that is not finalizing
  does not keep a clock running to be told it has no offer.
- **`App.tsx`** — `finishingTick`, its effect and the render-time offer are gone. The four slow
  inputs became one `abandonSettlementInputs` object with exactly two consumers: the component, and
  the act's guard. The act now evaluates `settlementAbandonmentOffer({ ...inputs, now: Date.now() })`
  at the instant it runs.
- **`src/app/settlementAbandonment.ts` — unchanged.** Verified by the diff producing no hunk for it,
  not by claiming it.

The `App.tsx` diff is **15 insertions against 26 deletions**: a net removal, which is the arithmetic
that matches the intent.

**During `Finishing`, the App root no longer advances any per-second state.**

### Two of my own errors, kept rather than tidied

**1. A root clock twice as fast as the one I removed was in my own earlier reading and forgotten by
the time I wrote the assertion.** The interval-pinning test expected two remaining root clocks and
failed against three: there is a **500 ms** one at `App.tsx:2137`. The test was the defect, not the
code. It is now pinned at three, and the 500 ms one is out of scope for a stated reason — it is
gated on `voiceSession`, so it runs only while the Navigator is recording voice, which is not a
state in which they are typing into the Composer. A second test asserts that gate, because *the gate
is the entire justification*: ungated, it would be a worse instance of this CR's own defect.

**2. `ownerPhase="active"` is not a variant.** `JourneyRuntimeOwnerPhase` is exactly
`"running" | "finalizing"`. **`vitest` passed it and `tsc` caught it** — the test ran green while
being type-invalid, which is worth recording as a property of this suite rather than as a one-off.

### CR138's guard caught this change, and was strengthened rather than relaxed

`runtimeWorkspaceKeying.test.ts` asserts the settlement exit consults the **workspace** form of the
occupancy predicate and never the Journey aggregate. It sliced 600 characters forward from the first
`settlementAbandonmentOffer({` call site, because the predicate was written inline there. Moving the
inputs out of the root moved the predicate out of that window, and the guard failed.

**The invariant was never violated** — `hasActiveNativeExecution(piInvocationOccupancy,
selectedWorkspace)` is still the only predicate the exit consults. So the guard was re-aimed onto the
single `abandonSettlementInputs` definition, and in doing so it got **stronger**: it now also
requires that *every* `settlementAbandonmentOffer(` call in `App.tsx` spreads those inputs. Before,
a second call site could have built its own inputs with the Journey aggregate and the guard would
never have looked at it. Control 6 below proves exactly that gap is now closed.

### Validation

| gate | result |
|---|---|
| `npx tsc --noEmit` | clean |
| `vitest` | **258 files / 2,054 tests** (from 257 / 2,040) |
| `cargo test` | 317 passed, 3 ignored |
| `npm run build` | clean |
| `npm run roadmap:check` | READY |

**CR132's 14 guards in `settlementAbandonment.test.ts` passed unmodified**, which was the plan's
stated signal to stop. They were not touched.

### Six controls

A guard that cannot fail is not a guard. Each sabotage was applied, the named test confirmed failing,
and the file restored.

| # | sabotage | caught by |
|---|---|---|
| 1 | re-introduce a 1 s root clock | the root-clock guard **and** the interval pin (2 failures) |
| 2 | revert the act's guard to a render-time read | the call-time guard |
| 3 | add a brand-new 250 ms root clock | the interval pin |
| 4 | let the component import the threshold and decide itself | the domain-authority guard |
| 5 | consult the Journey aggregate in the exit's inputs | CR138's re-aimed guard |
| 6 | add a second call site building its own inputs | CR138's re-aimed guard — **which the original could not catch** |

### Debt

- **The performance claim is unproven and stays unproven until the field says otherwise.** This
  removed a mechanism that could plausibly cause the lag. It did not measure the lag, because typing
  in the application is the Navigator's act. The field check is owed and its falsifier is written
  before the build is handed over.
- **The 500 ms root clock is left in place**, justified by its `voiceSession` gate and by nothing
  else. If voice capture ever runs ungated, that justification expires.
- **`strandedTurnTick` (15 s) and `relativeTimeNow` (60 s) are untouched** and are the next
  candidates if the field check fails.


---

## Field result: the hypothesis is refuted (2026-10-12)

Reproduced in the **Eval** channel — which uses production's own data directory and Mirror binding —
on a large production conversation, the condition Dev could not supply.

> *"Consegui reproduzir o problema no eval e a lentidão no finishing ainda permanece."*

**The root 1 Hz clock was not the cause.** This CR's Outcome is **not met** and the CR stays open.
The shipped slice is kept: it was justified structurally, without the performance claim, and that
justification did not depend on being right about the cause.

Details and limits in
[`docs/update/cr149-field-verification-2026-10-12.md`](../../../update/cr149-field-verification-2026-10-12.md).
Note in particular that *"still slow"* refutes *"the lag is gone"* and says nothing about *"less
slow"* — there was no A/B in Eval.

## What the refutation sent me to find

Going back to the code without the clock to blame produced two findings that are **established by
reading rather than inferred from perception**, which is the difference from the first hypothesis.

### 1. `React.memo` on `ConversationTranscript` has never prevented a single re-render

`ConversationTranscript` is wrapped in `memo` and takes 21 props, compared shallowly. One of them is
constructed fresh on **every** render, unconditionally (`App.tsx:6145`):

```tsx
onLoadEarlierHistory={() => void loadCompleteSegmentHistory()}
```

A new function identity every render makes the shallow compare fail every render. `liveResponseModel`
does the same with an object literal whenever it is defined. **So the memo is inert: every App root
render re-renders the whole transcript.**

Everything around it is built correctly, which is what makes this worth stating rather than
generalising: `handleChatLocalPath` is `useCallback`'d, `importedActivity`, `assistantTurnProximity`
and `conversationChapters` are `useMemo`'d, and the rows are themselves `memo`'d. One unstable prop
defeats all of it.

### 2. `navigationPresentation` is not memoized, so the transcript's own `useMemo`s never hold

`App.tsx:1090` calls `deriveJourneyNavigationPresentation({…})` raw on every render, and
`messages` and `presentedConversation` are read off its result. Both therefore change identity every
render, so inside the transcript `buildConversationTranscriptIndex(conversation)` and
`createConversationTurnNavigationItems(messages)` recompute every render — two **O(n)** passes over
every message in the conversation.

`findConversationSearchMatches` is **not** part of this cost: it returns `[]` immediately on an empty
query, so it is O(1) while the search box is unused. Said explicitly because it is the most expensive
looking of the three and it would be the natural thing to blame.

### Why this fits the evidence the first hypothesis did not

| observation | root clock | memo defeat + O(n) passes |
|---|---|---|
| only reproducible in a **large** conversation | unexplained | **explained** — the cost is O(n) |
| specific to `Finishing` | explained | **explained** — settlement emits a burst of root state updates |
| **survived removing the 1 Hz clock** | **contradicted** | explained — that was one render source among many |
| CR113 fixed typing generally but not this | unexplained | explained — CR113 stopped the *keystroke* re-rendering; this is everything *else* re-rendering while you type |

## What I am deliberately NOT doing

**Not shipping this as a fix.** Both findings are real defects and both are correct to repair, and
*that is exactly the reasoning that just failed*: the clock was also a real defect, also correct to
repair, and did not fix the friction. **A second structurally-justified repair aimed at an unmeasured
cause would be the same mistake with a different line number.**

The next step is a measurement, and a measurement is now affordable for the first time because the
Navigator can reproduce the symptom on demand.

## Next Investigation

- **The one-minute discriminator, before any profiling.** If the mechanism is *root render → O(n)
  transcript work*, the lag must also appear while the answer is **streaming**, which updates root
  state far more often than settlement does. Typing during streaming in the same large conversation
  separates *"any render burst is expensive here"* from *"something specific to `Finishing`"*. These
  lead to different repairs and the question costs one turn.
- **Then a profile.** `npm run tauri:user` runs the production channel in dev mode — production data
  plus Web Inspector — so a performance recording while typing during `Finishing` would name the
  dominant function instead of nominating one.
- **Count the renders before reducing them.** How many times the transcript renders during one
  settlement is currently unknown, and it decides whether this is one expensive render or forty cheap
  ones. The repair differs.
- **Only then decide the repair**, and record which measurement justified it.


---

## The discriminator, and a third hypothesis falsified (2026-10-12)

### The discriminator answered: only `Finishing`

> *"Só trava no `Finishing`"*

Typing while the answer is **streaming** is fine. Streaming emits far more root state updates than
settlement does, so **the memo defeat and the two O(n) passes are not the dominant cost.** They stay
real defects and drop to coadjuvants — which is what the branch was written to decide.

### A third hypothesis, and the ledger falsified it too

Reading `saveProjection` found `JSON.stringify` of the whole conversation on the main thread, passed
through `invoke` — a credible freeze in a large conversation. **The prediction was written before
looking at the data**: if that were the mechanism, the phase wrapping the projection save would
dominate `totalMs`.

**It does not.** The measurement is in
[`docs/update/production-settlement-distribution-2026-10-12.md`](../../../update/production-settlement-distribution-2026-10-12.md).
The cost is spread across 14 depth-0 phases, the largest at 14%, and phases with **trivial payloads
that never touch the conversation** — `load_journal`, `advance_journal`, `cleanup_lease` — are
inflated in the same proportion as the ones that serialize megabytes.

The decisive number: within one session on one Journey, `load_journal` ran **27 ms on one turn and
3,109 ms on another**, on the same file. **The variance is not in the work.** And it is not
conversation size either, because the fast and slow turns are the same conversation.

### What the measurement did establish

- **Production settles in 4.8 s at the median and 7.9 s at p90**, over 779 records — against Dev's
  ten measurements of 1.6–3.0 s. **This is why Dev could not reproduce the symptom**, and it means
  the window the Navigator is locked out of is typically five seconds and often eight.
- Every awaited operation is inflated **multiplicatively and uniformly**, with a tight median and a
  heavy tail, in every Journey, over weeks.
- **A hypothesis of mine died on the way**: that the Navigator's typing caused the inflation. The
  pattern is historical and predates the Eval session by weeks. Recorded because the data killed it.

### Three hypotheses, three refutations, and what each one bought

| # | hypothesis | killed by | what it bought |
|---|---|---|---|
| 1 | the root 1 Hz clock | the field, in Eval | eliminated the clock; shipped a justified structural repair |
| 2 | memo defeat + O(n) transcript passes | the streaming discriminator | demoted to coadjuvant; two real defects now on the record |
| 3 | whole-conversation `JSON.stringify` in settlement | the timings ledger | killed payload size as the explanation, and surfaced the real distribution |

**None of the three was shipped as a fix on the strength of being structurally correct**, except the
first — which is exactly why the second and third were not. The cost of being wrong three times is
three documents; the cost of shipping the second or third as a repair would have been the Navigator
believing their friction was fixed again.

## Next Investigation, now justified by measurement

- **Profile the main thread.** A uniform multiplicative inflation of every awaited operation is the
  signature of event-loop or IPC-queue contention, but **nothing measured so far looks at the main
  thread** and that reading is an inference from the shape of the numbers.
  ~~`npm run tauri:user` runs the production channel in dev mode — production data plus Web
  Inspector.~~ **Withdrawn (2026-10-12): `tauri:user` runs `tauri dev`, which compiles Rust in the
  debug profile, and `Cargo.toml` declares no `[profile]` overrides.** Profiling it would measure a
  build nobody runs, which is disqualifying when the open question is whether the time is spent
  natively. The instrument is instead the **evaluation channel carrying `tauri/devtools`** —
  release-optimized Rust, real data, Web Inspector in one bundle, and unreachable from production by
  construction. Protocol and the report it must produce:
  [`cr149-profiling-protocol-2026-10-12.md`](../../../update/cr149-profiling-protocol-2026-10-12.md).
- **The two findings from hypothesis 2 are still worth repairing on their own terms**, as their own
  slice or their own CR, and **explicitly not as a fix for this friction**. Shipping them as the fix
  is the mistake this CR has now avoided twice.
- **Carry the real distribution into every threshold this project has derived.** Several were
  computed from Dev or from one Journey. One is already falsified — see CR155.
