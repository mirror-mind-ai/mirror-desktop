[< RS025](index.md)

# CR155: Give the Navigator an Exit From a Finishing That Holds a Live Lease

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs025-batch-a-naming`
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

## Proposed Scope — Slice 1, Naming

Planned 2026-10-16 as RS025 **Batch A**. The First Investigation already named this slice and asked
that it be measured on its own before anything braver is built. The field occurrence below is the
measurement that selected it.

**Scope.** Render the refusal `settlementAbandonmentOffer` already computes. The decision function is
not changed and stays the single authority; the component that draws its output stops drawing
silence for `native_execution_active` and `occupancy_unknown`.

**Files.** `src/app/SettlementAbandonmentNotice.tsx` (render the reason), `src/app/settlementAbandonment.ts`
(one pure function mapping a refusal to its sentence, so the words are testable without a DOM),
`src/tests/settlementAbandonmentNotice.test.tsx`, `src/tests/settlementAbandonment.test.ts`.

**Acceptance.**
- While `ownerPhase === "finalizing"` and the offer is refused as `native_execution_active`, the
  notice says the agent is still executing natively and that no exit can be offered until it ends.
- Refused as `occupancy_unknown`, the notice says the application cannot tell whether the agent is
  still running.
- Refused as `too_soon`, the counter behaves exactly as today.
- **Negative case.** `ownerPhase` not `finalizing` renders nothing, as today. A healthy running turn
  must not acquire a sentence.
- When the offer is made, nothing changes.

**Validation.** A fixture per refusal variant, built with the component's `now` seam. The guard that
replaces the one that passed while covering silence: an **allow-list over the refusal union** —
every `reason` except `not_finishing` must reach the DOM, so adding a fourth refusal later cannot be
silent by default. A control that the sentence for `native_execution_active` is absent when the
reason is `too_soon`.

**Exclusions.** No exit is added in this slice. The 60 s threshold is not moved. `hasActiveNativeExecution`
is not loosened. Slice 2 — a measured exit for a dead lease — is **Batch B material and is not
planned here**; it depends on `measure_child_liveness` and on the Workbench reversing CR132's
timeout exclusion on evidence.

## Field Occurrence (2026-10-16)

Status unchanged. Recorded as evidence; selection and status remain the Navigator's.

Production `alpha.50`, Journey `alissonvale-com`, conversation *"Comunidade Alisson Vale"*, reported
as the **second occurrence that day in the same conversation**:

> *"Ele ficou parado em Finishing. O composer não libera o cancelamento e não tenho como sair da
> situação a não ser forçando o encerramento do app."*

### What the artefacts show

The turn **succeeded**. Pi produced a complete answer at `13:01:49.786Z` — `stopReason: "stop"`,
model `gpt-5.6-terra`, 1,877 characters, after two tool calls.

The turn journal record for `agent-run-2026-10-16T13:00:42.068Z` reads
`createdAt 13:00:42.072 → updatedAt 13:00:42.119`, **phase `running`**, and was never written again.
At the time of inspection it had been frozen for six minutes. No settlement record exists for it;
`settlement-timings/alissonvale-com.json` still ends at the 12:45 turn.

So the native terminal path never ran: no `terminal_durable`, no `projected`, no `outbox_enqueued`.

### Three refusals, each correct, all silent

| layer | what it decided | why |
|---|---|---|
| `deriveStrandedTurn` | ~~`journal_agrees`~~ **`not_streaming`** | ~~`"running"` is not in `TERMINAL_PHASES`.~~ **Corrected 2026-10-17:** the predicate short-circuits one line earlier. A surface reading *Finishing* proves `isStreaming` is false, because `deriveComposerTurnStatus` returns `"working"` whenever it is true — so `believedStreaming` was false and the phase check was never reached. The phase fact is true about the code and was never the operative reason. See [CR160](cr160-notice-a-turn-the-journal-never-heard-finish.md). |
| `settlementAbandonmentOffer` | refused | `nativeExecutionActive` was never released, so the 60 s offer never arrives. |
| the surface | nothing | the refusal reason is computed and **never rendered**. |

Each is individually defensible, which is why this survived. `deriveStrandedTurn`'s own comment calls
`journal_agrees` *"the ordinary case, and a long turn's case"* — and a frozen `running` is
indistinguishable from a legitimately long turn **using only the journal**. The predicate is built on
the premise that *"the journal is durable and already correct"*. Here the journal is the stale thing.

**This is CR155's first slice arriving from the field**, exactly as scoped: surface the
`native_execution_active` / `occupancy_unknown` refusals. The app knew precisely why it would not
offer the exit and said nothing.

**Stated limit.** The three gates in `settlementAbandonmentOffer` run in order —
`ownerPhase !== "finalizing"`, then `!occupancyKnown`, then `nativeExecutionActive`. The surface
showed *Finishing*, which implies `ownerPhase === "finalizing"`, so the refusal is at the second or
third gate, most plausibly the third given the unreleased occupancy. **Renderer state cannot be read
from disk**, so which of the two fired is not established here. It does not change the repair: all
three refusals are silent.

### The separate defect this exposes

The journal freezing at `running` is **not** CR155's scope and needs its own home. It is one step
earlier than
[CR142](../rs016-ongoing-product-improvements-and-adjustments/cr142-stop-losing-a-turn-the-journal-already-answered.md)'s observed case: there the journal
had reached terminal and the renderer was stale; here the journal itself never advanced, so the loss
happened **before** the journal write. CR142 recorded its loss mechanism as unestablished and named
two silent candidates; this occurrence is consistent with both and settles neither.

### Collateral

The durable conversation holds the Navigator's prompt **three times** — once per failed turn,
including the two provider refusals recorded in
[CR159](cr159-say-why-the-provider-refused-a-turn.md) — and ends with an **empty assistant message**.
The 1,877-character answer exists only in the Pi session JSONL. It was extracted and returned to the
Navigator directly, so the answer is not at risk whatever recovery does.

### Provenance

Production app data read on 2026-10-16, read-only, production running at pid 27709. Nothing was
written to production state. A contention hypothesis — that settlement in another Journey was
starving this one behind the global native-command guard — was **checked and refuted**: no settlement
of any Journey is recorded between 12:58Z and 13:10Z, and the outbox is empty.

## Implemented — Slice 1 (RS025 Batch A, 2026-10-16)

On `refinement/rs025-batch-a-naming`. Gates: vitest **267 files / 2,196 tests**, `tsc` clean,
frontend build clean, `cargo test` 328 passed. Not merged, not released, not field-checked.

**What changed.** `settlementAbandonment.ts` gained `SETTLEMENT_ABANDONMENT_REFUSALS` (the refusal
union as a runtime list) and `settlementAbandonmentPresentation`, which calls
`settlementAbandonmentOffer` and decides only whether a refusal is *said*. `SettlementAbandonmentNotice`
draws `refusal_named` as a sentence with the wait and **no button**; `silent` as nothing; `offer`
exactly as CR132 made it. The decision function is untouched.

**The negative case holds by construction.** The naming waits exactly as long as the offer would
have — past `ABANDON_SETTLEMENT_OFFER_AFTER_MS` — so a healthy turn whose native lease is briefly
still active while finalizing acquires no sentence. Tested at 3 s and at the threshold exactly.

**The guard that passed while covering silence was narrowed, not deleted.** CR149's
*"renders nothing while native execution is active"* asserted `html === ""`, which was two claims:
no exit (load-bearing, kept) and no sentence (the field's complaint). Now it asserts no `<button>`
and no *Stop waiting*. Its sibling *"asks the domain function"* was extended into a chain:
the component calls the presentation, the presentation calls the offer, and the component imports
neither the offer nor the threshold.

**Allow-list.** `settlementAbandonmentRefusalNaming.test.tsx` iterates
`SETTLEMENT_ABANDONMENT_REFUSALS` itself: past the threshold every refusal is either
`refusal_named` or in an explicit deliberately-silent set (`not_finishing`, `too_soon`), and a
refusal without a fixture throws rather than passing. A fifth refusal cannot be silent by default.

**Field check owed.** The next hang on a build carrying this must show *Still finishing after Ns*
with the native-execution sentence and no button. That is the measurement Batch B waits for.

## Dev Build Carrying Batch A (2026-10-16)

Source `03674f3` on `refinement/rs025-batch-a-naming`. Installed at `/Applications/Mirror Desktop Dev.app`,
binary **`03cc4fba34ed065a3f66e4daede3d5a125cb6f349b736de551500fe8fef7c4b4`**, replacing `7423733e…`
(backup `/tmp/Mirror Desktop Dev-20261016-115823.app`, hash-verified before removal). Bundle identity `ai.mirrormind.desktop.dev` checked
before the destination was touched; the `ps` gate passed twice, after being corrected — its first
form matched the shell command that contained the pattern, so it reported "running" for a closed
app, and the state was unknown until the gate anchored on the process path.

**Shipped-chain evidence.** `dist/assets/index-*.js` 11:55:13 precedes the binary 11:57:21;
installed hash equals built hash. In the bundle: `still records the agent as executing` 1×,
`cannot tell whether the agent is still executing` 1×, `Still finishing after` **2×** (1× before —
the count delta is the discriminator for the second section). `The provider reported:` 2×,
unchanged: CR159's wiring introduces **no new literal**, so it is not grep-verifiable in the bundle;
it is covered by `cargo test`, the source guards and the field check.
