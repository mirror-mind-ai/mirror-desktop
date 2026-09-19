[< RS019](index.md)

# CR059: Make Post-Terminal Settlement Independent and Run-Scoped

**Status:** planned
**Driver:** @alissonvale
**Delivery:** `refinement/rs019-cr059-run-scoped-settlement`

## Problem

CR057 releases native occupancy at terminalization and CR058 removes retained journal debt from frontend admission. A successor may therefore start while an older run still has projection receipt-save, outbox acknowledgement, journal advancement or diagnostic work pending.

The current implementation already carries exact `JourneySettlementAuthority`, serializes persistence per Journey and rejects stale runtime reducer updates. It also reloads the generation projection before applying a Mirror receipt. Two remaining boundaries are not sufficient for real overlap:

1. Native `generation_scoped_post_frontier` save starts from the frontend candidate and requires that candidate to contain every persisted turn. If a successor is persisted after the old callback reloads but before its receipt-save, the old save fails with `dedicated_projection_turn_regression` instead of merging the exact old receipt into the newer projection.
2. Some frontend recovery completion and diagnostic paths remain Journey-scoped rather than exact-run/turn scoped. In particular, `retryPendingMirrorCommit()` publishes its returned projection unconditionally, and one Journey-keyed Mirror error slot lets an older callback clear or replace another run's diagnostic.

A late callback must be able to finish its exact debt without replacing a successor, but a stale or conflicting callback must still fail closed.

## Expected Behavior

Every post-terminal mutation is keyed to immutable Journey, thread, generation, run, turn, Pi entry, outbox item and Mirror destination authority. An older run may finish after a successor begins, but it can modify only its own reconciliation receipt, outbox item, journal record and exact diagnostic.

The persisted generation projection is merged monotonically under the native Journey/generation lock. Successor messages, reconciliation turns, terminal evidence, Steering evidence, checkpoints and metadata remain intact. UI publication occurs only when the visible projection still matches the settling authority; otherwise the durable merge completes silently and the successor stays visible.

## Plan Or Decision

### Confirmed Existing Safety

- `JourneySettlementAuthority` captures immutable run/turn/generation/session/message coordinates.
- `journeyPersistenceCoordinator` serializes same-Journey frontend phases and deduplicates only an exact run/turn/phase.
- outbox enqueue, append and acknowledgement validate exact item and destination authority.
- journal advancement is exact-authority and phase checked.
- runtime reducer actions carry immutable `JourneyRunIdentity` and reject replacement-run updates.
- CR057 cleanup validates `journeyId + runId`; stale cleanup cannot release a successor.
- most normal finalization UI writes already require `projectionCurrentTurnMatchesAuthority()`.

### Implementation Scope

1. Characterize the post-frontier race first
   - Add a Rust regression in which persisted projection A is loaded, successor B is persisted, then A's exact Mirror receipt candidate attempts `generation_scoped_post_frontier` save.
   - Require A's receipt to merge while B's messages, turn authority, terminal/action evidence, Steering evidence and unrelated metadata remain byte-equivalent at their semantic fields.
   - Add conflict cases for a mismatched A receipt, missing exact A turn, wrong outbox item/destination and contradictory already-committed evidence.

2. Make native post-frontier persistence an exact receipt merge
   - Under the existing Journey/generation projection stripe, treat persisted projection as the merge base for `generation_scoped_post_frontier`.
   - Validate candidate and persisted projection against the same exact authority and durable outbox item.
   - Copy only the exact target turn's compatible Mirror receipt plus a monotonic Mirror checkpoint into the persisted base.
   - Preserve every successor-owned or unrelated persisted field; never restore an older whole projection.
   - Return idempotent success when the exact receipt is already present and identical; reject conflicts or regressions.
   - Keep lifecycle, admitted-pre-frontier, active-pre-frontier and rollback save semantics unchanged.

3. Make frontend publication successor-safe
   - Centralize conditional publication of a settled projection behind exact Journey/thread/generation/current-turn checks.
   - Remove unconditional `conversationRef.current` / `setConversation` writes from manual Mirror recovery completion.
   - If a successor owns the visible Conversation, finish old durable settlement without replacing its transcript, Composer, live identity or runtime presentation.
   - Where the native merge may have incorporated newer state than the frontend candidate, reload the durable projection before publishing an exact-current result.

4. Scope settlement diagnostics and bookkeeping
   - Replace the single Journey-level late-callback error mutation with exact settlement-debt identity (`journeyId + runId + turnId` or outbox item where equivalent).
   - An old success clears only its own debt; an old failure cannot overwrite a successor's runtime warning or another outbox item's failure.
   - Derive selected-Journey notice presentation deterministically from retained exact debts without making any debt an admission gate.
   - Keep outbox removal exact-item based and journal advancement exact-authority based.

5. Prove delayed-callback isolation
   - Add frontend tests where A pauses after Mirror append or projection reload, B becomes the current persisted/visible run, then A succeeds and fails.
   - Assert B's transcript, current turn, Composer draft, runtime state, notice and native lease remain unchanged.
   - Assert A alone receives receipt/ack/journal progress or exact retained debt.
   - Cover repeated A completion and relaunch-style recovery as idempotent, model-free operations.

6. Update architecture language
   - Document native exact-receipt merge rather than whole-candidate post-frontier replacement.
   - Distinguish exact settlement debt presentation from current-run diagnostics and Conversation admission.
   - Record any broader multi-generation reconstruction issue as separate debt rather than widening CR059.

### Likely Affected Files

- `src-tauri/src/main.rs`
- `src/app/App.tsx`
- `src/app/journeySettlement.ts` if a pure publication/merge decision belongs at the settlement boundary
- `src/app/journeySettlementRecovery.ts`
- `src/app/journeyConversationStorage.ts` only if the native result must return merged projection data
- focused settlement diagnostic state/helper, if extraction keeps `App.tsx` bounded
- `src/tests/journeySettlement.test.ts`
- `src/tests/journeySettlementRecovery.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- Rust projection/outbox tests in `src-tauri/src/main.rs`
- `docs/architecture/app-architecture.md`
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

## Acceptance

- A's post-frontier receipt can commit after B is durably persisted in the same generation without deleting or regressing B.
- A late callback cannot replace B's visible transcript, Conversation identity, Composer draft, runtime status, native lease, notice or diagnostics.
- Exact A receipt-save, outbox acknowledgement and journal advancement remain idempotent across repeated completion and relaunch recovery.
- Contradictory receipt, outbox, generation, session, thread, run, turn or message authority fails closed without partial mutation.
- An old success clears only old debt; old failure remains visible as exact non-blocking debt and cannot overwrite another run's error.
- Missing Desktop projection remains recoverable only through existing Pi-backed/model-free routes; no transcript is invented from journal or outbox metadata.
- Mirror outage remains durable non-blocking debt.
- Native occupancy and `canSend` semantics from CR057/CR058 do not regress.
- No provider is rerun implicitly and no provider/model/credential fallback is introduced.

## Validation

- TDD with the native A-load → B-persist → A-receipt race first.
- Focused TypeScript tests for conditional publication, exact diagnostic clearing and delayed A success/failure after B replacement.
- Existing persistence coordinator, settlement recovery, outbox and runtime reducer suites.
- Complete frontend suite and TypeScript/Vite production build.
- Complete Rust suite, `cargo check --locked` and formatting check limited to touched Rust files; report unrelated workspace formatting debt without scope expansion.
- `npm run roadmap:check`, RS019 relative-link validation and `git diff --check`.
- Isolated DEV rehearsal with controlled old Mirror delivery debt: admit and settle a successor without relaunch, then complete/retry only the old model-free debt and verify the successor remains visible and unchanged.
- Verify stable app data and production Mirror remain unchanged.
- Stop for explicit Navigator Validation before closure, push, merge, publication, release or production-data recovery.

## Exclusions

- No change to Conversation admission or native occupancy classification from CR057/CR058.
- No redesign of Mirror Core schema, delivery ownership or remote idempotency.
- No generic projection reconstruction framework beyond the exact post-frontier receipt merge.
- No release-shaped all-frontier matrix; CR060 owns that rehearsal.
- No production Conversation/app-data repair.
- No CR053/CR054 work.
- No push, merge, release, publication, stable promotion, notarization or installation.

## Reversibility

The change remains behind existing exact save modes and durable outbox/journal authority. It introduces no schema migration. Reverting restores fail-closed post-frontier rejection and prior diagnostic presentation without rewriting Pi JSONL, journal, outbox, projection or Mirror data.

## Authority Boundary

The Navigator selected CR059 and confirmed Driver `@alissonvale` plus Delivery `refinement/rs019-cr059-run-scoped-settlement`. Planning is authorized through `planned`. Implementation/TDD, push, merge, publication, release, production mutation and CR060 work remain separate decisions.

## Evidence

- CR057 proved that an older run can retain post-terminal debt while a successor completes in the same process.
- CR058 proved that retained `interrupted`, `outbox_enqueued` and `settled` records no longer disable successor admission.
- Native post-frontier save currently validates exact outbox authority but calls `merge_persisted_mirror_evidence_except()` with the stale candidate as destination, so a newly persisted successor absent from that candidate produces `dedicated_projection_turn_regression`.
- `appendAndAcknowledgeExactProjection()` reloads before applying a receipt, narrowing but not eliminating the load/save race.
- `retryPendingMirrorCommit()` currently assigns the recovered settlement projection to `conversationRef` and React state without rechecking current-turn authority after awaited work.
- `mirrorCommitErrors` is keyed only by Journey, so exact old and successor settlement diagnostics can clear or replace one another.

## Outcome

Planned and ready for TDD. No CR059 implementation has started.
