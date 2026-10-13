[< RS016](index.md)

# CR157: Stop Moving the Whole Conversation Through Every Settlement

**Status:** captured
**Driver:** —
**Delivery:** —

## Where This Comes From

CR149's main-thread measurement
([cr149-main-thread-measurement-2026-10-13.md](../../../update/cr149-main-thread-measurement-2026-10-13.md)).
CR149 moved the settlement's commands off the main thread, which is what the freeze needed. It did
not change what those commands do, and what they do is the cost this CR names.

## The Cost

A settlement on `alissonvale-com` — projection **11,491,284 bytes**, `mirror-desktop` is 14.2 MB —
runs `save_projection`, `save_post_frontier_projection` and `save_durable_projection`, and
`load_persisted_projection`. Each save sends the **entire conversation** as one JSON string across
the IPC, where the native side parses it into a generic `serde_json::Value`, validates authority,
re-serialises it and writes it with `fsync`. In the measured settlement those four phases were
**1,557 ms of 5,984 ms (26.0%)**, and the self-time was `memmove`, `read`, `serde_json` escape
handling and `fcntl`.

This is a design cost, not a bug. It survives CR149's thread move: the renderer still pays a
`JSON.stringify` of the whole conversation per save, the IPC still marshals megabytes, and a worker
thread is now held for the duration instead of the UI.

The outbox path (`deliver` + `enqueue` + `acknowledge`, **54.0%**) is larger and is *not* obviously
payload-bound; its cost has not been decomposed and may be a different CR.

## Outcome

A settlement's persistence cost grows with what the turn added, not with how long the conversation
is.

## First Investigation

1. **Decompose the save.** Measure, in Rust, parse / validate / serialise / write for one 11.5 MB
   save, so the repair is aimed at the measured part rather than at "the payload".
2. **Establish whether the three saves are three different contents** or one content written three
   times under three names. The settlement model
   ([settlement-durable-state-model.md](../../../architecture/settlement-durable-state-model.md))
   says what each is for; the ledger says what each costs.
3. **Decompose the outbox path** the same way, before assuming it is or is not the same problem.

## Candidate Shapes, Not Yet Chosen

- Append-only turn storage with the projection rebuilt from segments, so a save writes one turn.
- A native-side projection cache keyed by `(journeyId, generation, turnId)` so the renderer sends a
  delta and the native side composes the full document.
- Streaming the payload rather than one `String` argument.

Each changes the durable-state model and must be argued from it, not from the timing alone.

## Exclusions

- Anything on the main thread. CR149 owns that and has measured it.
- Reducing what a conversation *contains*. This CR is about what crosses per settlement.
