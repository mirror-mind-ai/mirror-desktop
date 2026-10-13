# CR149 main-thread measurement — 2026-10-13

**Kind:** measurement record. The cause of the `Finishing` stall, established by sampling the
application's main thread and correlating it with the settlement timing ledger.

After four refuted repairs in the renderer, this is the first measurement taken in the right process.

## Instrument

```
sample 60787 180 10 -file /tmp/eval-main-sample.txt
```

Eval `11216a6978789fefa742b4ed6b3fa0c0cc67caddc658210117a5a5984d456658`, pid 60787, 180 s at 10 ms,
**16,284 samples per thread**. Window 19:06:19Z–19:09:19Z. Journey `alissonvale-com`, whose
projection is **11,491,284 bytes**. `sample` needed no `sudo`.

The Navigator sent one turn inside the window and typed continuously through `Finishing`.

## The main thread

| samples | share | frame |
|---|---|---|
| 12,906 | **79.3%** | `__CFRunLoopServiceMachPort` → `mach_msg2_trap` — idle, waiting for events |
| 2,385 | 14.6% | `__CFRunLoopDoSources0` — run-loop work |
| 2,254 | 13.8% | `WTF::RunLoop::performWork` |
| 1,903 | 11.7% | `IPC::Connection::dispatchIncomingMessages` |
| **1,450** | **8.9%** | **`WebKit::WebPageProxy::startURLSchemeTask`** |
| 1,428 | 8.8% | `wry::wkwebview::class::url_scheme_handler::start_task` |
| 1,368 | 8.4% | `tauri::ipc::protocol::get::{{closure}}` |
| 1,366 | 8.4% | `tauri::webview::Webview::on_message` |
| **1,342** | **8.2%** | nine generated command closures inside `main` — **98.2% of `on_message`** |

**1,450 samples is 14.5 seconds of main-thread time inside Tauri's IPC handler**, and essentially all
of it is command handlers rather than protocol overhead. Argument deserialisation is inside those
closures, so it is part of the 1,342.

### Self time

`_platform_memmove` 435 (2.7%), `read` 278, `serde_json::read::SliceRead::skip_to_escape` 123,
`__fcntl` 116 (this is `File::sync_all`), `nanov2` malloc/free 233 combined,
`core::str::from_utf8` 66, `serde_json::ser::format_escaped_str` 53, `parse_str` 30,
`parse_escape` 25.

Read a file, parse JSON, re-serialise JSON, write and fsync — on the thread AppKit uses to deliver
key events to every window of the process.

### Which commands

| samples | command |
|---|---|
| 194 | `append_mirror_outbox_item` / `run_mirror_append_with_binding_repair` |
| 187 | `inspect_dedicated_pi_transcript` |
| 151 | `enqueue_mirror_append_item` |
| 131 | `reconcile_pi_backed_mirror_delivery_debt` |
| 81 | `validate_post_frontier_outbox_authority`, `transition_turn_journal` |
| 76 | `save_dedicated_journey_conversation`, `pi_backed_enqueue_item` |
| 75 | `project_active_pi_branch` |
| 73 | `refresh_conversation_segments` |
| 71 | `validate_outbox_generation_authority` |
| 61 | `create_pi_backed_mirror_append_item` |
| 45 | `acknowledge_mirror_append_item`, `project_conversation_segment_manifest` |

## The correlation that closes it

The ledger's newest record sits inside the sample window:

**`2026-10-13T19:07:27.887Z` → `19:07:33.871Z`, 5,984 ms, `settled`, 19 phases.** Depth-0 phases sum
to **5,981 ms — 99.9% of the window.**

| phase | ms | share | the command the sample caught |
|---|---|---|---|
| `deliver_outbox_item` | 1,585 | 26.5% | `append_mirror_outbox_item` 194 |
| `enqueue_outbox_item` | 1,029 | 17.2% | `enqueue_mirror_append_item` 151 |
| `save_post_frontier_projection` | 900 | 15.0% | `save_dedicated_journey_conversation` 76 |
| `save_projection` | 657 | 11.0% | — same command |
| `acknowledge_outbox_item` | 616 | 10.3% | `acknowledge_mirror_append_item` 45 |
| `advance_journal` | 536 | 9.0% | `transition_turn_journal` 81 |

**The ledger and the sample are measuring the same work from two sides** — the renderer's
`await invoke()` wall time, and the main thread's stack. The phases account for the entire
settlement, and the sample proves they run on the main thread.

So: **about six seconds of main-thread blocking per settlement**, in individual blocks of 100 to
1,600 ms. A 1,585 ms block is a 1.6-second freeze with no event delivery to any window.

## Why this is all four symptoms at once

- **"The whole app"** — the main thread serves every window, so nothing is specific to the Composer.
- **"A `Finishing` in one Journey freezes all the others"** — one main thread per process. The
  blocked resource is not per-Journey and cannot be.
- **"Letters stop and arrive all at once"** — AppKit cannot dispatch key events while a delegate
  callback is running. They queue in the event queue and are delivered when the thread returns.
- **"Typing takes several seconds to respond"** — the duration of one command, not of a frame.

And why the renderer repairs could not help: **they were in the WebContent process, and so was the
instrument.** The Web Inspector cannot see this thread. The long JavaScript tasks it found were real
and removing them was correct, but the floor was always in a process the profile could not observe.

## Two predictions of mine that the measurement corrected

1. **I named the wrong entry point.** I predicted `userContentController:didReceiveScriptMessage:`.
   That frame has **zero samples**. Tauri 2 delivers IPC through a custom URL scheme, so the entry is
   `WKURLSchemeHandler` → `wry`'s `url_scheme_handler::start_task`. The conclusion is unchanged —
   both are AppKit delegate callbacks on the main thread — but I asserted a path I had not confirmed,
   and the right one was in the output of my own earlier grep.

2. **I named the wrong dominant cost.** I predicted three 11.5 MB projection saves. Those are
   `save_projection` + `save_post_frontier_projection` = **1,557 ms, 26.0%** — real, but not
   dominant. The Mirror outbox path is: `deliver` + `enqueue` + `acknowledge` = **3,230 ms, 54.0%**.
   That matters for sequencing, because it means the payload-size work is the *second* repair, not
   the first.

## What is still not established

- **The 14.5 s of command work is an aggregate over 180 s, not a timeline.** The correlated
  settlement accounts for ~6 s of it; the rest is command work during streaming
  (`inspect_dedicated_pi_transcript`, `refresh_conversation_segments`, `project_active_pi_branch`).
  Streaming feels fine because that work is spread out, not concentrated — **but that is an
  inference from the shape of the two datasets, not a measured timeline.**
- **Whether making these commands async removes the freeze.** The mechanism says it should; nothing
  has been measured after a change, and this CR has already shipped four structurally-correct
  repairs at unmeasured causes.
- **Whether concurrency is safe once they are off the main thread.** The main thread was serialising
  every sync command — an accidental global mutex. The hot commands do take
  `State<'_, MirrorAppendOutboxState>` and do acquire a lock, so concurrency is already
  contemplated, and all of them return `Result`, which is what the macro requires for a reference
  input. **That is necessary, not sufficient**, and it is the first thing to verify in
  implementation rather than to assume here.

## The mechanism, from the Tauri source

- `tauri-macros` generates `body_blocking` for any command that is not `async`: the function is
  called **inline on the calling thread**, which is the URL-scheme delegate callback.
- With `#[tauri::command(async)]` on a sync function, the macro reports kind `sync_threadpool` and
  generates `body_async`, whose argument expressions are evaluated **inside** the
  `respond_async_serialized(async move { … })` block. **So the attribute moves argument
  deserialisation off the main thread together with the body** — which matters here, because the
  payload is megabytes of JSON.
- **80 of this app's 91 commands are sync.** The 11 that are already async are the long provisioning
  and voice commands, so the idiom is established in the codebase.
