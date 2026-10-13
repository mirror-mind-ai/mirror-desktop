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

## Result — the friction is resolved

**Navigator, 2026-10-13: *"Deu certo. Agora resolveu."***

Seven settlements ran on `alissonvale-com` between `19:43:33Z` and `19:56:26Z`, all `settled`, all
19 phases, depth-0 phases accounting for ~100% of each window. `native-panics.jsonl` absent. The
turn journal holds 64 records with **`running: 0`** — no deadlock, no stranded turn.

### Prediction 1 — met

Typing is fluid during `Finishing`, in the finishing Journey and in the others. One cause, both
symptoms, as the mechanism required.

### Prediction 3 — met, and it is the strongest evidence here

| | ms |
|---|---|
| 240 historical `settled` records | p10 **4,032** · p50 **5,584** · p90 **8,406** |
| the 7 new records | min **5,673** · p50 **6,640** · max **7,207** |

**All seven sit inside p10–p90, at percentiles 52 to 86.** The settlement takes exactly as long as
it always did.

That is the cleanest confirmation the diagnosis could have had. **The freeze disappeared while the
duration did not change at all** — because the duration was never the symptom. The main thread being
unavailable was. A repair that had also made settlements faster would have left the mechanism
ambiguous; this one separates the two cleanly.

**A correction to my own first reading:** against the three pre-slice records (5,887 / 6,303 /
5,984, median 5,984) the new median of 6,640 looks 11% slower, and I was ready to report it as
*"slightly slower, probably noise"*. Against 240 records it is the middle of the distribution. Three
samples were the wrong baseline, and the right one was already on disk.

### Prediction 4 — met

Every settlement produced a complete record, and the conversation list, drafts, preferences and
settings all cross converted commands now. Nothing failed.

### Prediction 6 — met

No panic file, no command that failed to return, `running: 0`.

### Prediction 2 — NOT COLLECTED

The instrument-level falsifier — a second `sample` showing the main thread idle during a settlement
— **was not taken**, because Eval was already closed when the result came in. So the *mechanism* is
confirmed by the first measurement plus the outcome, not by an after-measurement. It remains
available at any time for 60 seconds, and it is the only way to quantify how much main-thread time
was actually freed.

### Prediction 5 — not exercised

The ten kept commands (dialogs, external links, revealing artifacts) were not used during the run.
Test-covered, not field-exercised.

### What the phase mix says about CR157

Unchanged, as expected — the work moved threads, not shape:

| | share of the 6,265 ms record |
|---|---|
| outbox (`deliver` + `enqueue` + `acknowledge`) | **52.4%** |
| projection (`save` + `save_post_frontier`) | **26.6%** |

[CR157](../project/refinement/rs016-ongoing-product-improvements-and-adjustments/cr157-stop-moving-the-whole-conversation-through-every-settlement.md)'s
premise is intact, and the outbox path is still the larger and still undecomposed half.
