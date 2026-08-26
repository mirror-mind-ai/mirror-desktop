[< CV-004](index.md)

# Dedicated Thread Lifecycle Contract

## Purpose

Define the smallest durable authority model needed for one Nautilus-owned conversation per Journey without treating conversations from Mirror, Pi or other runtimes as replicas or continuation candidates.

## Authority Coordinates

```text
threadId
journeyId
generation
piSessionId
mirrorConversationId
status
createdAt
activatedAt
closedAt
```

`threadId` is stable for the Journey's Nautilus continuity. `generation` increases monotonically whenever the Navigator restarts conversation. The Pi and Mirror IDs are native authority for that generation. Titles and timestamps never establish identity.

## Invariants

- One Journey has at most one Nautilus thread.
- One Nautilus thread has at most one active generation.
- Each generation owns exactly one dedicated Pi session and one dedicated Mirror conversation.
- A native Pi session or Mirror conversation cannot belong to two threads or generations.
- Dedicated native IDs must carry the selected Journey authority.
- An incomplete generation is never exposed as ready for conversation.
- External Pi sessions and Mirror conversations are never eligible for automatic adoption.
- Generation history is append-only; restart closes the current generation and creates the next.

## Provisioning State

```text
absent
  -> provisioning
  -> activating
  -> ready

provisioning | activating
  -> failed
  -> retrying
  -> ready
```

Provisioning and activation are model-free. A durable operation ID makes retries idempotent. Failure either restores the prior valid state or leaves an explicit recoverable pending operation. It never enables a generic composer.

## Start This Journey

The explicit start action:

1. allocates the thread when absent;
2. allocates the next generation number;
3. creates a native Pi session dedicated to the Journey;
4. creates a native Mirror conversation dedicated to the Journey;
5. assigns deterministic human-readable names;
6. activates Journey identity, mode, context and command authority;
7. persists native receipts and the active-generation pointer atomically;
8. enables the composer only after read-back verification.

No provider is called. The first provider request occurs only when the Navigator submits the first real message, after the runtime has loaded the activated Journey context.

## Resume

Selecting a Journey with a ready generation loads only that generation's dedicated Pi transcript and Mirror participation state. It does not inspect arbitrary recent Pi sessions or ask the Navigator to select a Mirror conversation. Focus checks validate native artifacts and pending internal commits only.

## Restart Conversation

Restart is an explicit, confirmable lifecycle action. It closes the active generation, preserves it as read-only history, creates and activates the next dedicated pair, then moves the active pointer. If the new generation fails before activation, the previous generation remains active. Restart does not call a provider.

Suggested display names:

```text
Nautilus · <Journey title>
Nautilus · <Journey title> · 2
Nautilus · <Journey title> · 3
```

Names are presentation metadata. Authority remains native-ID based.

## Turn Integrity

Within the ready generation:

```text
Journey context receipt
  -> native Pi user message
  -> complete native Pi assistant response
  -> Harness projection checkpoint
  -> Mirror recording receipt
```

A complete Pi turn may be projected once. Mirror recording failure remains retryable without calling the provider again. The composer fails closed only for unresolved state inside the active pair, not because another environment advanced.

## Legacy Boundary

Parity-era mappings and imported transcripts are historical evidence only. Migration does not infer a dedicated generation from appearance, title, recency, message equality or Journey association. Existing Journeys start clean unless a future explicit migration tool can prove that a pair was created under this contract.

## Privacy and Evidence

Receipts may contain bounded native IDs, operation IDs, timestamps, states and failure codes. They must not persist private prompt bodies, provider responses, raw reasoning, secrets or arbitrary environment values as authority evidence.
