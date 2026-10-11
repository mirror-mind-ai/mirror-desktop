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

## Result

Owed.
