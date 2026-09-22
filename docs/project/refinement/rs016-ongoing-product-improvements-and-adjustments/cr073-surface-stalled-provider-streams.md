[< RS016](index.md)

# CR073: Surface Stalled Provider Streams

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Observed by the Navigator on 2026-09-22 while homologating CR054. With a turn
already streaming, the network was disconnected. The Pi process did **not**
die: the response stopped mid-flight and the run stayed in `Working`
indefinitely, with no output, no error and no change of state. The only way
out was manual cancellation.

Durable evidence of that run:

```json
{"phase":"interrupted","terminalOutcome":"cancelled","cancellationIntent":"requested"}
```

The turn therefore ends as a user cancellation, which is truthful about what
happened but says nothing about why the user had to intervene.

## Why This Is Not CR054

CR054 covers a provider failure that terminates the invocation: the process
dies, and its reported reason is now retained as durable evidence. A stall is
the opposite shape — the process is alive and healthy, the provider simply
stopped producing. No terminal outcome is ever reached, so no failure evidence
exists to surface.

It is also not CR070: the message did reach the agent.

## Expected Behavior

- A run that produces no output for a bounded period while claiming to work is
  distinguishable from a run that is genuinely working.
- The user learns that the stream stalled, without the app inventing a cause it
  cannot observe.
- Cancellation stays the user's decision; the app must not silently kill or
  restart the invocation, and must not retry the provider.
- If the stream resumes, the notice disappears without side effects.

## Open Questions

- Which signal is authoritative for "no progress": absence of stdout lines,
  absence of assistant tokens, or Pi-level heartbeat if one exists.
- Whether the threshold is fixed or derived from observed streaming cadence,
  given that long tool calls and deep thinking legitimately produce silence.
- Whether a cancellation following a detected stall should record that context
  in the journal, so the interruption notice can explain the stall afterwards
  instead of reporting a bare cancellation.

## Exclusions

- No automatic cancellation, restart or provider retry.
- No fabricated provider error text.
- No change to cancellation authority or to Pi JSONL transcript authority.

## Authority Boundary

Captured only. Selecting, assigning Driver/Delivery, implementing, pushing,
merging, publication and release remain separate Navigator decisions.
