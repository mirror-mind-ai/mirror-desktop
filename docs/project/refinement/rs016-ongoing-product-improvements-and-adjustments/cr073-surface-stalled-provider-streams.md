[< RS016](index.md)

# CR073: Surface Stalled Provider Streams

**Status:** dismissed
**Driver:** —
**Delivery:** —

## Dismissal (2026-09-22)

Dismissed by the Navigator after direct retesting: **this is not a defect.**

Losing network connectivity mid-turn does not kill the Pi process and does not
hang the turn. The process waits for connectivity, **resumes the response
automatically when the connection returns**, and cancellation stays available
to the user throughout.

In that light `Working` is literally truthful — the run is in progress,
waiting — and there is no deadlock, because an exit always exists and belongs
to the user.

## Why the Original Capture Was Wrong

The capture below inferred an indefinite hang from an incomplete observation:
in the first test the run was cancelled *before* the connection returned, so
the automatic recovery was never seen. The recorded journal outcome
(`cancelled` with `cancellationIntent: requested`) was therefore the faithful
record of a user cancellation, not evidence of a stuck run.

This document is kept rather than deleted so that a future session observing a
response pausing during a network drop does not recapture the same false
defect.

## Original Capture (superseded)

Observed while homologating CR054: with a turn already streaming, the network
was disconnected. The response stopped mid-flight and the run stayed in
`Working` with no output, no error and no change of state. Durable evidence of
that run:

```json
{"phase":"interrupted","terminalOutcome":"cancelled","cancellationIntent":"requested"}
```

The capture proposed distinguishing a stalled stream from a working one, with
open questions about which signal would be authoritative for "no progress" and
how to avoid misreading legitimate silence from long tool calls or deep
thinking. Retesting made the question moot: the silence is legitimate waiting,
and it ends on its own.

## Relationship

Distinct from [CR054](cr054-surface-provider-terminal-errors-in-the-gui.md),
which covers an invocation that genuinely terminates and whose provider reason
is now retained as durable evidence.
