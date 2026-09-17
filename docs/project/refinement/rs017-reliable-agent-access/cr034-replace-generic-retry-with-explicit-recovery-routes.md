[< RS017](index.md)

# CR034 — Replace Generic Retry with Explicit Recovery Routes

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs017-cr034-explicit-recovery-routes`

## Problem

The generic **Try again** action repeats opening-time recovery without identifying the operation, its preconditions or its likely result. When that route cannot cross the failing frontier, the user receives the same blockade instead of an independent escape.

## Expected Behavior

Recovery actions name the exact operation and remain idempotent. Depending on durable evidence, the user can retry Mirror synchronization, recover a preserved response, preserve and continue, start a new Conversation or reset agent context. No recovery route repeats a provider call without explicit consent.

## Impact

A preserved failure becomes actionable rather than an operational dead end.

## Plan Or Decision

### Recovery Contract

Introduce one pure recovery-route decision downstream of the CR032 availability contract and CR033 local-completion frontier. Availability continues to answer which local actions are safe; the recovery decision answers which named operation can move the exact durable state forward.

The decision consumes only explicit evidence:

- the current `ConversationAvailability` condition and action capabilities;
- the exact blocking journal record, opening-recovery classification and retained-lease state;
- exact pending Mirror repair and outbox evidence;
- whether the current surface can create a Desktop Conversation;
- whether a recovery operation is already active.

It returns ordered routes with a stable id, user-facing label, consequence, enabled state and blocked reason. It must not infer recovery from generic errors or selected-Journey identity alone.

### Named Routes

1. **Retry Mirror synchronization** (`retry_mirror_sync`)
   - Available only for an exact locally complete turn whose message pair can be reconstructed or whose durable outbox item exists.
   - Runs enqueue/append/receipt/acknowledgement only; never invokes the provider.
   - Keeps Send available while the synchronization debt remains pending.
2. **Recover preserved response** (`recover_preserved_response`)
   - Available for an inactive `terminal_durable` completed record with fresh, complete Pi execution evidence and exact staged harness authority.
   - Projects the preserved assistant response and advances the journal model-free.
   - A failed attempt leaves the same record and evidence intact and reports the failing operation without converting the Journey to unavailable.
3. **Preserve attempt and continue** (`preserve_attempt_and_continue`)
   - Available only when native inspection proves the exact run inactive and journal transition authority permits honest interruption.
   - Marks the attempt interrupted while retaining terminal evidence and existing durable user content; it does not claim that a missing response was recovered.
   - Replaces the misleading **Discard previous response** wording and requires consequence copy when completed evidence will not be projected into the Conversation.
4. **Start new Conversation** (`start_new_conversation`)
   - Opens the existing Desktop Conversation creation route only when `canStartNewConversation` is true.
   - Never bypasses a same-Journey native lease or journey-wide blocking journal record.
5. **Reset agent context** (`reset_agent_context`)
   - Opens the existing generation-reset confirmation only when `canResetAgentContext` is true and no blocking journal record remains.
   - Preserves the previous generation and performs no implicit retry or discard.

Waiting states such as a live run, native inspection, capacity occupancy or an exact retained Journey lease remain explanatory states, not buttons that pretend to perform recovery.

### Integration Plan

1. Add a small domain module for recovery-route classification and presentation. Keep route policy out of `App.tsx` and do not overload `ConversationAvailability` with journal-specific evidence.
2. Separate persisted Conversation restoration from optional turn recovery during opening. A recoverable turn failure must keep the ready Conversation surface mounted and expose its exact route instead of falling through to `runtime_read_failed`.
3. Replace the inline blocking-recovery notice and generic **Try again** handler with a route-driven recovery surface. Use operation-specific progress and failure copy:
   - `Recovering preserved response…`;
   - `Retrying Mirror synchronization…`;
   - `Preserving attempt…`;
   - exact bounded failure text that states which operation failed.
4. Wire each route directly to one existing exact operation (`retryPendingMirrorCommit`, deterministic journal projection, inactive interruption, Desktop Conversation creation, or generation reset). Do not create a generic retry dispatcher that re-enters opening by toggling load state.
5. Keep every operation idempotent and re-read durable authority immediately before mutation. Stale, replaced, cross-generation or cross-thread evidence fails closed and refreshes route presentation.
6. Preserve the complete durable Conversation as the source for response recovery and Mirror repair. A displayed Segment may present the result but cannot authorize mutation.
7. Remove **Try again** and **Retry** from turn-recovery and Mirror-synchronization surfaces in favor of the exact route labels. Unrelated retry labels in onboarding, settings or Journey provisioning are outside this CR.
8. Record one bounded diagnostic per failed route while retaining the alternative safe routes. Failure of one route must not hide model-free escape routes that remain authorized.

### Affected Files

Expected implementation surface:

- new `src/domain/conversationRecovery.ts` (name may narrow during TDD);
- `src/domain/conversationAvailability.ts`, only for capability alignment rather than journal policy;
- `src/app/turnJournal.ts`;
- `src/app/App.tsx`;
- `src/app/ConversationSyncNotice.tsx` or a narrowly renamed recovery surface;
- focused recovery-policy, component and integration tests.

No Rust or schema change is expected. If exact recovery cannot be expressed through existing native journal transitions and outbox commands, implementation must stop for a separate scope decision rather than adding an unplanned authority path.

### Acceptance

- No turn-recovery or Mirror-sync surface presents a generic **Try again** or **Retry** action.
- Every visible recovery action names one operation and explains its durable consequence.
- Retrying Mirror synchronization never invokes Pi and does not block Send.
- Recovering a preserved response uses the exact terminal journal evidence and complete durable Conversation without provider execution.
- A failed response recovery leaves the ready Conversation visible, retains evidence and offers only still-authorized alternatives.
- Preserve-and-continue cannot target a live, replaced or cross-generation run.
- Start-new and reset-context routes follow the CR032 capability booleans and cannot bypass Journey occupancy or blocking journal authority.
- Repeated action, restart and stale-callback scenarios are idempotent and cannot duplicate messages, outbox items, generations or provider turns.
- The CR033 controlled scenario still passes: synchronization failure, successor admission, later exact synchronization repair.

### Validation

- TDD for the pure route matrix across `ready`, `sync_pending`, `local_admission_unavailable`, live execution, retained lease, native inspection and capacity states.
- TDD for completed, failed, cancelled, stale and replaced journal records.
- Component tests for exact labels, consequences, progress, disabled reasons and bounded diagnostics.
- Integration tests proving route-to-handler mapping and absence of provider invocation from all recovery handlers.
- Restart tests for `terminal_durable`, `projected`, `outbox_enqueued`, `settled` and `interrupted` records.
- Complete frontend suite and production web build.
- Navigator validation in Mirror Desktop Dev with disposable data: failed preserved-response recovery, preserve-and-continue, outbox retry, successor send, new Conversation and context reset as applicable.

### Exclusions

- No provider retry, response regeneration or automatic resend.
- No journal, outbox, Conversation or thread schema migration.
- No periodic background synchronization worker.
- No redesign of unrelated onboarding, settings, provisioning or network retry controls.
- No Journey prompt or cross-Journey material-policy change; CR035 owns that boundary.
- No push, merge, publication, release or production app-data mutation.

### Authority Boundary

The Navigator approved this Plan, assigned Driver `@alissonvale`, assigned Delivery `refinement/rs017-cr034-explicit-recovery-routes`, moved CR034 to `in_progress`, and authorized the local plan commit and implementation. Push, merge, publication and release remain separate Navigator decisions.

## Evidence

In the reported alpha 8 incident, **Try again** repeatedly failed, reset was unavailable and a separate rescue Journey was required to regain agent access.

## Outcome

Plan approved. Local implementation is in progress under the assigned Driver and Delivery.
