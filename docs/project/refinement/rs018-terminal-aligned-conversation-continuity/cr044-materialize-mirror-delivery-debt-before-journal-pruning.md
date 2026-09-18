[< RS018](index.md)

# CR044: Materialize Mirror Delivery Debt Before Journal Pruning

**Status:** captured
**Driver:** —
**Delivery:** —

## Problem

CR043 proved that completed `terminal_durable` and `projected` turn-journal records cannot be pruned safely before their Mirror delivery debt is self-contained. Today the compatibility outbox is written after Desktop projection and after the journal reaches `projected`. If the app stops before outbox enqueue, the journal remains the only durable cue that the completed Pi user/assistant pair still needs Mirror delivery.

This makes completed pre-outbox journal evidence both lifecycle state and an implicit delivery ledger. Pruning it would silently discard unresolved Mirror debt; retaining enough such records can still reach the journal bound and return `turn_journal_full` despite no active native execution.

## Expected Behavior

Every completed Pi turn that requires Mirror synchronization has self-contained, exact and retryable compatibility-outbox debt before its journal evidence becomes eligible for retention pruning. Relaunch reconciliation can distinguish and repair the bounded crash windows without provider invocation, Desktop projection authority, Segment counts or Mirror availability.

Once delivery debt is independently durable, completed historical journal evidence can be compacted without deleting transcript or synchronization obligations. Only exact active native execution remains a successor blocker.

## Impact

CR044 removes the architectural dependency that parked CR043. Long-running Conversations remain usable through repeated Mirror outages and relaunches without converting the journal into a delivery ledger. Mirror delivery remains explicit, exact, model-free and independently retryable through the released Mirror Core append contract.

## Plan Or Decision

### Proposed Scope

1. Characterize every completed-turn crash window
   - Pi completion before Desktop projection.
   - Projection persistence before outbox enqueue.
   - Outbox enqueue before journal advancement.
   - Journal advancement before Mirror append and acknowledgement.
   - Relaunch with any exact subset of those durable bodies.

2. Define one self-contained delivery-debt boundary
   - Preserve exact Journey, Desktop Conversation, generation, Pi session, Mirror destination, runtime channel and run correlation.
   - Ensure the compatibility outbox owns all data required for model-free append retry.
   - Do not treat journal phase, projection checkpoint, Segment count or Mirror receipt as transcript authority.

3. Materialize or reconcile debt before pruning
   - Make normal completed-turn settlement durably establish outbox debt at the earliest safe point.
   - On relaunch or admission, reconstruct and enqueue missing exact debt from the authoritative Pi turn plus fail-closed control-plane bindings.
   - Reconcile the bounded cross-file crash window idempotently; never append twice or invoke the provider.
   - Expose exact evidence to journal retention so only independently durable completed records become pruneable.

4. Resume CR043
   - Prove completed pre-outbox histories can be converted to independently durable delivery debt.
   - Return to CR043 and remove the final capacity gate without weakening retention safety.

### Likely Affected Files

- `src/app/App.tsx`
- `src/app/mirrorAppendOutbox.ts`
- `src/app/mirrorAppendOutboxStorage.ts`
- `src/app/journeySettlement.ts`
- `src/app/journeySettlementRecovery.ts`
- `src/app/turnJournal.ts`
- `src-tauri/src/turn_journal.rs`
- focused frontend and Rust tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- CR043 and this CR document

### Acceptance

- A completed Pi turn cannot lose its unresolved Mirror delivery obligation when its journal record is pruned.
- Every completed pre-outbox crash window is classified deterministically after relaunch.
- Missing debt is materialized only from the exact completed Pi turn and complete fail-closed control-plane bindings.
- Existing outbox items remain idempotent and are never duplicated or implicitly acknowledged.
- Mirror append failure or unavailability never blocks a successor.
- Desktop projection and Segment state are not prerequisites for debt materialization or retry.
- No provider invocation, implicit retry, generation reset or Mirror Core change is introduced.
- CR043 receives explicit evidence identifying which completed journal records are independently safe to prune.

### Validation

- TDD matrix for every cross-file crash window and relaunch classification.
- Tests for exact authority mismatch, stale generation, duplicate debt and absent Pi transcript evidence.
- Complete frontend and Rust suites, TypeScript, production build and `cargo check`.
- `npm run roadmap:check`, `git diff --check` and relative-link validation.
- Stop for Navigator Validation before CR043 resumption, production repair, push, merge, publication or release.

### Exclusions

- No Mirror Core schema, API, queue, code or release change.
- No provider retry or transcript fabrication.
- No Conversation Segment migration.
- No production Flip mutation or historical repair execution.
- No release or publication work.

### Reversibility

The compatibility path remains based on the released `memory conversations append` contract. New reconciliation is local, idempotent and bounded by exact existing authority. Until validation, CR043 continues preserving completed pre-outbox journal evidence, so rollback cannot silently discard delivery debt.

### Authority Boundary

CR044 was captured after the Navigator selected the recommended response to CR043's discovered delivery dependency: park CR043 and create a dedicated compatibility-outbox isolation slice. Selection, focus, Driver, Delivery, transition to `planned` or `in_progress`, implementation, validation, push, merge, publication and release remain separate Navigator decisions.

## Evidence

- Normal settlement currently persists Desktop projection and advances the journal to `projected` before `enqueueExactProjectionOutbox()` creates the compatibility-outbox item.
- `projected` journal recovery currently exposes `resume_outbox`, proving the journal is still the only durable delivery cue in that window.
- CR043's delivery-safety test proves completed pre-outbox records must remain unpruned under the current ordering.
- Pi JSONL already owns the completed transcript and CR041 provides exact active-branch reconstruction without Desktop projection authority.

## Outcome

Captured. No implementation has begun.
