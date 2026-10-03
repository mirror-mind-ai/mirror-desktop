[< RS016](index.md)

# CR117: Make a Correction Legible While It Is Live

**Status:** planned
**Driver:** —
**Delivery:** —

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

## Plan

1. **Characterise and choose the signal.** Prove the current timing with a test that a correction
   stays `accepted` for the life of the run. Then establish the cheapest truthful in-run signal, in
   this preference order: an event-driven confirmation if one can be obtained from the existing RPC
   or stream; otherwise a bounded scoped read from a known entry id; naive full-session polling is
   rejected outright. Record the measured cost of the chosen option.
2. **Observe application during the run.** Reconcile steering evidence while the run is alive, so
   `applied` is reached when it happens. Reuse `reconcileSteeringUserEntries` and keep its existing
   fail-closed guarantees: exact run authority, no duplicate claim of one Pi entry, evidence
   required for `applied`. Changing the status machine is out of scope; only the call timing changes.
3. **Make the status legible.** Distinguish admitted from delivered in the visible label and give
   the delivered state its own mark, worded per the truthfulness constraint. Keep every existing
   terminal label intact.
4. **Put the correction where the Navigator is looking.** Decide the placement explicitly and record
   the reasoning: render the correction with the live agent run it is correcting rather than under
   the distant prompt, and/or acknowledge it near the Composer at send time. The acceptance is
   behavioural — the Navigator must see the correction and its status without scrolling — not a
   particular layout.
5. **Keep provenance and reload intact.** The correction must remain attached to the turn it
   corrected, with its ordering by `sequence` preserved, and the Segment partition/recombination
   behaviour of CR114 unchanged.
6. **Validate.** Focused domain and component tests, then the full suite, type check, build, native
   tests and check, roadmap consistency and diff check. Dev homologation must cover: a correction
   during a long output, several corrections in one turn, a correction never consumed before
   cancellation, and a correction in a turn that completes.

## Files

Expected: `src/app/App.tsx` (the `done`-only reconciliation and whatever in-run cadence slice 1
selects), `src/app/SteeringMessages.tsx` (labels and the delivered mark),
`src/app/ConversationTranscript.tsx` and `src/app/conversationTranscriptModel.ts` (placement),
`src/styles/app.css`. Possibly `src/agent/piProcessStream.ts` and `src-tauri/src/main.rs` if slice 1
selects a bounded native read. `src/domain/steeringState.ts` is expected to change only if slice 1
proves it must; its status machine is deliberately not being redesigned.

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

