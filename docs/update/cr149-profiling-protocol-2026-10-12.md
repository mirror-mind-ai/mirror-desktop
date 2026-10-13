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

## Result

*(to be completed after the run)*
