[< RS016](index.md)

# CR061: Reconcile Mirror Append Timestamp Idempotency

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

Mirror Desktop can persist a completed turn to Mirror and still retain the same turn as unsettled delivery debt. The initial append and the later Pi-backed recovery route may use different `createdAt` values for otherwise identical messages.

Mirror Core correctly uses `messageId` as the lookup identity, then requires the persisted conversation, role, content, normalized timestamp and metadata to remain exactly equivalent. When recovery presents the same IDs, roles, content and metadata with Pi-derived timestamps that differ from the Desktop timestamps used by the first append, Core rejects the retry as `idempotency_conflict`.

The installed Alpha.13 incident on 2026-09-20 proves the split authority:

- the current Flip Podcast turn was already present in its exact Mirror conversation;
- both message IDs, roles, content and metadata matched the Pi-backed outbox item;
- only both `createdAt` values differed;
- the retry upgraded the outbox item from legacy schema `1.0.0` to Pi-backed schema `1.1.0`, then left it pending;
- the GUI retained the aggregate synchronization notice without exposing the bounded rejection reason;
- an older independent outbox item remained genuinely absent from Mirror.

The response transcript remains authoritative in Pi JSONL and the Composer remains available. The defect is exact Mirror delivery acknowledgement and recovery, not transcript loss or native occupancy.

## Expected Behavior

Initial delivery and Pi-backed recovery use one canonical timestamp authority so an exact retry of an already-persisted turn returns `existing` rather than `idempotency_conflict`.

For retained historical debt where conversation, message IDs, roles, content and metadata match and only normalized timestamps differ, recovery must use an explicit bounded compatibility decision. It must neither duplicate messages nor silently accept differences in content, role, conversation, metadata or identity.

The GUI must expose a bounded actionable reason when exact Mirror settlement remains rejected. One failed operation must not hide, replace or prevent an independent older operation from being inspected or retried.

## Desktop-Only Correction Direction

Mirror Core remains unchanged and continues rejecting any unequal reuse of a persisted message ID. Desktop must instead make its delivery protocol consistent:

- new initial appends use Pi-backed timestamps, so recovery repeats the exact original payload;
- after an exact `idempotency_conflict`, a bounded legacy compatibility retry may reconstruct the former Desktop staging timestamp only when the Pi-backed item has validated run, turn, generation, session and message authority and both harness message IDs encode that same legacy run timestamp;
- Core remains the final fail-closed authority: any difference beyond the known timestamp shape continues to reject the compatibility attempt;
- genuinely absent legacy messages first receive the canonical Pi-backed append and therefore do not acquire legacy timestamps;
- Desktop preserves and presents the exact bounded rejection reason when neither exact route succeeds.

This allows the already-persisted Alpha.13 turn to acknowledge as `existing` and the genuinely absent older turn to append with Pi-backed timestamps, without reading or modifying Mirror internals and without changing the Core contract.

## Initial Acceptance Horizon

- A test reproduces initial Desktop delivery followed by Pi-backed retry with timestamp-only divergence.
- New turns use one canonical timestamp authority from their first Mirror append onward.
- Exact same-message retries are idempotent and settle without provider execution.
- Timestamp-only historical compatibility is explicit, bounded and covered by conflict tests.
- Content, role, conversation, metadata and message-ID conflicts remain fail-closed.
- Multiple retained operations settle or fail independently with exact Journey/run/turn diagnostics.
- The UI presents the bounded rejection reason without exposing message content or arbitrary runtime output.
- No path retries the provider, changes model/provider, rewrites Pi JSONL or weakens native occupancy.

## Boundaries

- Mirror Core owns append-contract equivalence and remains unchanged by this CR.
- Mirror Desktop owns the complete correction: payload construction, Pi-backed recovery, bounded legacy timestamp compatibility, acknowledgement and presentation.
- The production Mirror checkout and `/Users/alissonvale/Code/mirror-dev` remain read-only and outside implementation scope.
- Production Mirror and application data remain read-only unless a separately authorized recovery operation is named explicitly.
- Capturing this CR does not select it, assign a Driver, choose a Delivery branch, authorize planning or implementation, push, release or repair the two retained production operations.

## Evidence

- Installed application: `0.2.0-alpha.13`.
- A read-only comparison through the released Mirror API found the current turn's two persisted messages identical in conversation, IDs, roles, content and canonical metadata, with both normalized timestamps divergent.
- The same comparison found the older retained operation's two messages absent from its exact Mirror conversation.
- Mirror Core `ConversationAppendService` normalizes `createdAt`; `MessageStore.append_conversation_messages` rejects any persisted mismatch as `idempotency_conflict`.
- Mirror Desktop reconstructs schema `1.1.0` outbox messages from Pi evidence and maps a Core rejection to `mirror_append_<reason>`, but the current recovery notice shows only the aggregate operation count.

## Outcome

Captured for explicit selection, assignment, planning and implementation decisions.
