[< Story](index.md)

# Test Guide — CV-002.DS-004.TS-6

## Purpose

Prove that the contract classifies durable evidence by native identity, authority coordinates and monotonic checkpoints, never by conversational text similarity.

## Automated Commands

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

TS-6 does not mutate Mirror production behavior. Synthetic Mirror fixtures must still match the current runtime-session/message schema.

## Contract Scenarios

### 1. Fresh conversation

Expected: coordinates match `LiveConversationIdentity`; aggregate is `uninitialized`; no body or Mirror conversation is invented.

### 2. Nautilus turn lifecycle

Begin one turn and observe Harness, Pi and Mirror in different orders.

Expected: one `turnId`; duplicate observations are idempotent; state remains pending until required evidence exists; complete correlated evidence becomes `in_sync`; no text comparison occurs.

### 3. Partial commit and failure

Exercise Harness/Pi committed with Mirror pending and failed.

Expected: `commit_pending` or `commit_failed`; native committed ids survive; retry cannot create another turn; no assistant completion is invented.

### 4. External Pi advancement

Provide a same-generation Pi leaf descended from the stored checkpoint without a Nautilus turn id.

Expected: `pi_advanced`; native ancestry is retained; no UI message is materialized; non-descendant or changed-generation evidence conflicts.

### 5. Mirror-only advancement

Provide native Mirror messages after the stored checkpoint without Pi advancement.

Expected: `mirror_advanced`; records remain unapplied; consolidated/truncated text does not change identity classification; conversation-id mismatch conflicts.

### 6. Independent advancement

Advance Pi and Mirror without shared correlation.

Expected: `both_advanced` or `conflicted`; never `in_sync` from matching role, timestamp, hash or text.

### 7. Restart and branch generation

Reset to a new generation.

Expected: old Pi checkpoint cannot fast-forward; archived pending state is not active; Mirror linkage changes only by explicit input; new authority is uninitialized.

### 8. Explicit hydration

Initialize a Pi generation from a selected Mirror checkpoint.

Expected: hydration provenance is retained; source Mirror checkpoint and new Pi generation are represented; only the supplied baseline is established.

### 9. Legacy migration

Parse `0.1.0` through `0.4.0`.

Expected: output is `0.5.0`; live identity, context, mode and activity survive; reconciliation remains unproven; Mirror imports preserve source id without claiming Pi parity.

### 10. Invalid evidence

Exercise wrong Journey, Harness conversation, Pi session, generation, malformed ids, decreasing counts, committed state without native evidence and duplicate turn ids with different authority.

Expected: reject the state or use the documented safe migration fallback; never accept impossible synchronization.

### 11. Sanitization

Expected: serialized state contains no message content, secrets, arbitrary environment, tool output, private reasoning or reasoning summary. Optional hashes are diagnostics, not identity.

## Regression Expectations

- Journey creation, restart and message replacement remain intact.
- Context and certified mode persistence remain intact.
- Mirror hydration remains explicit.
- Contract parsing starts no Pi process.
- No Mirror-to-Pi mutation, UI change or concurrency behavior is introduced.

## Navigator Validation

TS-6 uses a narrower fixture-level route because it deliberately introduces no Navigator UI. Review a sanitized serialized `ConversationReconciliationState` through fresh, synchronized, pending, Pi-advanced, Mirror-advanced, conflicted and generation-reset fixtures. Confirm each classification and reason code matches the documented contract.

Pass: all classifications, migrations and invariants match; automated checks are green; architecture and serialized types agree.

Fail: text equality proves identity; legacy state is marked synchronized; stale generation advances; malformed evidence is accepted; or sibling-story I/O/UI behavior appears.
