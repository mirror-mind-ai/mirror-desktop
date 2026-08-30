# Delivery Plan — CV-002.DS-005 Explicit Conversation Append Boundary

## Status

approved_for_implementation

## Provider Baseline

Mirror `0.31.13` is installed at `fdd760f8f3532dbeb0841826107d1672f6bbb881` and exposes:

```text
uv run python -m memory conversations append --mirror-home PATH --format json
```

The request is bounded to 262,144 stdin bytes, 1–20 messages, 51,200 UTF-8 bytes per message and a 4,096-byte persisted metadata envelope.

## Implementation Slices

1. Define a strict Harness outbox item/summary/receipt model and finite limits.
2. Add a channel-local native outbox with atomic publication, global count/byte limits and exact Journey/generation/conversation authority.
3. Add a native append command that reads only a persisted outbox item, sends JSON through stdin to the released Mirror CLI and returns bounded structured evidence.
4. Keep accepted items until the corresponding generation projection is durably updated, then acknowledge and remove them.
5. Derive Pi execution evidence from the dedicated transcript after completion, without using the transcript to route Mirror persistence.
6. Prevent the project-local Mirror logger from becoming a second writer during dedicated Harness turns while retaining core Mirror skills and installed external skills explicitly.
7. Replace startup status/retry and finalization calls to `conversation-logger` with outbox append/retry.
8. Prove generation restart, app reopen, idempotent retry, stale runtime-session drift, overflow and channel isolation.

## Outbox Contract

One channel-local file below Tauri app data stores at most 32 pending completed turns and at most 4 MiB serialized. Each item contains exactly two messages and is bound to:

- item/turn id;
- Journey id;
- Harness thread id;
- generation number;
- exact Mirror conversation id;
- stable user and assistant message ids;
- roles, content and creation timestamps;
- bounded generic caller metadata.

One append request is additionally capped at 131,072 serialized bytes, below Mirror's public stdin ceiling. Acknowledged items are removed. Overflow rejects enqueue before append and never evicts an unconfirmed item.

## Durability Order

```text
Pi settles
→ Harness derives Pi execution evidence
→ Harness saves completed generation projection
→ native outbox enqueue commits atomically
→ native Mirror append runs from persisted item
→ Harness saves accepted receipt into generation projection
→ native outbox acknowledgement removes item
```

A crash at any boundary leaves either no completed turn or a retryable item. A crash after Mirror accepts but before acknowledgement retries idempotently and then completes the local projection.

## Pi Extension Boundary

The Mirror project logger is not the writer for dedicated Harness turns. Mirror-mediated Pi runs decline project-local resource auto-loading, then explicitly load the released core Mirror skill directory and the bounded installed external-skill catalog from the active Mirror home. User/global Pi packages remain available. This preserves context and skills while excluding the project-local logger side effects.

## Conscious Exclusions

- no Mirror source modification or production update;
- no deletion or migration of historical duplicate messages;
- no Pi compaction or generation-retention redesign;
- no DS-009 concurrency implementation;
- no selected-Journey command-authority extension work from the incident branch.
