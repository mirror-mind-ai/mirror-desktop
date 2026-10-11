[< Updates](../index.md)

# CR142 — the negative field check

**Date:** 2026-10-11

This check exists to fail, not to pass. CR142 added a notice that says a turn has already finished
when the journal says so and the renderer does not. **A false positive would be worse than the
defect it repairs**, because it would tell the Navigator that a turn doing real work is stranded.
So the thing worth provoking is a long, healthy turn, and the result worth recording is silence.

## Instrument

| | |
|---|---|
| Dev binary | **`88d404cc2d3f9b6bae3e21c72dcb7c23e1fc527e920e1d89f7fe3fed0963c7e6`** |
| Replaced | `b9578018ee45b720…` (CR144) |
| Backup, hash-verified **before** the original was removed | `/tmp/mirror-desktop-dev-backup-20261011-093654.app` |
| Production | **untouched**, `042261033633538c…` (alpha.44), running (pid 87381) |

## Baseline

Journal **62 of 64** — 50 `settled`, 10 `interrupted`, 2 `running` (the September orphans).
**Two slots remain and this check costs one.** After it, one slot is left, so a further run on this
Dev profile can reach `turn_journal_full`. That is CR139's fail-closed refusal arriving through
CR140's sentence, and it would be evidence worth capturing — but it is worth knowing in advance
rather than meeting as a surprise.

## Calibration, from the twelve runs already recorded

Pi execution times measured on this profile: 15.4, 16.2, 17.5, 17.5, 18.2, 18.4, 18.6, 21.4, 23.5,
29.5, 42.3 and 62.1 seconds — for prompts of 150 to 250 numbered items. **The variance is four-fold
at the same prompt size**, which is why the prompt below asks for roughly five times as much rather
than for a duration.

The target is a turn that outlives **several poll cycles**. `STRANDED_TURN_POLL_MS` is 15 s and
`STRANDED_SETTLEMENT_GRACE_MS` is 10 s, so a turn of two minutes gives eight polls, each of which
must read the journal, find `running`, and return `journal_agrees`.

## What must happen

**Nothing.** Specifically, this must never appear while the turn runs:

> **This turn has already finished**
> The agent finished this turn and the answer is saved, but this conversation never received it.
> Nothing is lost. *[Recover this turn]*

## Divergences that would be findings

- **The notice appears during the turn** — a false positive, and the defect is mine. The run stops
  and the predicate is wrong about the grace, the phase set, or the record it matches.
- **The turn finishes in under 60 seconds** — fewer than four poll cycles, so the check is weaker
  than intended. Raise the count and run again rather than accepting it.
- **`turn_journal_full`** — captured, not retried past.
- **The `Working` mark disappears while the turn runs** — CR143 regressing, free to observe.

## Result — the check did not run, and a different defect appeared

**The negative check is NOT collected.** The turn never became the long healthy turn it needed to
be, so nothing was learned about false positives. What happened instead is new and is recorded
here because the state was preserved rather than restarted past.

### What the durable record says

| | |
|---|---|
| Conversation | **"New Conversation"**, `desktop-thread-mirror-desktop-18dd7a36acc7f288`, created for this run |
| Run | `agent-run-2026-10-11T12:43:58.174Z` |
| Journal phase | **`running`, revision 2, `terminalOutcome: null`, `terminalEvidence: null`** |
| Journal `updatedAt` | `12:43:58.223Z` — written at admission and **never again** |
| Pi session file | 145,838 bytes, **6 lines**, last written `12:45:32.381Z` |
| Pi child process | **gone** — the Dev app (pid 96616) has no children |
| `settlement-timings` | **no record**, file untouched since last night |
| Renderer | **stuck in `finishing`**, reported by the Navigator |
| Elapsed with nothing written | 8 minutes at the time of reading |

### ~~Pi produced thinking and no answer~~ — WRONG, corrected 2026-10-11

**This section was false and the error was mine.** I printed the first 700 characters of the last
JSON line, saw a `thinking` element, and concluded there was no answer. `message.content` is an
**array**: element 0 is the thinking block with its 6,690-byte encrypted signature, and element 1
is `type: "text"` with **65,474 characters** — the complete answer, beginning `RS024-CR142-LONG\n1.`
and ending `1200. Uma boa decisão de projeto torna a ação correta mais clara.` The message carries
`stopReason: "stop"` and a full usage record.

**Pi completed cleanly and produced everything that was asked.** The superseded text is kept
struck through above rather than deleted, because the conclusion it supported — that this was a
different defect from CR142 — was reached partly on a false premise.

Suspect the instrument before reporting a result. A truncated read of a structured field is not a
reading of the field.

### What the renderer did manage

The dedicated conversation holds **two messages**: the prompt, and an **empty** assistant message.
The composer draft was cleared at `12:44:00.131Z`. Both are what `saveAdmittedTurnProjection` and
`persistOwnerComposerDraft("", true)` do on `run_status: working`, so the renderer got that far and
no further.

### What the screen established that the disk could not

The Navigator's screenshot answers the question the disk left open, and it does so through a
surface built three CRs ago.

**The full answer is on screen** — items 1188 to 1200 are visible, the transcript is complete.
**The Journey header reads `FINISHING`** and the composer reads `Finishing …`. And **the
conversation's CR143 mark reads `WORKING`**.

That last one is a measurement, not a decoration. `deriveConversationWork` maps
`isActivePiInvocationLease(entry)` to `working` and everything else to `finishing`. The mark
therefore says the native registry still holds a **live, non-terminalized lease** for this
workspace — for a child process that exited forty-five minutes ago.

From which the prediction below follows as established rather than guessed:
`hasActiveNativeExecution` is true, so `settlementAbandonmentOffer` declines with
`native_execution_active`. **That is why no *Stop waiting* appeared.** CR132's escape hatch is
disabled by exactly the failure it exists to rescue, and the proof came from CR143's mark.

Two surfaces disagree on this screen — the conversation says `WORKING`, the Journey says
`FINISHING` — and the disagreement is the evidence.

### A question of mine that could not have informed anything

I asked whether Send was enabled in another conversation, expecting it to distinguish *registry
still holds the lease* from *registry released it*. **It cannot.** CR139 gave each Journey a share
of three, so one held lease leaves two free and Send is enabled either way. The answer was
`enabled`, and it means nothing. Recorded because a question that cannot discriminate is worse
than no question: it invites a conclusion.

### The sharpest part, stated as a reading and not as a conclusion

The renderer reaching `finishing` means it received a terminal stream event, because the queue only
closes on `done`. The native side therefore emitted one. But the journal never left `running` and
carries no terminal evidence, so whatever the native side wrote before emitting did not land.

And **CR132's escape is very likely suppressed by this same gap**. `settlementAbandonmentOffer`
requires `!nativeExecutionActive`, which reads the native registry — and if the registry still
believes the child is running, as the journal does, the offer declines with
`native_execution_active`. The escape hatch for *a finishing that will not end* would then be
disabled by exactly the failure it exists to rescue. **This is a prediction, not a measurement**:
it is confirmed or refuted by whether a *Stop waiting* option is on screen, which only the
Navigator can see.

### Relation to what is already on the books

This is an instance of the long-standing **orphaned-Pi candidate** — *"if the shutdown hook does
not run, both status sources go blind to a live child"* — with the polarity reversed. The child is
**dead** and both sources are blind to its death. The recorded debt *"a hung-but-live Pi has no
exit and the surface says nothing"* is the same family.

It is **not** CR142: there the journal was terminal and the renderer streaming, and the answer
existed. Here the journal is `running`, the renderer is finalizing, and there is no answer.
CR142's predicate correctly returns `journal_agrees` and correctly says nothing.

### Not restarted

The state is preserved. A restart would destroy the native registry and with it the only remaining
way to establish whether the lease is still held.

### What this costs CR142, said plainly

**CR142's repair does not cover this case, and the check meant to validate it is what revealed
that.**

CR142 appeals to the turn journal as the durable truth: the renderer believes one thing, the
journal knows better, so ask the journal. Here **the journal is wrong too** — it says `running`
for a process that exited cleanly — so `deriveStrandedTurn` correctly returns `journal_agrees` and
correctly stays silent. The predicate is right and the oracle it consults is not.

What does know: the Pi session file, which carries `stopReason: "stop"`, and the absence of any
child process. Neither is something the renderer reads today.

So CR142 remains correct for the case it was built for and is **blind to this one**. That is a
limitation of work shipped yesterday, found by its own validation, and it is recorded here rather
than discovered later.

### The answer is safe on disk, but not where the conversation keeps it

The dedicated conversation holds the prompt and an **empty** assistant message: the renderer has
not committed the turn, because it never left finalizing. The 65,474 characters live in the Pi
session file and in the renderer's memory.

**A restart would lose the on-screen copy and keep the Pi one.** Whether the app can project it
back is unestablished: the journal's `recoveryDisposition` is **`resume_execution`**, not
`resume_projection`, so the recovery that rescued CR142's turn is not the one that would run here.

### Pre-Restart Baseline (2026-10-11 10:35 local)

Recorded before the restart experiment, so the "before" is on disk rather than in memory of a
conversation.

- Turn journal: **63 of 64** records; the run `agent-run-2026-10-11T12:43:58.174Z` at
  **`running`, revision 2**, `terminalOutcome: null`, `terminalEvidence: null`,
  `recoveryDisposition: resume_execution`, `updatedAt 12:43:58.223Z`.
- `settlement-timings`: **18 records**, newest from the night before. None for this run.
- Dedicated conversation: **2 messages** — the prompt and an **empty** assistant message.
- Pi session file: 145,838 bytes, the answer intact at 65,474 characters, `stopReason: "stop"`.
- Native registry: **holds a live lease**, established through CR143's `WORKING` mark.
- Dev process: pid 96616, launched 09:41:50.

**The answer was extracted to `/tmp/RS024-CR142-LONG-resposta-completa.txt`** so that nothing about
the experiment can cost it.

### The prediction, and its falsifier

`recoveryDisposition` is `resume_execution`, not `resume_projection`. The path that rescued CR142's
turn is **not** the one that will run.

- **Prediction**: the restart does *not* bring the answer into the conversation. The conversation
  keeps its empty assistant message, and the journal either stays `running` or is reconciled to
  `interrupted` once the registry is rebuilt and finds no child.
- **Falsifier**: the answer appears in the conversation after the restart, which would mean a
  recovery path reads the Pi session file and this defect is narrower than it looks.

Either outcome is worth the restart. The first says the turn is genuinely unrecoverable in-app and
CR145 must repair the release path; the second says the content route exists and only the status
does not.

### Restart Outcome (2026-10-11 11:08 local) — the prediction was REFUTED

The Dev app was closed and relaunched at `11:08:13`. **The answer came back.** The prediction
written beforehand said it would not, and the falsifier named exactly this. It is recorded as a
refutation rather than quietly adjusted.

**What the restart fixed.** The dedicated conversation gained the full 65,474-character answer at
`11:08:25`, twelve seconds after launch — projected from the Pi session file without re-running
anything, since the journal did not gain a record. The Journey header moved off `FINISHING`.

**So the content route exists.** CR145 is much narrower than it looked: the Desktop can already
recover the text of a turn whose process vanished. What it cannot do is *release the turn while
running*. That reduces the defect from "the answer is unrecoverable" to "the only way out is a
restart, and the durable record never heals."

### Three things the restart did not fix

**1. The journal record is still `running`, and always will be.** Phase `running`, revision 2,
`updatedAt 12:43:58.223Z`, `terminalEvidence: null`. The file's mtime is **unchanged at
09:43:58** — the restart wrote nothing to it. The `interrupted` the Navigator sees is derived in
memory at mount; **nothing durable was corrected.**

And this is not the first time. The journal holds **three** `running` records:

| Created | Thread | |
|---|---|---|
| `2026-09-18T18:10:32` | `…18d5cf4842b669b0` | 23 days old |
| `2026-09-18T18:42:30` | `…18d5cf4842b669b0` | 23 days old, same conversation, 32 minutes later |
| `2026-10-11T12:43:58` | `…18dd7a36acc7f288` | today |

**This defect has happened at least three times and has never once healed.** Each instance holds
one of 64 slots permanently. Three are already gone, and `cleanup_stale_terminal_handoffs` has had
23 days of launches to reclaim the first two and has not.

**2. The recovery duplicated the turn.** The conversation now holds **four** messages:

| # | Role | Size |
|---|---|---|
| 1 | user | 353 chars — the prompt |
| 2 | assistant | **0 chars — the empty placeholder, still there** |
| 3 | user | 353 chars — **the same prompt again** |
| 4 | assistant | 65,474 chars — the answer |

Recovery appended a fresh user/assistant pair from the Pi session instead of completing the
placeholder that was waiting for it. The transcript durably reads: ask, silence, ask the same
thing again, answer. Captured as **CR146**.

**3. No settlement timing was recorded.** `settlement-timings` is still 18 records with mtime
`23:29:22`. This is **CR129's second measured instance** — a recovered settlement leaves no trace
in the ledger — and it strengthens what CR129 already says: the ledger systematically undercounts
exactly the settlements that needed recovery.

Also unchanged and stale: the catalog still reports **`messageCount: 0`** for a thread that now
holds four messages, and the segment file is 364 bytes from `09:43:26`.

### One operational note

The journal is now at **63 of 64**. One slot remains.
