[< RS021](index.md)

# CR087: Make Outbox Enqueue Semantically Idempotent

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

The CR086 diagnosis found `mirror_append_item_conflict` as the recorded reason behind
the transient synchronization notice captured on 2026-09-23. The native enqueue in
`src-tauri/src/main.rs` rejects an item whose `itemId` already exists in the outbox
when the stored payload is not byte-for-byte equal to the candidate. Two producers
can build the same exact turn item: the TypeScript finalization path during live
settlement, and the native reconciliation that re-materializes items from the turn
journal and the Pi session when a Journey is hydrated or switched. If those two
payloads differ in any non-authoritative field, the second enqueue fails even though
both describe the same durable turn.

This is a hypothesis grounded in code reading. It has not yet been confirmed with a
real outbox file and the two competing payloads side by side.

## Expected Behavior

Enqueueing the same exact turn twice is a no-op. Conflict is reported only when the
two payloads disagree on authority or message content: `itemId`, `journeyId`,
`threadId`, `generation`, `conversationId`, message ids, roles, and content.
Non-authoritative differences such as `createdAt`, entry counts, or ordering of
equivalent fields must not fail the second enqueue.

## Proposed Scope

- Reproduce the conflict with real evidence: capture an outbox item from a live
  settlement and the item re-materialized by native reconciliation for the same turn,
  and diff them.
- Define the semantic identity of an outbox item in one native function and use it in
  `enqueue_mirror_append_item_at_with_limit` and `replace_legacy_outbox_item_at`.
- Keep the stored item when the candidate is semantically equal; keep fail-closed
  conflict when message content or authority differs.
- Add Rust tests for equal-authority-different-timestamp, differing-content and
  differing-authority cases.
- Re-run the CR064 contract and the CR086 attention tests to confirm fewer failed
  convergence attempts on the live path.

## Acceptance

- The reproduced conflict no longer occurs for semantically equal items.
- A genuinely divergent payload still fails with `mirror_append_item_conflict`.
- No change to Pi JSONL, turn journal schema, outbox schema or Mirror Core.

## Exclusions

- No relaxation of authority validation (`validate_outbox_generation_authority`,
  `validate_run_authority`).
- No change to the CR086 presentation gate; this CR reduces failed attempts at the
  source, CR086 decides what the user sees.

## Dependencies

Follows CR086. CR086 makes transient failures invisible; CR087 removes one known cause
of those failures. Doing CR087 first would hide the presentation defect behind fewer
occurrences without fixing it.

## Evidence

- Screenshot from 2026-09-23 15:04 showing `mirror_append_item_conflict` as the notice
  detail.
- `src-tauri/src/main.rs`: `enqueue_mirror_append_item_at_with_limit` compares
  `existing == &item` for equality.
- `src-tauri/src/main.rs`: native reconciliation re-materializes items through
  `create_pi_backed_mirror_append_item` and enqueues them on Journey hydration.
