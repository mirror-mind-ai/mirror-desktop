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

## Next

Measure instead of guess: record the start of a turn phase by phase, as `settlement-timings`
already does for its end (journal running, context requested and answered, child spawned, prompt
written, first Pi event, agent start), check it in development against a large session, then read
it in production. The fix follows the measurement.
