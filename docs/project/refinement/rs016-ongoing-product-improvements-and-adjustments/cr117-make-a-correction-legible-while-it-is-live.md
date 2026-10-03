[< RS016](index.md)

# CR117: Make a Correction Legible While It Is Live

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr117-live-correction-legibility`

Captured on 2026-10-03 from two Navigator observations in daily use, and planned the same day from a
read-only reading of `main` at `aa3d329`. It was first recorded as a Phase 2 inside
[CR116](cr116-release-a-journey-stranded-in-finishing.md) and promoted to its own CR before CR116's
delivered work was released: CR116 was an incident-driven reliability fix whose commit is already
merged, and one CR cannot coherently hold both a released phase and an unplanned one. CR116 shares
none of this CR's evidence, acceptance or title, and remains `done`.

Planning assigns no Driver, chooses no Delivery and starts no implementation.

Two Navigator observations from daily use. Both concern a correction sent while the agent is
working: the first is that its status never becomes meaningful, the second is that the Navigator
cannot see where it went.

## Problem

**A correction never leaves its queued status.** After sending a correction the surface shows
`Correction queued` and stays there. The Navigator gets no signal that the model actually received
it, which is the only thing that matters while deciding whether to wait, repeat or cancel.

**A correction is sent into a place the Navigator is not looking.** Corrections are listed under the
original prompt. A correction is sent precisely when the agent has already produced a long output,
so the prompt is far above the viewport. The correction lands off-screen and the Navigator sees
nothing happen at all.

## Diagnosis

Read-only reading of `main` at `aa3d329`.

**The status vocabulary is already right; only the observation is missing.** `SteeringStatus`
already models `applied`, `transitions` already allows `accepted → applied`, `SteeringMessages`
already labels it `Correction applied`, and `transitionSteering` already refuses `applied` without
`piUserEntryId` evidence. So nothing needs inventing. What is missing is *when* the evidence is
read:

```js
// App.tsx — inside the stream loop, only on the terminal event
if (event.type === "done" && mode === "live") {
  ...
  let reconciled = reconcileSteeringUserEntries(runConversation, runAuthority, userEntries);
```

`reconcileSteeringUserEntries` is the only producer of `applied`, and it runs only at `done` (and in
the restore path at `App.tsx:1777`). While the run is alive the correction therefore remains
`accepted`, rendered as `Correction queued`, until the entire turn ends — at which point the status
is retrospective and useless for the decision the Navigator was trying to make.

**The two statuses mean different things, and the distinction must be kept.** `accepted` is Pi's RPC
admitting the steer request: `steer_pi_invocation` returns only `pending | accepted`. `applied` is
the correction existing as a user entry in the Pi session, which is the first moment it is part of
what the model was given. There is no third signal: `AgentStreamEvent` has no steering case, so the
run stream never reports consumption.

**The naive way to observe it is the expensive one.** The native command behind the evidence reads
the whole session:

```rust
fn load_dedicated_pi_user_entries(...) {
    project_pi_user_entries(&fs::read_to_string(session_file)?)
```

CR114 measured a real session at 55 MB. Polling this during a live run would reread tens of
megabytes repeatedly — the same class of defect CR113 and CR114 just removed. Any in-run observation
must therefore be bounded, reusing the `from_entry_id` scoping CR114 introduced, or be driven by an
event rather than a poll.

**The placement is a genuine mismatch, not a styling preference.** The evidence is indexed by the
turn's assistant message but rendered in the *user* message's row:

```js
const owningAssistantMessageId = index.turnByUserMessageId.get(message.id)?.harness.assistantMessageId;
const steering = owningAssistantMessageId ? index.steeringByAssistantMessageId.get(...) : EMPTY_STEERING;
// ... passed to ConversationMessageRow for the user message, rendered after its body
```

So the correction is attached to the one element of the turn guaranteed to be scrolled away at the
moment of sending. No other surface shows it: a search across the app components finds steering only
in `SteeringMessages`, `ConversationTranscript`, `App.tsx` and the draft input. There is no live
Composer-side acknowledgement and no mid-run cadence of any kind.

## Truthfulness constraint

The Navigator asked for a `read` indication. What the evidence establishes is that the correction
entered the model's input, not that the model read or obeyed it. The visible wording must say the
former. This follows the register CR079 and CR114 already set: mark what is known, never imply an
observation the system cannot make.

## Slice 1 Spike Result (2026-10-03)

The spike was run against Pi `0.99.1` at
`/usr/local/lib/node_modules/@earendil-works/pi-coding-agent`, read-only, plus the Desktop at
`c04fbf3`. It settled the mechanism and **falsified one of this CR's own planning assumptions.**

**An event-driven delivery signal exists, and the Desktop already throws it away.** Pi emits

```js
{ type: "queue_update", steering: [...this._steeringMessages], followUp: [...] }
```

`_steeringMessages` holds the queued correction texts (`push(text)`), and Pi splices a correction out
of that array at the moment it hands it to the model. So a correction present in `steering[]` is
still waiting, and a correction that has disappeared from it has been delivered. This is preference
order 1 from the plan: live, exact about the transition, and costing zero file reads. The Desktop
handles no `queue_update` case anywhere in `src` or `src-tauri/src` — the event is currently
discarded.

A second, weaker signal was also found and is **not** chosen: Pi emits `message_start` with
`role: "user"` during a live run, and `mapJsonMessageStart` already receives it and discards
anything without a `<skill>` tag. It would work, but it infers delivery from a side effect, while
`queue_update` reports the queue directly.

**The planning assumption that "only the call timing changes" is wrong.** The plan assumed the live
signal could produce `applied`. It cannot. `transitionSteering` requires `piUserEntryId` for
`applied`, and that identity does not exist yet when the correction is delivered:

```js
{ type: "message", id: generateId(this.byId), parentId: this.leafId, timestamp: ..., message }
```

Pi generates the entry id at **persistence** time, against the session's own id map. It is not
carried on the in-flight message, and `queue_update` has no id field. Confirmed from Pi's source,
not inferred from the Desktop's fixtures.

**Consequence, and the decision it forces.** Weakening `applied` to accept a text match would
destroy the guarantee that CR116-era evidence rules depend on, so that is rejected. Instead the
lifecycle gains one intermediate state:

| state | meaning | evidence | when |
|---|---|---|---|
| `accepted` | Pi's RPC admitted the steer request | RPC response | on send |
| `delivered` | the correction was handed to the model | `queue_update` queue departure | live, during the run |
| `applied` | the correction exists as a Pi session entry | exact `piUserEntryId` | at `done`, unchanged |

`delivered` is what the Navigator actually asked to see, and it is also the honest ceiling for a live
signal: it says the correction reached the model's input, which is exactly what the queue departure
proves and no more. `applied` keeps its exact-evidence contract untouched.

This makes `SteeringStatus` a persisted-type change, so slice 2 must carry schema compatibility:
older records simply never hold `delivered`, and the `0.9.0` parser must accept it going forward.

## Plan

Slice 1 is complete; the remaining slices are revised by its result. Slice 4 remains a design
decision and is deliberately not started.

1. ~~**Characterise and choose the signal.**~~ Done — see the spike result above.

1. **Original slice 1, for the record.** Prove the current timing with a test that a correction
   stays `accepted` for the life of the run. Then establish the cheapest truthful in-run signal, in
   this preference order: an event-driven confirmation if one can be obtained from the existing RPC
   or stream; otherwise a bounded scoped read from a known entry id; naive full-session polling is
   rejected outright. Record the measured cost of the chosen option.
2. **Admit `delivered` into the lifecycle (revised by the spike).** Add the state between `accepted`
   and `applied`, with its transitions, and accept it in the `0.9.0` parser so a persisted record
   round-trips. It must require no Pi entry id, because none exists yet, and must not let `applied`
   be reached without one. `terminally_unconsumed` must remain reachable from it, since a delivered
   correction can still end a run without ever becoming a session entry.
3. **Map `queue_update` and mark delivery live (revised by the spike).** Parse the event in
   `piProcessStream`, emit a steering-queue stream event, and transition this run's corrections to
   `delivered` as they leave Pi's queue. Match by exact text within the run's own evidence, which is
   the identity Pi's queue uses and the identity `reconcileSteeringUserEntries` already matches on.
   A `queue_update` for an unknown text must change nothing. Give `delivered` its own visible label
   and mark, worded per the truthfulness constraint, and keep every existing terminal label intact.
   `applied` continues to be produced only at `done`, from exact entry evidence.
4. ~~**Put the correction where the Navigator is looking.**~~ Done — drawn in the run's own card as
   a region after its narration, removed from the prompt cluster. The chronological-position part of
   the agreed plan was deliberately not built; see the deviation note above. No Composer-side
   acknowledgement was added: the run card already sits where the eye is during a run, and transient
   notices carry precedent against them from CR086 and CR088.
5. **Keep provenance and reload intact.** The correction must remain attached to the turn it
   corrected, with its ordering by `sequence` preserved, and the Segment partition/recombination
   behaviour of CR114 unchanged.
6. **Validate.** Focused domain and component tests, then the full suite, type check, build, native
   tests and check, roadmap consistency and diff check. Dev homologation must cover: a correction
   during a long output, several corrections in one turn, a correction never consumed before
   cancellation, and a correction in a turn that completes.

## Slices 2–3 Implementation Evidence (2026-10-03)

Implemented test-first on `refinement/rs016-cr117-live-correction-legibility`. Slice 4, placement,
is deliberately not started.

`SteeringStatus` gained `delivered` between `accepted` and `applied`. Its transitions keep both ends
open — `applied` when the session entry later confirms it, `terminally_unconsumed` when the run ends
first, which is the ordinary cancellation case. The `0.9.0` parser accepts the new status, and older
records simply never carry it.

`markSteeringDeliveredByQueueDeparture` reads delivery from *absence*: a correction of this run no
longer present in Pi's queue has been handed to the model. Duplicate texts are counted rather than
matched one-to-one, and because Pi delivers in order, the copies it still holds are the most recent
ones — so the walk is newest-first and the oldest surplus is what departed. A first implementation
had this backwards and the duplicate-text test caught it. The function returns the same object when
nothing departed, preserves stored order, and refuses a foreign run authority.

`queue_update` is now parsed in `piProcessStream` into a `steering_queue` stream event, and applied
to the live conversation in the run loop. A malformed payload maps to nothing, because an empty
queue is precisely what means delivered and must never be inferred from a parse failure.

Visible wording is `Correction reached the agent` with a single check, against `Correction applied`
with a double check. Both say what the evidence establishes: the queue departure proves the
correction entered the model's input, and nothing observes whether the model read or followed it.

### Tests

`src/tests/liveCorrectionDelivery.test.ts`, 14 cases: delivery on departure, no change while
queued, only the departed correction, duplicate-text ordering, absence versus unrelated text,
foreign-authority refusal, terminal statuses not resurrected, `applied` still reached at settlement
with exact entry evidence, delivered-then-cancelled, refusal to reach `applied` without evidence,
persistence round trip, and three `queue_update` mapping cases.

### Gates

222 files / 1,568 tests (was 221 / 1,554). `tsc --noEmit`, `npm run build`, `cargo test` 241 passed
/ 3 ignored, `cargo check --locked`, `roadmap:check`, `git diff --check`.

### Not Yet Validated

No Navigator homologation yet, and no Dev build from this branch. The delivery path is proven
against Pi's documented queue contract and by unit test, not yet by a live run with a real
correction. Slice 4 — putting the correction where the Navigator is looking — remains open, so the
second of the two reported problems is not yet addressed.

## Slice 4 Implementation Evidence (2026-10-03)

Corrections now render inside the card of the run they corrected, as a region of that card, after
the agent's own narration. They no longer render in the originating prompt's cluster — the one part
of the turn certain to be scrolled out of view by the time a correction is sent.

`AgentTurn` gained a `corrections` prop and renders the block in both its live and historical
branches, deliberately outside the historical detail disclosure: that a correction was sent is part
of what the turn was, not a detail of how it ran. A run with no narration yet still draws the card
when a correction exists, because a run can be corrected before it has said anything.

`AgentRunRow` claims every correction its parts carry and presents them ordered by `sequence`. This
matters for grouped runs: CR111 makes consecutive assistant messages one card, and a correction is
recorded against the turn's own assistant message, which may be any part of that group.

### Deviation from the agreed placement, and why

The recommendation the Navigator approved said the correction would sit at its chronological
position among the run's messages. It is instead a region at the end of the card's narration, and
the reason is that the finer placement would be invented precision. The run's trail mixes two kinds
of point: earlier assistant messages, which carry timestamps, and `ownTrail` notes, which are
subdivisions of a single message's content and carry none. A correction spliced between notes that
have no individual times would assert an order the data cannot support. The header already says
"Correction during response", so "during" is carried in words rather than in a position that would
be guesswork. The end-of-narration region also keeps the practical property that motivated the
move: during a live run it sits directly below the streaming output, where the Navigator is looking.

### Styling

`.steering-messages.agent-run-corrections` replaces the old `user-addenda` marker, which had no
rules of its own. Inside the card the block takes the card's full width with the same region rule
as the others, rather than the right-hand inset it had while it hung under the Navigator's prompt.

### Tests

`src/tests/liveCorrectionPlacement.test.tsx`, 8 cases rendering the real transcript: the correction
inside the assistant article, absent from the prompt cluster, several corrections in send order,
nothing drawn for an uncorrected run, visible on a historical run ahead of the disclosure, a still
queued correction carried, and two structural assertions.

One existing assertion in `steeringMessages.test.tsx` was found **passing vacuously**: it compared
`indexOf("<SteeringMessages …")` against a later element, and once the element was gone `indexOf`
returned `-1`, which is below any real position. It was replaced with explicit presence and absence
assertions.

### Gates

223 files / 1,576 tests. `tsc --noEmit`, `npm run build`, `cargo test` 241 passed / 3 ignored,
`cargo check --locked`, `roadmap:check`, `git diff --check`.

### Not Yet Validated

Still no Navigator homologation and no Dev build. The Dev app is on `0.2.0-alpha.31`, so it carries
neither CR116 nor CR117; one Dev build from this branch would cover both. The placement is verified
by rendered markup, not yet by eye at real width with a long run.

## Files

Revised by the spike. Expected: `src/domain/journeyConversation.ts` (`SteeringStatus` gains
`delivered`), `src/domain/steeringState.ts` (transitions and the delivery transition),
`src/domain/persistedJourneyConversation.ts` (accept the new status in the `0.9.0` parser),
`src/agent/agentStream.ts` and `src/agent/piProcessStream.ts` (map `queue_update`), `src/app/App.tsx`
(apply delivery during the run), `src/app/SteeringMessages.tsx` (label and mark), `src/styles/app.css`.
Placement work in `src/app/ConversationTranscript.tsx` and `src/app/conversationTranscriptModel.ts`
belongs to slice 4 and is not started. No bounded native read and no `src-tauri/src/main.rs` change
are needed, because the chosen signal is an event the Desktop already receives.

Tests: `src/tests/steeringState.test.ts`, `src/tests/steeringMessages.test.tsx`, a new in-run
reconciliation test, a placement/visibility component test, and `src/tests/interruptedTurnIdentity.test.ts`
plus `src/tests/conversationSegmentProjection.test.ts` as regressions.

## Acceptance

- A correction that the model has received shows a delivered state while the run is still in
  progress, not only after the turn ends.
- The wording distinguishes admitted from delivered and claims nothing about the model having read
  or obeyed the correction.
- `applied` is still reached only with exact Pi user-entry evidence, one entry claimed once.
- A correction sent during a long output is visible to the Navigator, with its status, without
  scrolling to find it.
- The correction remains attached to the turn it corrected, ordered by `sequence`, after navigating
  away and back.
- Corrections that are rejected, unconsumed or cancelled keep their current terminal presentation.
- No measurable typing or streaming regression; the CR113 and CR114 cost properties are preserved.

## Exclusions

- No change to how a correction is delivered to the running agent, to cancellation semantics, or to
  the `SteeringStatus` terminal set.
- No writes to Pi JSONL and no reinterpretation of Pi as anything other than the authority.
- No full-session polling during a live run.
- No backfill of historical corrections, and no claim about corrections whose evidence was lost.
- CR116's bounded queues and repair guard are not revised.
- Planning assigns no Driver, chooses no Delivery and starts no implementation.

## Boundary with CR097

CR097 is `planned` and covers the same surface from the other side: whether a correction is still
*recognisable after reload*, which is a projection and identity question. This CR covers whether
a correction is *legible while it is live* — its status and its placement. They must not be
implemented blind to each other, because this CR's slice 4 decides where a correction is rendered and
CR097 decides what a restored correction is rendered as. Whichever lands first owns the placement
decision, and the other adopts it. Both depend on `piUserEntryId`, which this CR makes populated
earlier and more often — a change that helps CR097 rather than conflicting with it.

