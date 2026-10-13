# CR149 main-thread slice field check — 2026-10-13

**Kind:** field verification record for CR149's main-thread slice
**Written before the run.** Sixth field check on this CR; the first five refuted their hypothesis.
This one is the first whose cause was **measured in the right process** before the repair was built.

## What shipped

69 of the 90 Tauri commands now carry `#[tauri::command(async)]`, so they run on the async
runtime's workers instead of inline in the main thread's URL-scheme callback. Every converted
command acquires one process-wide serialisation guard as its first statement, so the commands are
still serialised against each other exactly as the main thread serialised them. **Same semantics,
different thread.** 10 commands stay on the main thread by explicit allow-list (dialogs, hand-offs
to other applications, quit lifecycle); a test asserts none of them touches application data.

## Builds

| | binary sha256 |
|---|---|
| **Eval, main-thread slice** | `bc488ca08d54af7f171d6b5c7dbbe9042c2dcbac823d9769e5f89c76aeb52a61` |
| Eval, previous (the measured build) | `11216a6978789fefa742b4ed6b3fa0c0cc67caddc658210117a5a5984d456658` — retained at `/tmp/Mirror Desktop Eval-20261013-162434.app` |

Both report `0.2.0-alpha.47`. The `ps` gate aborted-on-running and passed.

## The run

1. **Quit and reopen Mirror Desktop Eval.**
2. `alissonvale.com`, the conversation measured earlier (11.5 MB projection).
3. Short turn; from the answer finishing, **type continuously until `Finishing` clears.**
4. **Also: with a second Journey open in another window or by switching, type there during the
   first Journey's `Finishing`.** This is the symptom that discriminated the cause.
5. Repeat on 3 turns.

## Predictions and falsifiers

### 1. Typing during `Finishing` is fluid — in the finishing Journey and in every other one

**Falsified if** either still stalls. The mechanism says both must improve together, because they
had one cause. If only one improves, the model is wrong somewhere specific and that is informative.

### 2. The main thread is idle during a settlement

The instrument-level falsifier, independent of perception. Same `sample` as before, 60 s around one
settlement. **Falsified if** `startURLSchemeTask` still carries hundreds of samples. Expected: the
command closures move to `tokio-rt-worker` threads and the main thread's non-idle share drops to
the run-loop's own work.

### 3. Settlements are not slower

Baseline for this Journey's three settlements today: **5,887 / 6,303 / 5,984 ms.** The work is the
same work on a different thread, so wall time should be within noise. **Falsified if** records are
materially slower — which would point at worker contention or the guard — and **noted, not
claimed, if faster**: a faster number here would be the main thread no longer competing, and three
samples cannot establish it.

### 4. A healthy turn is unaffected

Journal advances by one per turn with `running: 0`; the timing ledger gains one `settled` record
per turn with 19 phases; the conversation list, Composer drafts, preferences and settings all still
load and save — **every one of those crosses a converted command now.**

### 5. The dialogs and hand-offs still work

The 10 kept commands: choose a file attachment, open an external link, reveal an artifact, open a
document. Named because they are the ones that did *not* move, and a wrong allow-list would show
here.

### 6. Nothing panics or deadlocks

`native-panics.jsonl` absent. **A deadlock would present as a command that never returns** — a
`Finishing` that never clears with no error — and the reentrancy test is what makes it unlikely,
but the field is where it would show.

## What this run cannot establish

- **Whether the guard is ever contended.** No instrument counts waiters. If prediction 3 holds the
  question does not matter for this slice.
- **The payload cost.** Three saves and a load of 11.5 MB per settlement still happen; they now
  cost a worker thread instead of the UI. That is CR157's problem, deliberately.

## Result

*(to be completed after the run)*
