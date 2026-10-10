[< RS016](index.md)

# CR142: Stop Losing a Turn the Journal Already Answered

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

Observed on Dev, 2026-10-10, during RS024's first field attempt. A turn executed to completion and
its answer exists in exactly one place the Navigator cannot reach.

Measured read-only from `ai.mirrormind.desktop.dev`:

| Layer | State |
|---|---|
| Pi session JSONL | written |
| `turn-journal/mirror-desktop.json` | `phase: terminal_durable`, `terminalOutcome: completed`, `assistantText: "RS024-D1A 1. Falhas de rede…"` |
| `settlement-timings/mirror-desktop.json` | **no record for this run** |
| The thread's dedicated conversation | 18 messages, newest from a prior validation, **no content from this turn** |
| The thread's segments | **no content from this turn** |
| The surface | *"Working…"*, indefinitely |

The native side captured the answer and wrote terminal evidence. The renderer never recorded a
settlement, never wrote the message into the conversation, and still displays the turn as running
more than thirty minutes after it completed.

So the only durable copy of the Navigator's answer is the turn journal's `terminalEvidence`. The
conversation they are looking at does not contain it.

## What is established and what is not

**Established:** the five rows above, and that the Pi execution window closed at
`2026-10-10T17:38:42.447Z` while the journal has not been written since `17:38:42.472Z`.

**Not established:** the mechanism. The field attempt also triggered a refusal in
`piProcessEventDispatcher.register` for a sibling workspace (see **CR141**), and that refusal threw
before mutating any route, so no code path yet read connects the two. It may be independent; it may
not. **This CR must not assume CR141 is its cause.**

**Also not established:** whether this is reachable without the concurrency attempt that provoked
it. A single-workspace reproduction is the first thing to look for, because if it exists this is a
much older defect than today.

## Not CR132, and not CR129

CR132's abandonment offer did **not** appear, and it was right not to:
`settlementAbandonmentOffer` requires `ownerPhase === "finalizing"`, and the surface reads
`working`, so the renderer believes the turn is still *running*. The offer declined with
`not_finishing`. **CR132 remains unexercised** — this was not its trigger.

CR129 was captured for a settlement that *succeeds through recovery and says nothing*. This is the
sharper neighbour: a settlement that **did not happen at all** and also says nothing. They share
the silence and not the mechanism, so they stay separate and cross-referenced.

## Outcome

A completed turn's answer is never reachable only from the turn journal. Either the renderer
records it where the Navigator reads, or the surface stops claiming the turn is still running and
says what it is waiting for.

## First Investigation

1. Establish the mechanism before proposing anything. The question is whether the renderer received
   the stream's terminal events at all: the conversation has no user message from this turn either,
   which suggests nothing was persisted after the pre-send write.
2. Establish whether the journal's `recoveryDisposition: ResumeProjection` recovers this on the
   next launch. If it does, the defect is the *surface claiming "Working…"* rather than lost
   content, and that is a smaller and different CR. **Measure this before the app is restarted**,
   because a restart is the experiment.
3. Establish whether a single-workspace reproduction exists.
4. Check the dispatcher's `quarantine()` for rejected events bearing this run's authority. A
   `unknown_route` or `authority_mismatch` rejection would name the mechanism directly.
5. Establish whether the known debt *"`emit` can carry a synchronous subscriber's throw into
   settlement"* is reachable here. A throw inside the stream handler would explain both the missing
   settlement and the stuck display.

## Acceptance

- The mechanism is named, with evidence, before any change.
- A turn whose terminal evidence is durable is either projected into the conversation or surfaced as
  owing projection, with a sentence naming what is owed.
- The surface never reports `working` for a turn whose journal phase is terminal.
- The specific run observed here is either recovered or recorded as deliberately not repaired.

## Boundaries

No repair of this instance until the mechanism is established. The per-Journey event route is
**CR141**. CR129 stays separate.
