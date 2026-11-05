[< RS026](index.md)

# CR194: The Message Takes Tens of Seconds to Reach Pi

**Status:** in_progress
**Line:** 0.4 · Desktop (cause not yet placed)

## Friction

Found while closing [CR193](cr193-a-cancel-before-pi-takes-the-message-still-loses-it.md) and
captured by the Navigator on 2026-11-04 ("capture a demora como CR e puxe-a para começarmos a
investigação"). After Send, the agent shows nothing for up to 40 seconds before Pi even has the
message. It is felt on every turn, and it is why a cancel so easily fell in CR193's window.

## Measured in Production (read only, 2026-11-04)

The interval from the turn journal's `createdAt` (written inside `start_pi_invocation`) to the
user entry Pi writes in its session, for completed turns since 2026-10-20:

| Journey | Pi session | Provider | Median |
|---------|-----------:|----------|-------:|
| `mirror-desktop` | 182 MB | claude-bridge | 42 s |
| `alissonvale-com` | 202 MB | openai-codex | 33 s |
| `livro-lideranca-soberana`, `89-livros` | 56 MB | openai-codex | 15 s |
| `vida-economica` | 4 MB | openai-codex | 7 s |
| `hb20s`, `suporte-softwarezen` | ≤ 1 MB | openai-codex | 2 s |

The time grows with the Journey and stays stable within it; it does not follow the provider. The
renderer's work before `start_pi_invocation` is not in these numbers, so the wait the person sees
is longer still.

One turn traced end to end (`mirror-desktop`, 23:40): journal created at `:04.2`; the Core's
embedding call for the turn finished at `:07.6` (`llm_calls`, 1 s); Pi wrote the user entry at
`:40.4`. The journal reaches `running` about 1 s after creation.

## Ruled Out (each measured on a clone, nothing in production touched)

- **Reading and parsing the session:** the 174 MB file reads in 0.1 s and parses in 1 s; the
  native `project_active_pi_branch` that `latest_pi_leaf_entry_id` runs takes 0.8 s.
- **Pi itself:** the app's Pi 1.4.0 on a copy of the session, with a fake local model, writes the
  user entry 2.5 s after start (1.7 s on an empty session); 3.6 s with the app's Anthropic provider
  extension and the Mirror context extension; 3.7 s with a copy of the real `~/.pi/agent`; 2.2 s
  run inside the 20 GB `mirror-desktop` repository.
- **The Core's context delivery:** `deliverMirrorContext` on a clone of the home's database, for
  this session, with fake providers: 4.5 to 6.5 s.
- **Journey attachments:** `mirror-desktop` has none.

Together these account for about 10 s of the 40.

## Open

The remaining 30 s happen only in the running app, between the Core's answer and Pi writing the
message. Candidates not yet measured there: the host bridge request around the Core call, the
steps of `run_pi_process_unguarded` between `prepare_turn` and the prompt write, the Pi child
started from the app (its environment, stdin, its reading of stdout), and anything the renderer
does in that window that the worker may wait on.

## Instrumented on `main` (`a96ed07a`)

`src-tauri/src/turn_start_timing.rs` times the start of every turn in the Pi worker. Each phase is
named by the step that ends it and spans from the previous mark:

| Phase | Ends when |
|-------|-----------|
| `admission` | the turn journal admitted the turn (debt materialized, record created) |
| `worker_start` | the worker thread runs |
| `session_baseline` | the session's leaf before this turn is read (`latest_pi_leaf_entry_id`) |
| `journal_running` | the journal moved to `running` |
| `extensions` | the global Pi extensions are resolved |
| `mirror_context` | the Core answered `deliverMirrorContext` |
| `workspace` | the session is anchored to the Journey's folder |
| `spawn` | the Pi child started |
| `prompt_write` | the prompt is written to Pi's stdin |
| `first_output` | Pi's first stdout line arrived |
| `agent_start` | Pi started its agent: it has the message |

One record per turn, `"kind": "turn_start"`, goes into the Journey's `settlement-timings` ledger
when Pi starts its agent, or with `outcome: "ended_before_agent_start"` when the worker ends first.
A failed write is said on stderr and never fails the turn. The clock starts once the command holds
the native serialization lock, which `native_command_serialization` requires to be taken first; the
production window measured above starts after that lock too.

Spec first: 5 tests (phases as intervals, first mark wins, taken once, accepted by the ledger, the
worker's marks in order); 6 mutations, all caught. `cargo test` 481, `vitest` 2,632, `tsc` clean.

Cost: the ledger keeps 256 records, so with a start record per turn it now holds about half as many
settlements per Journey.

### Checked in development (2026-11-04)

The development home (`ensaio-5c-2`) has no large session: its only started Journeys are
`vida-interior` and `vida-tecnica`. Two turns in `vida-tecnica` each wrote a complete record:

| Phase | Turn 1 (ms) | Turn 2 (ms) |
|-------|------------:|------------:|
| `admission` | 51 | 53 |
| `session_baseline` | 7 | 9 |
| `journal_running` | 47 | 55 |
| `mirror_context` | 6,008 | 5,561 |
| `first_output` | 1,771 | 2,110 |
| everything else | < 10 | < 15 |
| **total** | **7,904** | **7,813** |

The instrumentation works. On a small session the Mirror context already takes 6 s, and Pi about
2 s more. The large-session gap is only visible in production, which needs a release.

### Measured in production on v0.4.0-alpha.3 (2026-11-05)

Seven turns, every phase under 200 ms omitted:

| Journey | Total (s) | `session_baseline` | `mirror_context` | `first_output` |
|---------|----------:|-------------------:|-----------------:|---------------:|
| `mirror-desktop` | 38.7 | 0.95 | 6.2 | 31.4 |
| `mirror-desktop` | 36.8 | 0.95 | 4.9 | 30.8 |
| `mirror-desktop` | 41.5 | 0.94 | 2.7 | 37.7 |
| `mirror-desktop` | 43.0 | 0.93 | 5.2 | 36.7 |
| `alissonvale-com` | 36.4 | 0.94 | 4.9 | 30.4 |
| `alissonvale-com` | 29.9 | 0.96 | 2.9 | 25.8 |
| `alissonvale-com` | 37.5 | 0.99 | 5.5 | 30.8 |

**The wait is inside Pi.** From the prompt written on its stdin to its first output line
(`agent_start`, 8 ms later) takes 26 to 38 s, about 85 % of the start. The app's native steps take
about 1 s together, and the Mirror context 3 to 6 s. Pi on a clone of the same session, with a fake
model, reached its answer in 2.5 to 3.7 s, so the in-app difference is in how the app runs Pi
(arguments, extensions, environment, working directory), not in the session's size alone.

### Cause: a global extension rereads the whole session on start (2026-11-05)

A harness outside the app (`/private/tmp/cr194/bin/run.mjs`) starts Pi exactly as
`run_pi_process_unguarded` does (bundled Node and Pi 1.4.0, `--mode rpc --session <clone>
--no-approve --no-extensions`, the Anthropic fork, the three `npm:` packages of
`~/.pi/agent/settings.json`, `mirror-context.mjs`, the same environment and working directory),
with a provider whose endpoint refuses at once, and writes the same two RPC lines. On a clone of
the production `mirror-desktop` session (167 MB):

| Run | Prompt to `agent_start` |
|-----|------------------------:|
| exactly as the app | 40.9 s |
| without every extension | 2.3 s |
| without `pi-claude-bridge`, `pi-gmail` or the Anthropic fork (each alone) | 41 to 43 s |
| **without `pi-agent-browser-native` 0.9.6** | **3.5 s** |
| as the app, small session | 2.4 s |
| as the app, `pi-agent-browser-native` **0.9.16** instead | 5.1 to 8.2 s |

A CPU profile places 30 s in the extension's `session_start` restore (`readBrowserEntries` →
`scanJournalMetadata` / `journalRanges` / `projectJson`): it rereads the whole session journal
through a token-by-token JSON projector to restore browser state. Pi waits for `session_start`
handlers before it takes the prompt, so the wait grows with the session, whatever the provider.
Upstream 0.9.10 to 0.9.16 (2026-11-02/03, #303, #306, #309) frame records natively and validate
small ones with native JSON.

This is not Nautilus code: the package is the Navigator's global Pi extension, which Nautilus loads
because a Desktop turn carries the person's global extensions (CV-010.DS-005 slice 2e).

### Extension updated (2026-11-05)

By the Navigator's word, `~/.pi/agent/npm` now has `pi-agent-browser-native` 0.9.16 (the previous
`package.json` and `package-lock.json` are kept in `/private/tmp/cr194/npm-backup-20261105-003540`).
npm skipped one new dependency's install script (`protobufjs`), as it does by default. The
harness, with the installed package, on a fresh clone of the same 167 MB session: 5.4 s and 4.9 s
from the prompt to `agent_start`, down from 40.9 s.

## Next

1. Read the production `turn_start` records of the next `mirror-desktop` turns.
2. Separately: the Mirror context's 3 to 6 s per turn.

Earlier plan (done): record the start of a turn phase by phase, as `settlement-timings`
already does for its end (journal running, context requested and answered, child spawned, prompt
written, first Pi event, agent start), check it in development against a large session, then read
it in production. The fix follows the measurement.
