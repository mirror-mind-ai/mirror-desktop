[< RS016](index.md)

# CR142: Stop Losing a Turn the Journal Already Answered

**Status:** captured
**Driver:** —
**Delivery:** —

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

1. Establish the mechanism before proposing anything. The question is whether the renderer received
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

## Acceptance

- The mechanism is named, with evidence, before any change.
- A turn whose terminal evidence is durable is either projected into the conversation or surfaced as
  owing projection, with a sentence naming what is owed.
- The surface never reports `working` for a turn whose journal phase is terminal.
- The specific run observed here is either recovered or recorded as deliberately not repaired.

## Boundaries

No repair of this instance until the mechanism is established. The per-Journey event route is
**CR141**. CR129 stays separate.
