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

## Next

Measure instead of guess: record the start of a turn phase by phase, as `settlement-timings`
already does for its end (journal running, context requested and answered, child spawned, prompt
written, first Pi event, agent start), check it in development against a large session, then read
it in production. The fix follows the measurement.
