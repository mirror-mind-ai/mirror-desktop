# CR149 field verification — 2026-10-12

**Kind:** field verification record for CR149
**Written before the run.** Every prediction and falsifier below was committed before the Navigator
touched the application.

CR149 removed a root-level 1 Hz clock that re-rendered the whole application during `Finishing`. The
repair shipped on structural grounds. **Whether it fixes the typing lag is the open question**, and
it cannot be answered by me: typing in the application is the Navigator's act.

## Builds

| build | binary sha256 | where |
|---|---|---|
| **with CR149** | `97cdf93d72026530e67556dfaf0f26dc321aee03c5070b6d34fa7fb2c509bd6e` | `/Applications/Mirror Desktop Dev.app` |
| **without CR149** (alpha.47 + CR147 + CR146) | `8329e4a427e9c41f0331e4a3006df7b9ef1375d0f362b0655df11e4636e9e5c6` | `/tmp/Mirror Desktop Dev-20261012-194900.app` |

Both report `0.2.0-alpha.47`. **Only the hash distinguishes them.**

## Pre-state, read with the app closed

| store | value |
|---|---|
| `turn-journal/mirror-desktop.json` | **63** records — settled 53, interrupted 10, **running 0** |
| `settlement-timings/mirror-desktop.json` | **21** records, all `settled` |
| last settlement | 2,577 ms over 20 phases, `2026-10-12T19:06:59.226Z` |
| working conversation `…18d5cf4842b669b0` | **32** messages (15 `user-`, 15 `assistant-`, 2 `pi-`), **17** turns (15 committed, 2 pending) |
| `native-panics.jsonl` | **absent** |

## The protocol

The lag happens during `Finishing`, which in this Journey lasts 1.6–3.0 s across ten measurements.
That is the window, and it is reachable on any turn.

1. Open the Dev app on the `mirror-desktop` Journey.
2. Send any short turn.
3. **From the instant the answer finishes appearing, type continuously in the Composer** until the
   `Finishing` indicator clears. Type enough words to notice a stall.
4. Report: did the typing stall, stutter or feel heavy during that window?

### The A/B, if step 4 is ambiguous

If the answer is *"I think it's better but I'm not sure"*, that is not a result. In that case:
quit the app, run `/tmp/Mirror Desktop Dev-20261012-194900.app` (the build **without** CR149),
repeat steps 2–3 **with the identical protocol**, and compare. Keeping the protocol unchanged between
runs is the whole point — a changed protocol makes the comparison worthless.

**Do not run both builds at once.** They share the same data directory.

## Predictions and falsifiers

### 1. The typing lag during `Finishing` is gone — the only prediction that matters

**Falsified if** typing still stalls during `Finishing` on the CR149 build.

**That outcome is a real result, not a failure.** It would mean the root clock was not the cause.
The structural repair still stands on its own grounds, and the next candidates are already named in
CR149's debt: `strandedTurnTick` (15 s) and `relativeTimeNow` (60 s), plus whatever else re-renders
on `composerTurnStatus === "finishing"`. **This prediction is the reason the mechanism was written
as a hypothesis rather than asserted.**

### 2. A healthy turn is completely unaffected

**Falsified if** the journal does not reach **64** records with `running: 0`, or timings do not reach
**22** records with every outcome `settled`, or the settlement duration falls outside the prior
distribution of 1.6–3.0 s. *(A number, not an impression — "felt fine" is not a measurement.)*

### 3. The `Finishing` label still names its phase

**Falsified if** the `Finishing` indicator stops showing its phase name after ~3 s. That label is
driven by `ComposerRuntimeStatus`'s own clock, which CR149 did not touch — so a regression here would
mean the change reached further than its diff suggests.

### 4. The conversation gains exactly one clean pair

**Falsified if** the working conversation does not reach exactly **34** messages with prefixes
16 `user-` / 16 `assistant-` / **2 `pi-`**, or if the two existing `pi-` messages change at all.
CR146's repair must stay intact; the two pending turns must stay pending and untouched.

### 5. Nothing panics

**Falsified if** `native-panics.jsonl` appears. CR147 created it precisely so a recurrence leaves a
record, and its absence is the expected reading.

## What this run cannot establish

- **The abandonment notice itself.** It appears only after 60 s of `Finishing`, and no settlement in
  this Journey has ever come close — the longest recorded is 41,741 ms, and the last ten ran 1.6–3.0 s.
  **Provoking it is not schedulable.** Its correctness is held by 14 component tests and CR132's 14
  unmodified guards, and that is the honest bound.
- **The act's call-time guard.** Reaching it requires the notice first. Test-only by construction.
- **Any quantitative latency figure.** The measurement is the Navigator's perception. The A/B exists
  precisely because a perception compared against another perception under an identical protocol is
  worth more than a perception alone.

## Result — prediction 1 FALSIFIED (2026-10-12)

**Navigator report, after reproducing in the Eval channel on a large production conversation:**
*"Consegui reproduzir o problema no eval e a lentidão no finishing ainda permanece."*

**The root 1 Hz clock was not the cause.** The hypothesis written in CR149 is refuted by the field,
which is exactly what prediction 1 was written to be able to say.

### What the run established

| | |
|---|---|
| Channel | Eval (`ai.mirrormind.desktop` — production's own data directory and Mirror binding) |
| Build | `6c1973b690efae1be7464c5f93a8d0dbb30b29a3c579a2406e6423ea6bd1062b`, alpha.47 + CR149 |
| Conversation | a large production conversation, which is the condition Dev could not supply |
| Outcome | **typing during `Finishing` is still slow** |

### What it did NOT establish

- **Whether CR149 improved anything at all.** There is no A/B in Eval: the retained comparison build
  is a *Dev* build and points at Dev data, so it cannot serve. *"Still slow"* refutes *"the lag is
  gone"* and says nothing about *"less slow"*.
- **Predictions 2 to 5 were not collected.** The durable stores were not read, because reading them
  requires the app closed and the investigation moved on. They remain uncollected rather than passed.

### Why the refutation was worth more than a confirmation

A passing run would have closed CR149 on a mechanism that is now known not to be the cause, and the
Navigator's friction would have been reported as fixed while they kept feeling it. **The falsifier
was written before the run precisely so this outcome could be believed**, and the structural repair
that shipped stands on its own grounds — it was justified without the performance claim, and that
justification is unchanged.
