[< RS021](index.md)

# CR097: Keep a Correction Recognisable After Reload

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr097-restored-correction-identity`

## Problem

A correction the Navigator sends while a turn is running is shown as a correction during the run,
under the `Correction during response` surface. After leaving the Journey and coming back it is
shown as an ordinary new request.

The conversation then reads as if the Navigator had asked a second question that nobody answered —
especially after a cancellation, where the surface also shows `Previous attempt was interrupted`
immediately below it. The correction loses both its meaning and its attachment to the turn it was
correcting.

## Evidence

Read-only inspection of the Dev app data for two cancellations in Journey `builder-mode-evolution`,
generation 2, on 2026-09-30. Provenance is recorded because the runs belong to that Journey; the
defect is a Desktop surface behaviour, not a Journey-specific one.

Runs `agent-run-2026-09-30T11:53:49.301Z` and `agent-run-2026-09-30T12:22:24.536Z` each received the
correction `foca só no primeiro arquivo` while the agent was working.

- Pi committed the correction as a **user entry** (`f2f82f4f`, `2f8ee7d2`), carrying the raw text at
  27 characters with no Journey authority envelope. An ordinary request in the same session carries
  the envelope and is 974 characters before extraction.
- The persisted conversation has **no `steeringEvidence` key at all** once the run has settled.
- Projected through the production surface, the correction therefore appears as a plain user
  message (`pi-2f8ee7d2`), indistinguishable from a request.

## Diagnosis

Two independent layers, and each is enough on its own to produce the symptom.

**The steering record does not survive the run.** `SteeringEvidence` is durable by design and even
models `piUserEntryId`, which is set when a correction is applied — exactly the link that would let
a reconstruction recognise which Pi entry a correction became. But the persisted conversation holds
no steering evidence after settlement, so that link is gone before any reconstruction can use it.
Whether it is never written, overwritten by a later snapshot, or dropped on load is the first thing
this CR must establish.

**The Pi-backed projection cannot tell a correction from a request.**
`projectPiBackedConversationSurface` treats every Pi `user` entry as a request. Pi is right to hold
the correction as a user entry, since that is what the model received; the Desktop is the only layer
that knows it was a correction, and it currently has no surviving evidence to say so.

**A correction also opens a new run in the interrupted-run matching.** CR089's
`matchInterruptedTurnsByUserEntryId` segments runs on user entries, so a correction starts a new
segment. No incorrect output was observed from this — the affected runs still matched their own turn
records and recovered their operations — but a correction is not a new request, and modelling it as
one is wrong and will misbehave for a run that continues after being corrected.

## Pull and Plan (2026-10-03)

Pulled by explicit Navigator intent after CR116 closed. Driver and Delivery remain intentionally
unassigned; planning is not implementation authority.

The current baseline changes the first diagnostic materially: persisted `0.9.0` conversations now
parse and write `steeringEvidence`, and CR114's Segment partition and recombination also carry it.
The original Dev observation predates those paths. Therefore Slice 0 is a required falsification,
not a formality: reproduce its completed and cancelled cases through the current save, unload,
restore and restart path. If evidence already survives, record that the capture was resolved by the
baseline and narrow the work to projection/segmentation only; do not rebuild persistence speculatively.

The remaining code reading establishes a concrete second fault: `projectPiBackedConversationSurface`
opens `runUserEntryId` on every Pi user entry, while `matchInterruptedTurnsByUserEntryId` does the
same. Neither consults `metadata.steeringEvidence[].piUserEntryId`, even though
`reconcileSteeringEvidence` records that exact identity. A restored correction is consequently
projected as `pi-<entryId>` with the role `user`, and it can split CR089's interrupted-turn window.

### Slices

1. **Characterise current authority.** Add fixtures for accepted correction evidence with an exact
   Pi user entry, for completed-after-correction and cancelled-after-correction histories, and prove
   the persisted/Segment round trip before selecting a persistence change. Record the CR117 landing:
   done above, and it found a blocking defect in CR117's own guards that must be repaired before the
   rest of this slice measures anything meaningful. Fixtures must now also cover a `delivered`
   correction, which did not exist when this plan was written.
2. **Bind correction identity before run matching.** Build the claimed Pi-entry set from surviving
   `steeringEvidence`; reject duplicate or cross-run claims fail-closed. Make interrupted matching
   skip those entries as run boundaries while retaining their chronological place.
3. **Project the correction as a correction.** Bind a claimed Pi user entry to the correction's
   existing evidence instead of making a plain user request, preserving Pi text, timestamp and the
   correction's status/attachment in `ConversationTranscript`.
4. **Preserve the ordinary case.** Prove unclaimed Pi user entries retain the existing request and
   CR089 interrupted-turn semantics. Prove no Pi JSONL write, steering delivery, cancellation or
   historical backfill is introduced.
5. **Validate.** Run focused domain/component/integration tests, the full suite, type check, build,
   native tests/check, roadmap consistency and diff check. Dev homologation must cover corrected
   completed and cancelled turns after navigation/restart, plus an ordinary request control.

## Pulled Into Focus (2026-10-03)

Pulled by explicit Navigator intent after CR117 closed and was integrated at `d092c2f`. Slice 1 was
tasked with recording whether CR117 had landed, because that changes how often the evidence this CR
consumes is present. It has landed — **and the recorded expectation was wrong in a way that blocks
this CR.**

### What CR117 actually did to `piUserEntryId`

The boundary note below predicted that CR117 would reconcile steering during the run, populating
`piUserEntryId` earlier and in more cases. That is not what CR117 built. Its live signal is Pi's
`queue_update`, which carries no entry id, so it produces a new `delivered` status and deliberately
cannot produce `applied`. `applied` — the only status that carries `piUserEntryId` — is still
produced solely by `reconcileSteeringUserEntries`.

Worse, CR117 introduced `delivered` into the domain but missed two App-level guards that decide
whether that reconciliation runs at all. Verified by reading `main` at `d092c2f`:

- `src/app/App.tsx:3053` gates the `done` reconciliation on
  `item.status === "pending" || item.status === "accepted"`. A correction that reached `delivered`
  fails this test, so the Pi user entries are never loaded and `applied` is never reached.
- `src/app/App.tsx:1741` gates the entire restore/repair block on
  `pending || accepted || terminally_unconsumed`. `delivered` fails this too, so a reload does not
  repair it either. The inner loop at `1762` has no status filter and would have reconciled it, but
  it is unreachable behind that gate.
- By contrast the domain was updated correctly: `src/domain/steeringState.ts` lines 146, 169 and 199
  all admit `delivered`. The defect is purely in the App wiring.

**Consequence.** A correction that successfully reaches `delivered` — precisely the happy path CR117
was built to produce — never acquires `piUserEntryId`. It is not merely delayed: nothing in the
normal lifecycle recovers it. It recovers only by accident, if some *other* correction in the same
conversation happens to sit in a repairable status and so opens the gate for every turn.

So CR117 did not populate the identity this CR depends on more often. For the successful path it
made it never populated, inverting the premise.

### Why CR117's own validation missed it

Homologation round 1 validated "the correction becomes `Correction applied`" while the live
transition was broken — the status was stuck at `accepted`, which guard 1 *does* match, so
reconciliation ran and `applied` was reached. Round 2 fixed the live transition, which made
`delivered` happen for the first time and silently invalidated that earlier observation. Round 2 did
not re-check the terminal status. CR117's unit tests call `reconcileSteeringUserEntries` directly
with a `delivered` record, which passes correctly, but no test covers the App guards that decide
whether it is called.

### What this means for this CR's plan

This is CR117's defect, inside CR117's scope, and it is not folded into this Delivery: keeping one
review boundary per CR matters more here than convenience, and this CR must not be the place a
closed CR's regression is quietly repaired. It is nonetheless **blocking**. This CR's entire
mechanism is to recognise a restored correction by the Pi entry its evidence claims through
`piUserEntryId`; building slices 2 to 4 on a path that never records that identity would be building
on sand, and slice 1's falsification would measure the wrong baseline.

**Resolved.** The Navigator reopened CR117 on 2026-10-03 and the guards were repaired there, on
`refinement/rs016-cr117-delivered-reconciliation-guards`. The duplicated status list was replaced by
a single authority, `RECONCILABLE_STEERING_STATUSES` with `hasReconcilableSteering`, which both App
guards now call, so a `delivered` correction is reconciled at `done` and repaired on restore. This CR
is therefore no longer blocked, and slice 1 should falsify against that baseline rather than the one
described above. CR117 still awaits re-homologation of its terminal step, so slice 1 must record
whether that has happened before treating `piUserEntryId` as reliably present.

Slice 1 is otherwise unchanged and still a falsification: persisted `0.9.0` conversations now parse
and write `steeringEvidence` and CR114's Segment paths carry it, so the original Dev observation
predates both and must be reproduced before any persistence work is selected.

### Boundary with CR117

[CR117](../rs016-ongoing-product-improvements-and-adjustments/cr117-make-a-correction-legible-while-it-is-live.md)
covers the same surface while it is live: a correction's status never leaving `Correction queued`,
and its placement under a prompt that is scrolled away. This CR covers the surface after reload. The
two must not be implemented blind to each other: CR117 slice 4 decides where a correction is
rendered, and this CR decides what a restored correction is rendered as. Whichever lands first owns
the placement decision and the other adopts it.

~~The interaction is favourable rather than conflicting. CR117 reconciles steering evidence during
the run instead of only at `done`, so `piUserEntryId` — the exact identity this CR depends on —
becomes populated earlier and in more cases, including runs that are later cancelled.~~

**Superseded by what CR117 actually delivered; see "Pulled Into Focus" above.** CR117's live signal
carries no entry id and so cannot produce `applied`. CR117 was still the right one to run first — it
owns the placement decision this CR adopts — but its effect on `piUserEntryId` is the opposite of
what was predicted, and that has to be repaired before this CR's slices can be correct.

### Files

Expected implementation files: `src/domain/piBackedConversationSurface.ts`,
`src/domain/conversationSegmentProjection.ts` only if Slice 1 proves a Segment-loss path,
`src/app/conversationTranscriptModel.ts` and/or `src/app/ConversationTranscript.tsx` for the
existing correction surface. Expected tests: `src/tests/piBackedConversationSurface.test.ts`,
`src/tests/interruptedTurnIdentity.test.ts`, `src/tests/steeringState.test.ts`,
`src/tests/conversationSegmentProjection.test.ts` if applicable, and a restored-surface component
or integration test. `src/domain/persistedJourneyConversation.ts` is expressly out unless Slice 1
proves its present `0.9.0` round trip loses evidence.

## Slice 1 Result: the falsification (2026-10-05)

Read-only, against the production store on `0.2.0-alpha.37`. The slice asked whether the evidence
this CR consumes still disappears. **It does not, and that collapses the persistence half of the
plan.**

### The steering record survives

| | |
|---|---|
| Persisted conversations scanned | 28 |
| Carrying a `steeringEvidence` key | **5** |
| Steering records found | **8** |
| Status of all 8 | `applied` |
| Carrying `piUserEntryId` | **8 of 8** |
| In an active generation | 7 (one is in `mirror-desktop-rescue-journey` gen 1, superseded by gen 2) |
| Chapter projection files carrying the key | **23 of 118** |

So it survives both durable storage and the Segment round trip. The original Dev observation of
2026-09-30 — "no `steeringEvidence` key at all once the run has settled" — was true then and is
resolved by the baseline that arrived since: `0.9.0` parse/write, CR114's Segment paths, CR117's guard
repair, and CR122's rule that a derived field is recomputed on read rather than validated on read.

Following this plan's own instruction, the work narrows to projection and segmentation.
`src/domain/persistedJourneyConversation.ts` **stays out of scope**: slice 1 was the condition for
touching it and it proved no loss path.

### The blocking dependency is cleared

CR117's two App guards were the blocker. Both now call the single authority: `App.tsx:1761` and
`App.tsx:3109` use `hasReconcilableSteering`, backed by `RECONCILABLE_STEERING_STATUSES` in
`src/domain/steeringState.ts:44`. CR117 also records that the Navigator validated the guard repair in
the Dev build installed from `08d03e7`, which was the re-homologation slice 1 had to confirm before
treating `piUserEntryId` as reliably present. All 8 records carrying it is the field confirmation.

CR117 landed first, so per the boundary note it owns the placement decision and this CR adopts it.

### The second fault is intact, and is now the whole job

`src/domain/piBackedConversationSurface.ts` contains **zero** references to `piUserEntryId`. Reading
it against the store:

- `:346` sets `runUserEntryId = entry.entryId` for every Pi `user` entry, so a correction still opens
  a new run segment — slice 2's target.
- `:354` gives an unbound user entry `id = pi-${entry.entryId}` with role `user`, so a correction is
  still projected as an ordinary request — slice 3's target.
- `:213`/`:229` already bind a *turn's* own Pi user entry to its harness message. A correction has no
  turn of its own, which is why nothing binds it.

And the data to recognise it exists on both sides. For all 7 corrections in active generations, Pi
holds the correction as a bare `user` entry whose text is **byte-identical** to the Desktop's own
evidence text, 18 to 58 characters, with no Journey authority envelope:

| Journey | entry | chars | Pi text |
|---|---|---:|---|
| `alissonvale-com` | `64af7b4a` | 43 | `Remova o link para ver programação completa` |
| `alissonvale-com` | `00adde48` | 27 | `faça o que vc propos tambem` |
| `amplia-website` | `9db56b45` | 58 | `só que em vez de agencia, vamos usar o termo protagonismo.` |
| `flip-website` | `28766532` | 27 | `Altere só local, sem deploy` |
| `livro-lideranca-soberana` | `726ad2a0` | 50 | `atualize o processo para vc nao esquecer no futuro` |
| `livro-lideranca-soberana` | `1617772b` | 29 | `ops, é canvas-instructions.md` |
| `livro-lideranca-soberana` | `d3085808` | 18 | `nota bibliografica` |

Both halves of the link are present and durable. Only the projection does not look.

### Remaining

Slices **2, 3, 4 and 5**, against `src/domain/piBackedConversationSurface.ts` and the existing
correction surface in the transcript. Seven real corrections across four Journeys are available as
fixtures and as the Dev homologation subject, which the plan previously expected to have to stage.

**Note on the reading itself.** Three successive versions of the inspection script were wrong before
this one: a non-recursive glob missed every Pi session, and an assumed entry shape read `role` and
`content` at the top level when they live under `.message`. Each wrong version produced a confident,
plausible, false answer — once "absent from its own session" for entries that were present. The
numbers above are from the version checked against a raw session line.

## Slices 2–5 Implemented (2026-10-05)

Pulled by explicit Navigator intent after slice 1's falsification. The plan's premise was wrong in a
way that would have shipped an inert change, and finding that out is most of this entry.

### The correction was not an extra message — it was wearing the request's identity

The plan expected a restored correction to be projected as an unbound `pi-<entryId>` user message
beside the real request. Replaying the claim rule against the store refused **all eight** real
corrections, which meant the fix would have done nothing. The reason is that every corrected turn
records the **correction** as its own `pi.userEntryId`, not the request — verified on all eight, where
the turn naming the correction's entry is always the correction's own turn:

```text
flip-website  correction entry 28766532
  evidence.turnId                 turn-agent-run-2026-10-03T14:49:30.230Z
  turn claiming it as its request turn-agent-run-2026-10-03T14:49:30.230Z   <- the same turn
  harness.userMessageId           user-2026-10-03T14:49:30.230Z
```

Since the projection binds `turn.pi.userEntryId → turn.harness.userMessageId`, the **correction was
being dressed in the request's harness identity** and the request was left as an anonymous
`pi-<entryId>` message. So the symptom is sharper than reported: it is not that a correction looks
like a new question, it is that the correction and the request **swap places**. The orphaned
"question nobody answered" was the Navigator's own original request.

Two consequences for the plan. The ambiguity rule had to be rewritten — a turn naming the entry is
the normal state, and only *another* turn naming it is genuine ambiguity. And a slice the plan did
not contain became necessary: the request has to take its identity back, or suppressing the
correction would leave the turn with no request at all.

### What was built

**Slice 2 — a correction is not a run boundary.** `matchInterruptedTurnsByUserEntryId` takes the
claimed set and a claimed entry no longer closes the window, while still advancing the timeline so
the next request's window opens where it should. The main loop likewise does not `closeRun()` on a
claimed entry, so a corrected run's operations stay one run with one turn record.

**Slice 2 — a claim that cannot be trusted is refused,** and refusing falls back to exactly today's
behaviour rather than to something new. A duplicate claim and a cross-turn claim are both dropped. The
direction is deliberate: a correction shown as a request is wrong but visible, while honouring a bad
claim would hide a message.

**Slice 3 — the correction leaves the transcript.** Live, a correction is never a message:
`steeringState.ts` touches `messages` nowhere, and CR117 draws corrections inside the run they
corrected from their own evidence. A reload now restores the same thing, so the claimed entry is
passed over. Its text, timestamp and status were already in that evidence — verified byte-identical to
Pi's own copy in slice 1.

**Slice 3 — the request takes its identity back.** When a turn's recorded request entry turns out to
be its correction, the request is found by position instead: the nearest user entry before the turn's
answer that is not itself a correction. For an uncorrected turn this resolves to the entry already
bound, so the rule is uniform and only a corrected turn changes. It also handles two corrections on
one turn, which the store does not yet contain.

**Slice 3 — a cancelled run gets an anchor.** A cancelled run's assistant message is deliberately
never bound, so a correction naming it had nothing in the transcript to attach to. The projection now
emits `correctionAnchors`, and `buildConversationTranscriptIndex` resolves through it. The field is
derived, cleared when absent, and added to `PI_DERIVED_CONVERSATION_KEYS` so it is never persisted —
re-pointing the durable `assistantMessageId` instead would have been saved by the next write, which is
the §5b shape the settlement model records.

**Slice 4 — the ordinary case.** Guards prove an unclaimed entry keeps its request identity and CR089
semantics, that no anchor appears when nothing was corrected, that the derived field is dropped on
persistence while the steering record is kept, and that the projection mutates neither its input nor
the durable evidence it reads.

### One CR089 guard changed rather than scoped

`interruptedTurnIdentity.test.ts` asserted that a cancelled turn's correction is indexed under
`turn.harness.assistantMessageId`. That message is not among the rendered messages, and the transcript
looks evidence up by the ids it is rendering — so the index entry existed and the correction was drawn
nowhere. The guard asserted bookkeeping that corresponded to the correction being unreachable, so it
now asserts the stronger thing: that the message is absent, that an anchor stands in for it, and that
the correction is attached there. Its CR089 intent, that a cancelled turn can find its own evidence,
is preserved and better served.

### Verified against the production store

Replaying the corrected rule read-only: **8 of 8 claims honoured**, where the first version honoured
**0 of 8**. All eight are completed turns that regain their request identity and drop the correction
from the transcript; none needs an anchor, so the cancelled-run path rests on unit tests alone.

**Gates:** `tsc` clean, **233 test files / 1,689 tests**, `cargo test` **257 passed / 3 ignored**,
`cargo check --locked`, build clean, roadmap READY.

## Closure review

**Proportionality: proportional**, with one honest overrun. The written slices were 2 to 5; the
request-rebinding was not among them and was added because without it the rest is either inert or
destructive. The alternative — shipping slices 2 to 4 as written — would have changed nothing on real
data, which is worse than scope growth.

**Debt review: follow_up.** Four items, none selected.

**The upstream record is still wrong.** A corrected turn storing its correction as `pi.userEntryId` is
the actual defect; this CR compensates for it in the projection rather than correcting it at the
write. The compensation is uniform and tested, but the durable record still says something untrue, and
anything else that reads `turn.pi.userEntryId` inherits it. That is the candidate next CR in this area.

**The cancelled-run anchor has no production witness.** All eight real corrections sit on completed
turns. The path is covered by three unit guards and by the rewritten CR089 guard, and the original
evidence for this CR came from exactly that case in Dev, so it is reachable — just not present today.

**Dev homologation is owed**, covering a corrected completed turn and a corrected cancelled turn after
navigation and restart, plus an ordinary request control. Closed without it because the production
replay is the stronger evidence for the eight real cases and the surface change is a suppression plus a
rebinding, both fully determined by data already on disk.

**Two corrections on one turn is untested in the field.** The positional rule handles it and a unit
guard covers it, but the store holds no such turn.

## Expected Behavior

A correction reads as a correction wherever it is read: live, after navigating away and back, and
after an app restart. It stays attached to the turn it was correcting, keeps its status, and is
never presented as a request that went unanswered.

Run segmentation treats a correction as part of the turn it corrected rather than as the start of a
new one.

## Proposed Scope

- Establish where the steering record is lost between staging and reload, and fix that first. Until
  the evidence survives, no presentation work can be correct.
- Decide the authority question explicitly, as CR089 had to: Pi holds the correction as a user
  entry, so the Desktop must either mark that entry as a correction from surviving evidence, or
  accept that a correction is indistinguishable after reload and close this as rejected with the
  reasoning recorded. Reuse the CR089 outcome where it applies — evidence about a turn is already an
  established, durable, non-transcript surface.
- Teach the Pi-backed projection to present a Pi user entry that a surviving steering record claims,
  through `piUserEntryId`, as a correction rather than a request.
- Stop treating a correction as the start of a run in `matchInterruptedTurnsByUserEntryId`.
- Validate against live, restored and restarted conversations, for both a cancelled turn and a turn
  that completed after being corrected.

## Acceptance

- A correction sent during a run is still shown as a correction after navigating away and back, and
  after an app restart.
- The correction keeps its status and its attachment to the corrected turn.
- A correction is never rendered as an unanswered request, and the interrupted-attempt notice never
  appears to belong to it.
- A run that was corrected is still matched to its own turn record, and its operations, notes and
  interrupted fragment behave exactly as CR089 established.
- An ordinary request is unaffected.

## Exclusions

- No writes to Pi JSONL, and no removal or rewriting of the user entry Pi legitimately recorded.
- No change to how steering is delivered to the running agent, or to cancellation semantics.
- No backfill of corrections whose evidence was already lost.

## Dependencies

Independent of CR089 in delivery, but it shares that CR's surface and its authority reasoning, so it
should land on a baseline that already contains CR089's projection work. It was captured from
evidence gathered while validating CR089.
