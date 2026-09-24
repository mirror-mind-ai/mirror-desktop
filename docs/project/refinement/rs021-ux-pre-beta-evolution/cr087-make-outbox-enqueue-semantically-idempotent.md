[< RS021](index.md)

# CR087: Make Outbox Enqueue Semantically Idempotent

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs021-cr087-idempotent-outbox-enqueue`

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

## Investigation (2026-09-24)

Read-only inspection of production and Dev app data before any change.

- Both outboxes (`ai.mirrormind.desktop`, `ai.mirrormind.desktop.dev`) are empty: every
  conflict so far self-repaired, so no conflicting payload pair survives on disk.
- The live enqueue path is not a race by itself. `enqueue_mirror_append_item` converts the
  TypeScript `1.0.0` item into `1.1.0` through `normalize_legacy_enqueue_item`, which
  compares message `id`, `role`, `content` and `metadata` against an item rebuilt from the
  turn journal and the Pi session. A content divergence there would fail every such turn.
- That divergence does not exist in recorded data. Across all Journeys, 313 settled turns
  were re-derived from their Pi session with the same envelope-stripping and trimming rules
  the native code uses; user text, assistant text, `committedAt` and `entryCount` matched
  the projection and the journal evidence in every case.
- The retry path (`generatePacket(mode, retryContent)`) has no caller passing
  `retryContent`; retry with reused turn ids is ruled out.
- Native reconciliation is Journey-scoped, so switching to Journey B cannot materialize
  items for Journey A.
- Pi session content for a generation is not immutable in practice: six settled
  `mirror-desktop` turns from 2026-09-21 reference entry ids that no longer exist in the
  generation-4 session file (17 to 37 entries at the time, 10,632 now). A session replaced
  under the same generation number makes any re-materialization time-dependent.
- The only Flip Podcast journal record near the 2026-09-23 15:04 screenshot is an
  `interrupted / cancelled` turn at 17:09Z. The conflict surfaced next to a cancelled turn,
  not a settled one.

Conclusion: the original hypothesis (benign timestamp difference between two `1.1.0`
payloads) is not supported by evidence. The three remaining conflict sites are
`enqueue_mirror_append_item_at_with_limit` (existing item with same `itemId`, different
payload), `replace_legacy_outbox_item_at` (a stored `1.0.0` item from an older build) and
`normalize_legacy_enqueue_item`. Which one fires, and with which payload pair, is unknown
because the native layer discards both payloads at the point of conflict.

## Plan

1. **Make the conflict self-describing.** In the three native conflict sites, compute the
   set of top-level and message-level keys that differ and (a) append a bounded diagnostic
   record (`itemId`, site, differing keys, both payloads, timestamp) to
   `mirror-append-conflicts.jsonl` next to the outbox, capped in size, and (b) keep the
   error code `mirror_append_item_conflict` unchanged for callers while exposing the
   differing keys through a new read-only command for Settings diagnostics. Rust tests for
   each site.
2. **Reproduce in Dev with the diagnostic in place.** Scenarios, in order of likelihood:
   cancel a turn and immediately send the next one in the same Journey; switch Journeys
   repeatedly while a turn is finalizing; send a message with a file attachment; run a
   Nautilus synthesis intent (its `/skill:` prefix bypasses the envelope detection in
   `project_dedicated_user_text_and_envelope`, so the derived user text would carry the
   whole authority header). Read the conflict file after each scenario.
3. **Fix at the source according to the recorded pair.** If the differing keys are
   non-authoritative (`createdAt`, `piSessionFile` string form, entry counts), introduce one
   native `mirror_append_items_semantically_equal` used by all three sites so the second
   enqueue is a no-op. If the pair reveals a producer bug (for example the `/skill:`
   envelope, or a cancelled turn whose item was enqueued before interruption), fix that
   producer and keep the fail-closed conflict.
4. **Contract coverage.** Extend the CR064 world with a scene that enqueues the same exact
   turn twice with a benign difference and asserts zero failed attempts in the CR086
   ledger, plus the divergent-content scene that must still fail.

Slice 1 lands first and can ship alone: it changes no behavior and turns the next
occurrence into evidence instead of another guess.

## Slice 1 Evidence (2026-09-24)

- `src-tauri/src/main.rs`: `mirror_append_conflict_keys` names differing top-level keys
  and `messages[i].key` entries; `record_mirror_append_conflict` appends a record
  (`site`, `itemId`, `journeyId`, `differingKeys`, `existing`, `candidate`, `recordedAt`)
  to `mirror-append-conflicts.jsonl` beside the outbox, keeping the most recent 64, via
  staged write and rename. A failed diagnostic write never changes the caller's result.
- The three sites record before returning `mirror_append_item_conflict`: enqueue with an
  existing different payload (`enqueue`), replacement of a stored legacy item
  (`replace_legacy`) and normalization of a legacy enqueue against the Pi-backed rebuild
  (`normalize_legacy`). `normalize_legacy_enqueue_item` now receives the outbox path.
- New read-only command `list_mirror_append_conflicts(journeyId)` and the TypeScript
  wrapper `listMirrorAppendConflicts` in `src/app/mirrorAppendOutboxStorage.ts`. No
  Settings surface yet; slice 2 reads the file directly.
- Rust tests: key naming at both levels, bounded records with unchanged error code and
  untouched outbox, legacy replacement pair, legacy normalization pair.
- Gates: `cargo test --locked` 187 passed / 3 ignored; `cargo check --locked` clean;
  `npm test` 171 files / 1020 tests; `npm run build` green; roadmap READY.

## Evidence

- Screenshot from 2026-09-23 15:04 showing `mirror_append_item_conflict` as the notice
  detail.
- `src-tauri/src/main.rs`: `enqueue_mirror_append_item_at_with_limit` compares
  `existing == &item` for equality.
- `src-tauri/src/main.rs`: native reconciliation re-materializes items through
  `create_pi_backed_mirror_append_item` and enqueues them on Journey hydration.
