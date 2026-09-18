[< RS018](index.md)

# CR045: Make Pre-Agent Staging Non-Authoritative

**Status:** in_progress
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr045-pre-agent-staging-atomicity`

## Problem

The Desktop currently writes `stagedConversation` before calling native `start_pi_invocation`. That projection contains the optimistic user message, an empty assistant placeholder and pending reconciliation authority. Native start validation then requires the staged projection to contain the correlated turn.

If admission is rejected, the app attempts a compensating rollback. A process or application stop between staging and rollback can leave durable user/empty-assistant ghosts even though Pi never admitted or executed the turn. This makes presentation staging a prerequisite for native admission and contradicts RS018: Pi JSONL owns transcript, the journal owns admitted lifecycle and pre-agent rejection must not publish transcript history.

## Expected Behavior

Before exact native admission, the new user/assistant pair exists only in the current in-memory optimistic Surface. The durable composer draft remains available. Native admission validates exact control-plane, generation, runtime-channel and Pi-session authority without requiring a staged transcript projection.

After Pi emits exact `agent_start` evidence, the Desktop may persist the correlated projection as a compatibility view and durably clear the composer draft. If admission or worker startup fails before the agent starts, the optimistic pair disappears, the original draft and attachments are restored in the running app, and no projection rollback write is required.

A crash after native execution begins but before projection persistence remains recoverable from Pi JSONL and journal evidence; it does not authorize provider retry or transcript fabrication.

## Impact

Rejected, capacity-limited and failed-to-spawn invocations no longer leave durable transcript ghosts. Native admission no longer depends on presentation staging. Relaunch can distinguish an admitted native attempt from an optimistic attempt that never crossed the native boundary.

## Plan Or Decision

### Approved Scope

1. Characterize the pre-agent boundary
   - Prove current start validation requires a staged reconciliation turn.
   - Cover admission rejection, worker spawn failure and application interruption before `agent_start`.
   - Preserve exact Journey, Conversation, generation, Pi session, Mirror destination and runtime channel validation.

2. Remove projection staging from admission authority
   - Add a native pre-admission validator using structural correlation plus persisted control-plane and Pi-session binding.
   - Keep stricter projection validation for post-admission settlement and mutation commands.
   - Reserve native occupancy and write journal admission without reading the optimistic transcript pair.

3. Delay compatibility projection publication
   - Keep the staged pair only in the in-memory runtime Surface while admission is pending.
   - Persist it only after exact `agent_start` / `working` evidence for the same run.
   - Keep the durable composer draft until that evidence; clear it only after admission crosses the agent boundary.

4. Make rejection rollback non-mutating
   - Restore the base in-memory Conversation, draft and attachments.
   - Reconcile and release exact native occupancy without rewriting the base projection.
   - Preserve journal/native failure evidence and truthful diagnostics.

### Likely Affected Files

- `src-tauri/src/main.rs`
- `src/app/App.tsx`
- `src/app/journeySettlement.ts`
- `src/agent/piProcessStream.ts`
- focused Rust and frontend lifecycle tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- Native admission succeeds against exact control-plane authority when the durable projection contains only the prior committed Conversation.
- Admission rejection and worker spawn failure publish no durable optimistic message pair.
- The in-memory optimistic pair remains visible while start is pending.
- Exact `agent_start` evidence persists the compatibility projection once and clears the durable draft.
- Text and selected attachments are restored after pre-agent rejection in the running app.
- A crash before projection persistence leaves Pi/journal evidence recoverable without provider retry.
- Post-admission settlement and mutation validation remain fail-closed.
- No CR038 draft-coalescing work, Mirror Core change or production mutation is introduced.

### Validation

- TDD for control-plane-only native admission and strict post-admission validation.
- Frontend lifecycle coverage for delayed persistence, draft clearing and non-mutating rejection.
- Complete Rust and frontend suites, `cargo check`, TypeScript and production build.
- Roadmap, relative-link and diff checks.
- Stop for Navigator Validation before push, merge, publication, release or production repair.

### Exclusions

- No Pi-backed Surface renderer integration.
- No CR038 composer-draft storage redesign or attachment persistence redesign.
- No provider invocation or retry.
- No Mirror delivery or Segment migration.
- No production Flip repair.

### Reversibility

Legacy projections remain readable. Reverting CR045 restores pre-admission compatibility staging without migrating Pi sessions, journals, projections or outbox items. No durable format changes are required.

### Authority Boundary

The Navigator selected CR045, approved Driver `@alissonvale`, Delivery `refinement/rs018-cr045-pre-agent-staging-atomicity`, focus, planning and implementation. Navigator Validation, push, merge, publication, release and production mutation remain separate decisions.

## Evidence

- `generatePacket()` currently calls `saveDedicatedJourneyConversation(stagedConversation)` before iterating `livePiAgentStream()`.
- `start_pi_invocation()` currently calls `validate_run_authority()`, whose persisted-turn validator requires the projection reconciliation to contain the new turn/run pair.
- Rejected attempts execute a compensating `saveRejectedReservationRollback()` even though no native transcript entry exists.
- The Flip production failure retained two pending user/empty-assistant pairs with no native admission or Pi entries.

## Outcome

Implementation is complete and awaiting Navigator Validation.

`start_pi_invocation` now uses a dedicated pre-admission validator. It validates correlation shape, active generation, Journey and Conversation binding, runtime channel, activation receipt, Mirror destination and exact Pi session file without reading the Desktop projection. Existing post-admission mutation and settlement paths retain stricter projection validation.

The staged user/empty-assistant pair remains in the in-memory runtime Surface while start is pending. The durable composer draft is preserved. Only exact `agent_start` / `working` evidence clears that draft and publishes the compatibility projection through the new `admitted_pre_frontier` save mode. Native save validation requires the exact candidate authority plus a running journal record or already-completed native Pi evidence, covering fast completion without admitting failed-to-spawn ghosts.

Pre-agent rejection now restores the captured base Conversation, draft and selected attachments in memory, reinspects exact native occupancy and cleans only an exact retained finalizing lease. `rollbackRejectedReservation()` no longer accepts or writes a projection. A process or app stop before agent start therefore leaves no optimistic transcript pair to roll back.

### TDD And Validation Evidence

- Native pre-admission coverage proves exact control-plane authority succeeds with an empty or absent Desktop projection while strict post-admission validation still rejects the missing correlated turn.
- Native mismatch coverage proves stale generation remains fail-closed at the pre-admission boundary.
- Frontend lifecycle coverage proves projection publication occurs only after the provider event loop reaches exact `working` evidence.
- Rejection coverage proves no rollback projection writer remains and the captured composer state is restored.
- Attachment integration coverage proves selected references remain optimistic until agent-start publication.
- Complete Rust suite: 151 passed, 1 ignored; `cargo check` passed without warnings.
- Complete frontend suite: 804 passed.
- TypeScript, production web build, roadmap consistency and diff checks passed.

No provider was invoked. No production app data, Mirror database or Mirror Core source was read or mutated. No push, merge, publication or release occurred.
