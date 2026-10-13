# CR149 profiling protocol — 2026-10-12

**Kind:** experiment protocol for CR149
**Written before the run, with its report specified in the same breath.** This project lost one
experiment already by specifying the procedure and not the report.

Three hypotheses about this friction have been refuted. This run exists to **stop nominating causes
and name one**, so the protocol is built around producing a machine-readable artifact rather than an
impression.

## Why not `tauri:user`

The previous turn nominated `npm run tauri:user`. **That was the wrong instrument and is withdrawn.**
It runs `tauri dev`, which compiles Rust in the **debug** profile — and `Cargo.toml` declares no
`[profile]` overrides, so debug is genuinely unoptimized. Profiling it would measure a build nobody
runs, and the open question is specifically whether time is being spent on the native side.

## The instrument

The **evaluation channel** now carries `tauri/devtools`:

```toml
evaluation-channel = ["tauri/devtools"]
```

That gives release-optimized Rust, the Navigator's real data, and a Web Inspector in the same
bundle. Production cannot acquire it, and both halves of that are asserted rather than trusted:

| guard | where | what it pins |
|---|---|---|
| `the_default_build_cannot_open_devtools` | `runtime_channel.rs` | `cargo test` compiles with the default feature set — the same set production is built with — and fails if `devtools` is in it |
| `devtools_is_enabled_only_by_the_evaluation_channel` | `runtime_channel.rs` | exactly one feature enables it, and it is `evaluation-channel` |
| `asks for the evaluation feature only on routes that never ship` | `runtimeChannelConfiguration.test.ts` | only `build-eval` and `install-eval` pass `--features`; `user` and `build-user` pass none |

**Build in place:** `~/Applications/Mirror Desktop Eval.app`, `0.2.0-alpha.47`, binary
`a65628b8b67837989d4d66eb5d072cd2240ad79fea517161e46634c67bad4078`. The previous Eval without
devtools was `6c1973b690efae1b…`; only the hash distinguishes them.

## The run

**Production must be closed first, and Eval must be closed before production reopens.** They share
`ai.mirrormind.desktop`. Closing production is the Navigator's act.

1. Quit **Mirror Desktop** (production).
2. Open **Mirror Desktop Eval**.
3. Open the same large conversation that reproduced the stall.
4. Right-click anywhere in the window → **Inspect Element**. The Web Inspector opens.
5. Go to the **Timeline** tab. Leave the default instruments on.
6. Press **record**.
7. Send a short turn. **From the moment the answer finishes appearing, type continuously** until the
   `Finishing` indicator clears.
8. **Stop recording** a second or two after `Finishing` clears.
9. Quit Eval. Reopen production.

Keep the recording short — one turn. A ten-minute capture buries the window in noise.

## The report, specified now

### Preferred: the export, which I analyse myself

In the Timeline tab there is an **export** control (an arrow icon near the recording controls) that
writes the whole recording as JSON. **Save it anywhere and tell me the path.** That is strictly
better than any summary, because it lets me read the main thread directly instead of reading a
description of it.

### Fallback, if the export is not available

Two screenshots:

1. The **Timeline overview** for the whole recording, so the `Finishing` window is visible as a
   block of activity.
2. The **JavaScript & Events** list sorted by **total time**, top ~15 rows.

Plus one sentence: whether the stall you felt lines up with the busiest part of the chart.

## What each outcome means — decided before the data arrives

The single thing this recording has to settle is **whether the main thread is busy or idle during the
stall**. Three outcomes, three different repairs:

| if the recording shows | then the contention is | and the repair is |
|---|---|---|
| **A.** long continuous JS tasks through the `Finishing` window | in the renderer | find the function; the memo defeat and the two O(n) transcript passes become live candidates again |
| **B.** a largely **idle** main thread with long gaps between `invoke` resolutions | native, or in the IPC transport | a native-side repair; **the renderer findings are then irrelevant to this friction** and must not be shipped as its fix |
| **C.** long JS tasks that are **not** in the settlement path | something running alongside settlement | identify it; the uniform multiplicative inflation across all 14 phases already fits a background hog better than it fits any single phase |

**C is the outcome I would bet on and the reason I am not acting on a bet.** The measured shape —
every awaited operation inflated in proportion, `load_journal` at 27 ms on one turn and 3,109 ms on
another against the same file — fits a parallel consumer of the main thread far better than it fits
any phase's own work.

If the recording is ambiguous between A and B, that is also a result: it means one turn is not enough
and the next step is a second recording, not a repair.

## Known limits

- **The recording itself costs something.** Web Inspector's instrumentation slows the page, so
  absolute durations from this run are not comparable to the 779-record ledger. **The shape is what
  matters here, not the magnitude** — which of A, B or C, not how many milliseconds.
- **One turn, one conversation.** The ledger shows the same Journey producing 3 s and 16 s
  settlements, so a single recording may land on a fast turn. If the stall does not occur during the
  recording, the recording is void — say so rather than reporting what a quiet window looked like.
- **This writes real turns into real data**, exactly as the earlier Eval run did. The build differs
  from production's by the devtools feature and CR149's renderer change.
- **No prediction is being registered about the cause**, deliberately. Three have been registered and
  three have been refuted; a fourth before the measurement would be the same reflex that produced
  them.

## Result — outcome A, with the function named (2026-10-12)

Export analysed from `/Users/alissonvale/Desktop/localhost-recording.json`, 445,545,373 bytes.
Recording spans **44.318 s → 146.315 s** (102 s), 43,930 timeline records, 8,210 CPU samples
totalling 8,855 ms of sampled main-thread time.

**Outcome A: long JavaScript tasks in the renderer.** Not B — the main thread is not idle. The
contention is named below.

### The stall is visible as discrete multi-hundred-millisecond blocks

14 script tasks exceed 100 ms, summing **7,696 ms**:

| recording-relative | duration | kind |
|---|---|---|
| 44.1 s | **2,927 ms** | `event-dispatched` |
| 51.8 s | 545 ms | `event-dispatched` |
| 48.9 / 49.8 / 51.2 s | 464 ms each | `event-dispatched` |
| 50.4 / 54.3 / 64.8 s | 439–458 ms | `event-dispatched` |
| 41.6 / 49.5 s | 278 / 292 ms | `microtask-dispatched` |

A single **2.9-second** block, then a run of **~450 ms blocks** through the s=47–55 window. **That
cadence is the stall**: the main thread is unavailable in half-second chunks, which is what typing
into a blocked thread feels like, and it is also why every awaited settlement operation inflated —
including the ones with trivial payloads.

The window s=41–55 holds **7,209 ms of the recording's 10,809 ms of script time (67%)**, and the
sampled total (8,855 ms) is close to the script total, so **the aggregate sample composition is
substantially the composition of this window.** Second 44 alone carries 2,930 ms of script and
3,875 ms of layout. The recording also contains **26,663 paint events**.

### 76.8% of sampled main-thread time is inside React rendering

Minified frames resolved against the exact bundle the recording names,
`dist/assets/index-BEEmZbzC.js`, which is still on disk:

| symbol | share (total) | identified as |
|---|---|---|
| `Ou` | **76.8%** | React `performWorkOnRoot` — identified by its own `Error(327)` invariant and `expiredLanes` |
| `Se` | 74.4% | React synchronous render entry (`at \|= 2`, work-in-progress root and lanes) |
| `xt` | 74.4% | React `performUnitOfWork` — `n.memoizedProps = n.pendingProps` |
| `Vv` | 45.3% | React scheduler callback (`callbackPriority`, `callbackNode`) |

### The single largest identified cost is one function, and it is not guessed

| symbol | self time | share |
|---|---|---|
| `setAttribute` | 1,728 ms | 19.5% |
| `/.*(?:\n\|$)/g` | **1,568 ms** | **17.7%** |
| **`wE`** | **1,002 ms** | **11.3%** |
| `fetch` | 880 ms | 9.9% |
| `json` / `parse` / `stringify` | 477 / 243 / 219 ms | 10.6% |
| `stringSplitFast` | 179 ms | 2.0% |
| `/\n$/` | 177 ms | 2.0% |
| `/[│\|]\s*△\s+([A-Z][A-Z ]*?[A-Z])\s+[│\|]\s*$/` | 59 ms | 0.7% |

**`wE` is `collectBoxedExplorerSurfaces`.** The bundle at `L111:C667` reads
`function wE(e,t){const r=/.*(?:\n|$)/g,a=[];...}`, byte-for-byte the body at
`src/app/ImportedActivity.tsx:123`, and it is immediately preceded in the bundle by
`isConcreteSurfaceType`, exactly as in the source. **The identification is an equality, not a
resemblance.**

Every row in that table except `setAttribute`, `fetch` and the JSON trio belongs to that one
function: the line scanner `/.*(?:\n|$)/g`, the per-line `/\n$/` replace, the heading probe, and
its own body. **Together: 1,568 + 1,002 + 177 + 59 = 2,806 ms, or 31.7% of all sampled main-thread
time.**

### How it is reached, and why only during `Finishing`

```
ConversationMessageRow (per row, per render)
  → stripMirrorSurfaceBlocks(message.content)        ImportedActivity.tsx:71
     → captureMirrorSurfaces                                            :84
        → collectPatternSurfaces × 2                                :86, :92
        → collectBoxedExplorerSurfaces                                  :98
```

Nothing on that path is cached or memoized, so it runs over **every message's full content on every
row render**.

Rows are `memo`'d, so they re-render only when their props change. **During streaming the committed
messages do not change** — the arriving answer is presented through the runtime projection — so the
rows skip and the scanner never runs. **At settlement the conversation advances repeatedly**, once
per phase, so the message props change and every row re-renders, running the scanner over every
message each time. That is the asymmetry the Navigator measured with the one-minute discriminator,
and it is why **no single settlement phase dominated**: the work is not inside any phase, it is
triggered by each of them.

### The repair is surgical, and its correctness is a logical implication

`collectBoxedExplorerSurfaces` exists to find blocks delimited by `╭───╮` … `╰───╯`. It splits the
entire content into lines, allocating an object and running a replace per line, **and only then**
tests each line against `/^\s*╭[─━═]+╮\s*$/`.

A line can only match that pattern if the content contains the character `╭`. So an early return on
`content.includes("╭")` cannot change what the function captures — **this is an implication of the
function's own first test, not a performance bet** — and it makes the function O(1) for every message
that has no box-drawing characters, which is nearly all of them.

**What remains a bet is whether removing this removes the stall.** 31.7% of sampled time is the
largest identified share and not a majority; React render work and `setAttribute` remain. That
belongs in the repair's own field check, not in this document.

### What this recording does not establish

- **Magnitudes are inflated by the instrumentation**, as the protocol warned. The shares are the
  finding; the milliseconds are not comparable to the 779-record ledger.
- **`setAttribute` at 19.5% is unattributed.** It is consistent with React writing DOM during these
  renders, and no measurement here proves which renders.
- **`fetch` at 9.9%** is the IPC transport. Real, second-order, and untouched by the repair above.
- **One recording, one conversation, one turn.** The ledger shows the same Journey producing 3 s and
  16 s settlements.

