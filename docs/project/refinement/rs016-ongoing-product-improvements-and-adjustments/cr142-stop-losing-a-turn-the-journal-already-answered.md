[< RS016](index.md)

# CR142: Stop Losing a Turn the Journal Already Answered

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs016-cr142-stop-losing-a-turn-the-journal-already-answered`

## Friction

Observed on Dev, 2026-10-10, during RS024's first field attempt. A turn executed to completion and
its answer exists in exactly one place the Navigator cannot reach.

Measured read-only from `ai.mirrormind.desktop.dev`:

| Layer | State |
|---|---|
| Pi session JSONL | written |
| `turn-journal/mirror-desktop.json` | `phase: terminal_durable`, `terminalOutcome: completed`, `assistantText: "RS024-D1A 1. Falhas de rede…"` |
| `settlement-timings/mirror-desktop.json` | **no record for this run** |
| The thread's dedicated conversation | 18 messages, newest from a prior validation, **no content from this turn** |
| The thread's segments | **no content from this turn** |
| The surface | *"Working…"*, indefinitely |

The native side captured the answer and wrote terminal evidence. The renderer never recorded a
settlement, never wrote the message into the conversation, and still displays the turn as running
more than thirty minutes after it completed.

So the only durable copy of the Navigator's answer is the turn journal's `terminalEvidence`. The
conversation they are looking at does not contain it.

## What is established and what is not

**Established:** the five rows above, and that the Pi execution window closed at
`2026-10-10T17:38:42.447Z` while the journal has not been written since `17:38:42.472Z`.

**Not established:** the mechanism. The field attempt also triggered a refusal in
`piProcessEventDispatcher.register` for a sibling workspace (see **CR141**), and that refusal threw
before mutating any route, so no code path yet read connects the two. It may be independent; it may
not. **This CR must not assume CR141 is its cause.**

**Also not established:** whether this is reachable without the concurrency attempt that provoked
it. A single-workspace reproduction is the first thing to look for, because if it exists this is a
much older defect than today.

## Not CR132, and not CR129

CR132's abandonment offer did **not** appear, and it was right not to:
`settlementAbandonmentOffer` requires `ownerPhase === "finalizing"`, and the surface reads
`working`, so the renderer believes the turn is still *running*. The offer declined with
`not_finishing`. **CR132 remains unexercised** — this was not its trigger.

CR129 was captured for a settlement that *succeeds through recovery and says nothing*. This is the
sharper neighbour: a settlement that **did not happen at all** and also says nothing. They share
the silence and not the mechanism, so they stay separate and cross-referenced.

## Outcome

A completed turn's answer is never reachable only from the turn journal. Either the renderer
records it where the Navigator reads, or the surface stops claiming the turn is still running and
says what it is waiting for.

## First Investigation

1. ~~Establish the mechanism before proposing anything.~~ **Replaced 2026-10-11 with the Navigator's
   agreement.** The mechanism of the loss cannot be named: both remaining candidates - a `deliver`
   rejection into an in-memory quarantine a release build cannot read, and a dropped
   fire-and-forget `app.emit` - are silent by construction. The requirement is now that the
   mechanism be **recorded as unestablished with its candidates named**, and that the repair not
   depend on which one it was. Superseded text kept rather than deleted.
   Original: establish the mechanism before proposing anything. The question is whether the renderer received
   the stream's terminal events at all: the conversation has no user message from this turn either,
   which suggests nothing was persisted after the pre-send write.
2. Establish whether the journal's `recoveryDisposition: ResumeProjection` recovers this on the
   next launch. If it does, the defect is the *surface claiming "Working…"* rather than lost
   content, and that is a smaller and different CR. **Measure this before the app is restarted**,
   because a restart is the experiment.
3. Establish whether a single-workspace reproduction exists.
4. Check the dispatcher's `quarantine()` for rejected events bearing this run's authority. A
   `unknown_route` or `authority_mismatch` rejection would name the mechanism directly.
5. Establish whether the known debt *"`emit` can carry a synchronous subscriber's throw into
   settlement"* is reachable here. A throw inside the stream handler would explain both the missing
   settlement and the stuck display.

## Pre-Restart Baseline, Measured While the Session Was Still Live (2026-10-10 15:34 local)

The Navigator confirmed the Dev app had not been restarted, so investigation item 2's experiment is
still available and its "before" is recorded here rather than remembered.

**The stuck state is static, not slow.** Measured 56 minutes after the turn completed:

- the Dev process is the same one (pid 25964, launched 14:35:04, no restart);
- `turn-journal/mirror-desktop.json` mtime is still `14:38:42` — unchanged;
- `settlement-timings/mirror-desktop.json` mtime is still `14:37:30`, D0-CAL's;
- **no file anywhere in the Dev data directory was written in the preceding 40 minutes**;
- `terminal-handoffs/` is empty.

Nothing is retrying. This is not a settlement in progress.

### The exact record the restart will or will not recover

| Field | Value |
|---|---|
| `phase` | `terminal_durable` |
| `terminalOutcome` | `completed` |
| `recoveryDisposition` | **`resume_projection`** |
| `revision` | 3 |
| `createdAt` → `updatedAt` | `17:38:10.509Z` → `17:38:42.472Z` |
| `authority.runId` | `agent-run-2026-10-10T17:38:10.504Z` |
| `authority.threadId` | `desktop-thread-mirror-desktop-18d5cf4842b669b0` |
| `authority.generation` | 1 |
| `piExecution.startedAt` → `committedAt` | `17:38:12.994Z` → `17:38:42.447Z` |
| `piExecution.assistantText` | **17,806 bytes, `assistantTextTruncated: false`** |
| `piExecution.entryCount` | 27 |

Journal aggregate before the restart: **52 records of 64** — 39 `settled`, 10 `interrupted`, 2
`running` (the pre-existing September orphans), 1 `terminal_durable` (this turn).

**The whole answer is durable and untruncated.** Recovery is therefore possible in principle, and
the restart decides whether it happens. That bounds this CR: it may be a lost-content defect or a
lying-surface defect, and the experiment distinguishes them.

### The experiment, with its prediction and its falsifier

- **Prediction:** on the next launch the recovery path reads a `terminal_durable` record carrying
  `resume_projection`, projects the 17,806 bytes into the thread's conversation, writes a
  settlement-timings record, and advances the journal phase past `terminal_durable`.
- **Falsifier:** after the restart the conversation still carries no content from this run, or the
  record remains `terminal_durable`.

If the prediction holds, this CR narrows sharply: the content was never at risk, and the defects are
(a) the in-session projection never running and (b) the surface reporting `working` for a turn whose
journal phase is terminal. If the falsifier holds, a completed answer is unreachable from every
surface the Navigator has, and this CR is severe.

### Which binary ran, established without relying on `ps`

The install check reported no Dev process at `14:14:20`, and the process now running began at
`14:35:04`. That ordering is corroborated independently by the failure itself: the Navigator
received the dispatcher's route error, which can only happen if admission *allowed* the sibling.
The pre-CR140 binary refused at the renderer's pre-check and never reached `register`. So the code
that produced these observations carried CR140's grain flip, whatever `ps` did or did not see.

### Still unread, and only readable from the GUI

`piProcessEventDispatcher.quarantine()` is in-memory. A `unknown_route` or `authority_mismatch`
entry bearing this run's authority would name the mechanism directly, and it is lost on restart.
Reading it needs the developer console, which is the Navigator's action; it is listed as
investigation item 4 and is **not** a precondition for the restart experiment.

## Experiment Result — the restart recovered it (2026-10-10 18:46)

The Navigator restarted the Dev app at `18:46:01`. **The content was never at risk**, so this CR
takes the narrow branch its baseline predicted.

| | Before restart | After restart |
|---|---|---|
| Journal phase | `terminal_durable`, revision 3 | **`settled`, revision 5**, `updatedAt 21:46:09.693Z` |
| Journal census | 39 settled, 1 terminal_durable | **40 settled, 0 terminal_durable** |
| Thread conversation | 18 messages, no D1A content | **20 messages**, carrying the prompt and the full answer |
| Surface | *"Working…"* for ~70 minutes | **IDLE** |

Recovery ran within about eight seconds of launch and did exactly what
`recoveryDisposition: resume_projection` promises. The 17,806 bytes were projected intact.

### Half of the stated prediction failed, and the failure is the finding

The prediction said recovery would project the content, advance the phase, **and write a
settlement-timings record**. The first two held. The third did not:
`settlement-timings/mirror-desktop.json` is still stamped `14:37:30` and its last entry is still
the calibration turn. **A settlement that succeeded through recovery left no record of having
happened** — which is precisely what **CR129** was captured for, now demonstrated with dated
evidence rather than argued. Recorded there.

### What remains defective, now much narrower

1. **The in-session projection never ran, and nothing retried.** The turn sat `terminal_durable`
   for seventy minutes with no file written in the final forty. Only a process restart moved it.
2. **The surface claimed `working` the whole time** for a turn whose journal said `completed`. This
   is the sharpest remaining part: the answer existed, durably, and the Navigator had no way to
   know. A surface that says *working* when the record says *finished* is worse than a surface that
   says nothing, because it directs the Navigator to wait.
3. **Recovery did not clear the composer draft.** `composer-drafts.json` still holds the D1A prompt
   under its per-conversation key — the drafts are correctly workspace-scoped, and the draft is
   cleared only when a turn commits, which in-session it never did. After recovery the same prompt
   sits in the composer one Send away from being asked a second time, with its answer already above
   it in the transcript. Not data loss; a duplication trap the recovery path leaves behind.

### The mechanism is now unrecoverable for this instance

Investigation item 4 asked for `piProcessEventDispatcher.quarantine()`. **The release build offers
no developer console**, so that reading was never available and is now gone with the process. The
in-session failure's mechanism stays unestablished for this occurrence, and a reproduction is the
only remaining route to it.

That gap is worth naming on its own: an in-process diagnostic that only exists in memory, in a
build with no console, cannot be read when it matters. Whether that becomes its own CR is the
Navigator's call; it is not folded in here.

### Scope, revised

This CR is no longer *"stop losing a turn"* — nothing was lost. Its subject is the seventy minutes
in which a completed answer was durable and invisible, and the surface pointed away from it. The
title is kept so the record of what was feared remains legible; the Outcome and Acceptance below
are the ones that still apply, and the first Acceptance line — naming the mechanism before any
change — is now harder and still required.

## Investigation Findings and Plan (2026-10-11)

All five items answered. **One is refuted**, one is unanswerable and says so, and the finding that
replaces them is stronger than any of them: *everything that would notice is triggered by the very
event that went missing.*

### Item 1 — the mechanism of the loss is not establishable, and the code says why

The renderer's own path is sound, which removes it from the candidate list. `case "done"` returns
a constant (`piProcessStream.ts:149`) and cannot throw; `queue.push` resolves a promise and cannot
throw; `close()` runs immediately after the push that precedes it. **A `done` that reaches the
handler always closes the queue.**

So the loss happened before the handler, and only two paths remain:

- `deliver` rejected it as `unknown_route` or `authority_mismatch`, recording the reason in an
  **in-memory** quarantine that a release build offers no way to read;
- the native `emit` never arrived. `main.rs:8229` is `let _ = app.emit(...)` — fire and forget,
  with no acknowledgement and no trace on either side.

**Both candidates are silent by construction.** The mechanism is therefore not establishable from
this incident or from the code, and chasing it further would be chasing something neither the
record nor the source can reach.

### Item 5 — REFUTED

The CR121 debt *"`emit` can carry a synchronous subscriber's throw into settlement"* was carried
here as a plausible cause. It is not one. `deliver` does wrap the handler in `try`/`finally` with
**no `catch`**, so a throw does escape — but for the `done` event there is nothing that can throw,
per item 1. Removed from this CR's candidates and recorded as refuted rather than left to be
re-suggested later.

### Items 2 and 3

Item 2 was answered by the restart experiment: recovery works, the content was never at risk.

Item 3 is answered in principle rather than by reproduction. The suppression below is independent
of *why* the `done` was lost and of whether a sibling was involved, so a single workspace reaches
it the moment any `done` goes missing. No reproduction was produced, and none is needed for the
repair, because the repair does not depend on the cause.

Item 4 is dead: the quarantine died with the process and is unreadable in a release build anyway.

### The finding — four surfaces, one false belief, and no way to challenge it

Measured by probe against the real predicates, not read:

| Predicate | In the stuck state | Why it is silent |
|---|---|---|
| `isTurnJournalSuccessorEligible(terminal_durable)` | **false** | so the record *is* eligible to be found as blocking |
| `findBlockingTurnJournalRecord(…, activeNativeRunId)` | **found** | when a native run is active |
| `findBlockingTurnJournalRecord(…, undefined)` | **not found** | and a finished turn has no *active* lease, so this is the case that applies |
| `showBlockingTurnRecoveryNotice` | suppressed | requires `!isStreaming`, and the turn is streaming forever |
| `retainedLeaseWithoutRecovery` | suppressed | requires `!selectedRuntimeBusy`, likewise |
| `settlementAbandonmentOffer` (CR132) | `not_finishing` | requires `ownerPhase === "finalizing"`; the renderer never leaves `running` |

**And none of them is ever re-evaluated.** `reconcilePiInvocationOccupancy` has exactly four
callers: once on mount, inside the **rehydrate handler on `done`**, and twice inside the send and
settlement paths. The journal-reloading effect (`App.tsx:1992`) depends on
`selectedNativeLease?.leasePhase` and `?.terminalState`, which only change when occupancy is
reconciled.

So in the stuck state the renderer's view of the world is **frozen**, and every path that could
unfreeze it is downstream of the event that was lost. That is not a silent surface; it is a system
that has stopped looking. It matches the field measurement exactly — no file written in the final
forty minutes, nothing retrying.

### What this makes the repair

Not finding the lost event. **Giving the renderer a way to ask a question it currently cannot ask.**

The journal is durable and already correct. The disagreement is unambiguous and needs no judgement:
the journal says `terminal_durable` while the renderer says streaming. A genuinely long turn reads
`running`, not `terminal_durable`, so there is no honest case where both are true at once.

## Scope

- **New `src/app/strandedTurn.ts`** — a pure predicate, preferred over editing a widely-depended-on
  module for the seventh time in this programme:
  `deriveStrandedTurn({ journalRecords, threadId, generation, runId, believedStreaming })` →
  `{ stranded: true, record } | { stranded: false, reason }`, with `reason` total by `switch` so a
  future state cannot fall through silently. `stranded` requires **all** of: the renderer believes
  the turn is streaming; a journal record for this thread, generation and run whose phase is
  terminal with a `completed` outcome; and no successor record.
- **`App.tsx`** — a bounded re-read of the journal **only while a turn is believed to be
  streaming**, a notice, and an action. Four wiring points, no change to the send path.
- **The action reuses what exists**: `recoverPostTerminalPersistence(journeyId)`, already the
  handler behind two existing buttons and the automatic path a restart takes. It additionally
  clears the composer draft for that workspace, because the recovery currently leaves the answered
  prompt sitting there one Send away from being asked twice — the third defect in this CR's record.
- **No change** to the dispatcher, the transport, admission, the registry or CR132's offer.

## Tests

- `deriveStrandedTurn`: stranded when the journal is terminal and the renderer streams; **not**
  stranded when the journal says `running` (the long-turn case, which is the false positive that
  matters); not stranded when the renderer is idle (the CR115 case); not stranded when a successor
  record exists; a sibling workspace's terminal record never strands this one.
- A guard that the re-read cannot run while no turn is believed streaming, asserted against `App.tsx`
  source, because that condition is the whole reason CR115's loop stays closed.
- A component test that the notice names what is waiting and offers the recovery, and that it does
  not appear in any of the negative cases above.
- A regression test that the existing `showBlockingTurnRecoveryNotice` and CR132's offer are
  unchanged — this CR adds a surface, it does not widen theirs.

## Validation

`tsc` 0; `vitest` green; `cargo test` 285 unchanged with **0 native diff lines**; both builds;
`roadmap:check` READY.

**Field: this is not provocable on demand.** The trigger is a lost `done`, which has happened once
in the record and has no known cause. What *is* provocable is the negative: a long turn must never
raise the notice. That is worth running deliberately — a four-minute prompt, confirming the surface
stays quiet — because a false positive here would be worse than the defect, telling the Navigator a
running turn is stranded.

## Exclusions

**The cause is not pursued.** Both remaining candidates are silent by construction, and the repair
does not depend on which one it was.

**The quarantine is not made durable.** A release build with no console cannot report an in-memory
diagnostic, and that gap is real — but it is a diagnostics CR, not this one, and it is already
noted alongside the console gap.

**CR129 is untouched.** A settlement that succeeds through recovery still writes no timing record.

**No automatic settlement.** See decision 3.

## Three decisions written so they can be overruled rather than discovered

1. **A bounded re-read of the journal, gated on a turn being believed streaming.** That gate is
   what keeps CR115's idle loop closed: an idle Journey has no streaming turn, so the read cannot
   fire. The interval is a number this plan does not yet fix; it should be large enough to cost
   nothing and small enough that the Navigator does not sit in front of a lie.
2. **No time threshold for the judgement**, unlike CR132. CR132 needed one because *waiting too
   long* is an opinion. Here the journal gives a definite answer, so the only question is when to
   ask it — and a threshold would add a delay without adding certainty.
3. **An affordance, not automatic recovery.** `recoverPostTerminalPersistence` is already a button
   in two places; this adds a third in the one state where the Navigator currently has none. Doing
   it automatically would be the braver heuristic this programme has repeatedly declined.

## A recommendation about this CR's own Acceptance

This CR's first Acceptance line requires naming the mechanism before any change. **That line cannot
be satisfied** — item 1 establishes that both remaining candidates are silent by construction.
Keeping it would block a repair that does not need it.

The recommendation is to replace it with: *the mechanism of the loss is recorded as unestablished,
with its two candidates named, and the repair is required not to depend on which one it was.*
**Changing a CR's own acceptance is a Workbench decision**, so it is recommended here and not made.

## Delivery Record (2026-10-11)

Delivered on files. Diff: 3 files, +330/-1, one new module. **`src-tauri` diff 0 lines.**

### One correction to the plan, found by building it

Decision 2 said there would be **no time bound**, because the journal gives a definite answer
where CR132 needed an opinion. That was almost right and not quite: the native side writes
`terminal_durable` and *then* emits `done`, so there is a legitimate window in which the journal is
terminal and the renderer is streaming at the same time. Without a grace, the predicate would call
a healthy settlement a defect.

`STRANDED_SETTLEMENT_GRACE_MS = 10_000` exists for that, and it is not the same kind of number as
CR132's threshold. CR132 encodes a judgement — *this wait is too long*. This encodes a fact —
*this is not an in-flight transition* — derived from the seven settlements measured on 2026-10-10
and 2026-10-11 (1.6 s to 3.0 s), set at more than three times the slowest, with its falsifier
written at the constant. The distinction is recorded rather than letting one number quietly stand
in for the other.

### What shipped

- **New `src/app/strandedTurn.ts`**: `deriveStrandedTurn` returning either `stranded` with the
  record or a **named reason**, total by construction so a state it does not yet consider surfaces
  as a reason instead of a silent `false`. Plus `describeStrandedTurn`, `STRANDED_TURN_POLL_MS`
  and the grace constant.
- **`App.tsx`**, four wiring points: a tick advanced only by the poll; the derivation beside the
  other notice predicates; the poll effect; and the notice with its action.
- **The poll is the only trigger in the renderer that is not downstream of the lost `done`.** It is
  gated on `isStreaming`, reads one file, and touches occupancy not at all — which is what keeps
  CR115's loop closed, since that loop ran on an idle Journey and reconciled occupancy every pass.
- **The action reuses `recoverPostTerminalPersistence`**, already the handler behind two buttons
  and the path a restart takes, and additionally clears the composer draft — CR142's third
  recorded defect, where recovery left the answered prompt one Send away from being asked twice.

### The sentence says the turn is not lost

*"The agent finished this turn and the answer is saved, but this conversation never received it.
Nothing is lost."* The one observed instance recovered intact, and the answer was durable the whole
time. A sentence implying loss would be false, and a test asserts it.

### Tests — 13 new, in `strandedTurnVisibility.test.ts`

The negative cases are the ones that matter and they outnumber the positive. A long turn the
journal agrees is running raises nothing; an idle Journey raises nothing; a healthy settlement
inside the grace raises nothing; an unreadable timestamp is treated as in flight rather than as
stranded; a sibling's terminal record, a previous generation and a previous run never strand this
turn. Telling a Navigator that a working turn is stranded would be worse than the defect.

Source guards pin what the prose claims: the poll is gated on `isStreaming`, calls
`loadTurnJournal` and mentions neither `reconcilePiInvocationOccupancy` nor `listMirrorOutbox`;
the interval is a named constant; the notice offers the recovery rather than running it.

**Verified by removal**: deleting the `isStreaming` gate makes a test fail, so the guard holds a
real property rather than describing one.

### A finding from my own test helper

The helper read `input.run === undefined ? believedRun : input.run`, which cannot tell *absent*
from *deliberately undefined* — so the case asserting silence without a live run authority was
asking the opposite question, and the production code was fine all along. Fixed with `in`. The
second time in this programme that a test's own helper, not the code, was the defect.

### Gates

`tsc` 0; renderer **255 files / 1,981 tests** (from 1,968); `cargo test` **285 passed / 3
ignored**, unchanged; `npm run build` clean; `roadmap:check` READY; **native diff 0 lines**.

### Field

**Not provocable on demand**, as the plan said: the trigger is a lost `done` with no known cause.
What is provocable is the negative, and it is the one worth running — a deliberately long turn,
several minutes, confirming the notice stays quiet. A false positive here would be worse than the
defect it repairs.

## Acceptance

- The mechanism is named, with evidence, before any change.
- A turn whose terminal evidence is durable is either projected into the conversation or surfaced as
  owing projection, with a sentence naming what is owed.
- The surface never reports `working` for a turn whose journal phase is terminal.
- The specific run observed here is either recovered or recorded as deliberately not repaired.

## Boundaries

No repair of this instance until the mechanism is established. The per-Journey event route is
**CR141**. CR129 stays separate.


---

## Closed (2026-10-11)

The one thing owed was the negative field check, and it was collected — on the **second** attempt.

**The first attempt did not run the check; it found CR145 instead.** That is recorded above and not
smoothed over: the notice correctly stayed silent because `deriveStrandedTurn` returned
`journal_agrees`, and the journal was wrong in the same direction as the renderer. The predicate
was right; its oracle was not.

**The second attempt collected it.** Run `agent-run-2026-10-11T20:01:56.147Z`, a 74-second turn
producing 1,201 lines, with the notice absent throughout and the turn reaching `settled` rev 5 with
complete terminal evidence. Measured in
[the joint field check](../../../update/cr145-and-cr142-negative-field-check-2026-10-11.md).

**Where attestation begins:** the disk cannot prove a notice did not render. It proves the turn
settled healthily, which is the state in which the predicate returns `journal_agrees`. For a visual
absence the Navigator's observation is the only possible instrument.

**The limitation found by its own validation stands and is not closed by this.** When the journal is
wrong, this predicate is silent — correctly, and uselessly. CR145 is the repair for that case, and
the two now cover the two halves: a turn the journal already answered, and a turn whose Pi already
exited.
