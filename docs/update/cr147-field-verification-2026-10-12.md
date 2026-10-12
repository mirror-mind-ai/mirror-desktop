[< Updates](../index.md)

# CR147 field verification — 2026-10-12

**Written before the run, with the baseline, the prediction, the falsifiers and the report
specified in the same breath.** The last time an experiment was specified without stating what
should be reported back, the outcome had to be inferred from disk, and an app's trace is
indistinguishable from a person's click. That cost a whole run.

## What is being verified, and what cannot be

CR147 removes a silence. Its positive half — a panic in the run loop being caught, the turn being
finished or reported, and a durable trace naming it — **cannot be provoked in the field**. A panic
cannot be staged on demand, and the one incident that produced this state is not reproducible. The
positive half is established by injected panic and poisoned mutex in the test suite, which is where
it belongs.

**So this check is the negative half only**, in the same shape as CR145's: a healthy turn must still
behave exactly as it did, and the new machinery must leave no trace when nothing goes wrong. A
false positive here — the trace file appearing, or a healthy turn being reported as panicked — would
be worse than the defect, which is why the negative case is the one worth provoking.

## Build under test

| | |
|---|---|
| Dev binary | `77dcc1e8e0ca690884bffd3bd95c145e62a7907d4a7a9e7b4befec74faa5c3be` |
| Installed | 2026-10-12 14:57:50 local, over `9af289a4…` (CR137 slice 2) |
| Backup retained | `/tmp/Mirror Desktop Dev-20261012-145750.app`, hash-verified **before** the installed app was removed |
| Version string | `0.2.0-alpha.46` — identical to production's, so only the hash distinguishes them |
| Production | `834f9b2fb9540cee…`, pid 63424 since 11:58:30 local, **untouched** |

## Pre-state, read with the app closed

Read at 14:58 local. The preferences file's mtime is 10:39:03, from Experiment C of CR137 — nothing
has run in the Dev app since.

| | |
|---|---|
| `turn-journal/mirror-desktop.json` | **61 records** — `settled` 51, `interrupted` 10, **`running` 0** |
| `settlement-timings/mirror-desktop.json` | **19 records** |
| `native-panics.jsonl` | **absent** — this is the measurement, not an incidental detail |
| `activeJourneyId` | `mirror-desktop` |
| `lastConversationSelectionByJourneyId` | `mirror-desktop` → `desktop-conversation-mirror-desktop-18d5cf4842b669b0` |

**An aggregate reading of mine was corrected before it was used.** A first pass globbed every
journal file and reported 186 records with `running: 1`, which does not match this session's
established baseline of 61 and `running: 0`. The aggregate was arithmetically right and not
comparable — the baseline is one Journey's file. Scoped per file, `mirror-desktop.json` is exactly
61 with no running record.

## A fourth instance of CR147's shape, found in the pre-state

Scoping that reading per file surfaced something the aggregate had hidden:
`turn-journal/sandbox-pet-store.json` holds a record frozen in exactly the shape CR147 exists to
remove.

```
journeyId        sandbox-pet-store
runId            agent-run-2026-09-29T01:10:25.910Z
phase            running
revision         2
terminalEvidence null
terminalOutcome  null
createdAt        2026-09-29T01:10:25.914Z
updatedAt        2026-09-29T01:10:25.959Z
```

**It is a different sub-shape from the 2026-10-11 incident, and the difference is informative.**
That one froze after Pi had completed a 65,474-character answer and exited. This one froze **45
milliseconds after it was created**, which puts the failure at the very start of the run loop rather
than at its exit handling — near `transition_running_journal`, before a child could have done
anything.

Stated as found, not as attributed. Whether this is one of the three previously counted occurrences
is **unestablished**: that census was of `mirror-desktop`, and this is another Journey. It is also
not evidence for mechanism A over B, since no later turn ran in that process either. What it does
establish is that the shape is not unique to long answers, and that slice 2's guard wraps the whole
body rather than only the exit path — which is the right scope for this.

**No mutation is proposed for it.** It is a dead record in a sandbox Journey, and a manual
reclamation is not a repair.

## Prediction

A single healthy turn in the Dev app, in the `mirror-desktop` Journey, will:

1. settle normally, with the answer on screen and the composer released;
2. advance `turn-journal/mirror-desktop.json` from 61 to **62** records, the new one `settled`,
   with **`running` still 0**;
3. advance `settlement-timings/mirror-desktop.json` from 19 to **20** records, with every phase
   completed and none non-completed;
4. leave **`native-panics.jsonl` absent**;
5. produce **no** `Error` event mentioning a run loop that stopped unexpectedly, an unreadable
   registry, or a retained lease.

## Falsifiers, named before the run

- **`native-panics.jsonl` exists afterwards.** Either something really panicked, or the hook writes
  when it should not. Either way the slice is wrong as shipped, and the file's contents say which.
- **The journal gains a record that is not `settled`, or `running` is non-zero afterwards.** Slice 2
  wrapped the body; if the wrapping changed when a healthy turn terminalizes, this is where it shows.
- **The settlement ledger does not advance.** That would be CR129 recurring, and it would mean the
  wrapping moved the settlement out of the healthy path.
- **Any of the three new `Error` messages appears on a healthy turn.** The messages are
  deliberately specific so that a false positive is recognisable rather than ambiguous.
- **The turn is slower in a way the Navigator notices.** `catch_unwind` is not free, but it is a
  single wrap around a multi-second process; a perceptible cost would mean something else is wrong.

## What the Navigator does, and what to report

**Three steps.**

1. Open **Mirror Desktop Dev** — it should land in the conversation *"Pensar sobre uma nova feature:
   journey card"*, which is CR137 still working.
2. Send one short turn: `CR147-NEG · responda em uma frase: por que medir é melhor que esperar?`
3. When the answer finishes, **quit the app** and say so.

**Report back exactly four things.**

- Whether the answer arrived and the composer was released.
- Whether any red or error-shaped notice appeared at any point, and its text if so.
- Whether the turn felt slower than usual.
- That the app is closed.

The disk half is mine and I will read it only after you confirm the app is closed — the four
measurements above cannot be taken from disk, and the disk cannot be read safely while you are in
the app.

---

## Result

*To be completed after the run.*
