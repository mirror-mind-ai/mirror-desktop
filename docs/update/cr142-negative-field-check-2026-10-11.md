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

### Pi produced thinking and no answer

The session file's three `message` entries end with an assistant message at `12:45:32.381Z` whose
only content is **thinking** — *"Planning precise 1200-statement generation"*, *"Designing exact
first-line tag plus 1200 unique assertions"*. There is no assistant text at all. The 145 KB is
almost entirely the encrypted reasoning signature.

So the model planned a 1200-item answer and the process ended before producing one. **The answer
does not exist**, which separates this sharply from CR142, where the answer was complete and
durable the whole time.

### What the renderer did manage

The dedicated conversation holds **two messages**: the prompt, and an **empty** assistant message.
The composer draft was cleared at `12:44:00.131Z`. Both are what `saveAdmittedTurnProjection` and
`persistOwnerComposerDraft("", true)` do on `run_status: working`, so the renderer got that far and
no further.

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

### One operational note

The journal is now at **63 of 64**. One slot remains.
