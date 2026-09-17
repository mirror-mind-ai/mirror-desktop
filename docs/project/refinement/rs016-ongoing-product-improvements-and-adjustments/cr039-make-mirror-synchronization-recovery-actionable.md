[< RS016](index.md)

# CR039: Make Mirror Synchronization Recovery Actionable

**Status:** promoted
**Driver:** —
**Delivery:** `RS018 / CR040`

## Problem

Mirror Desktop can retain an exact Mirror append outbox item while rejecting the originating durable Conversation projection needed to replay it safely. In the observed incident, a generation-1 outbox item survived into normal use, but its persisted reconciliation classification no longer agreed with the classification derived from otherwise valid turn evidence. The fail-closed projection parser rejected the complete projection, so startup recovery reported `settlement_recovery_evidence_missing` rather than distinguishing absent evidence from internally inconsistent derived metadata.

The recovery surface then offered **Retry Mirror synchronization**, even though the click handler had additional runtime, retained-lease and ownership guards that were not represented in route availability. Those guards can return silently. The user can therefore select an apparently available recovery action and receive no progress, success or failure feedback.

## Expected Behavior

Mirror synchronization debt remains bound to its exact originating Journey, Conversation generation, turn and outbox item. Redundant reconciliation metadata is canonicalized only when all authoritative evidence remains valid; authority, checkpoint, native-ID or message-pair defects continue to fail closed. Recovery distinguishes missing, safely canonicalizable and invalid evidence.

A retry action is presented as available only when its durable and runtime prerequisites are satisfied. Once selected, every attempt reaches a visible terminal result: synchronization succeeds, fails with a bounded diagnostic, or reports that readiness changed before execution. No guard returns silently, no provider run is retried, and an older generation's debt does not block or masquerade as the active generation's work.

## Impact

The current behavior turns durable recovery into a misleading dead end: the app correctly preserves debt but cannot explain or repair it, while the visible action overstates what can be executed. This weakens trust in the synchronization boundary and makes a historical append failure appear to be a new random agent failure during ordinary use.

## Plan Or Decision

### Approved Plan

1. Make persisted projection loading distinguish `absent`, `loaded` and `invalid` outcomes with bounded reason codes instead of collapsing every parser rejection to `undefined`.
2. Treat reconciliation `classification` as derived metadata during persistence parsing: when authority, checkpoints, turn evidence, native identifiers and message pairs are valid, recompute the classification and return the canonical projection. Do not normalize authority mismatches, malformed evidence, checkpoint regressions or incomplete committed bodies.
3. Expand persisted settlement recovery into an explicit readiness result that binds the originating projection, outbox summary, exact settlement authority and any retained native lease. Preserve blocked debt without acknowledging, deleting or reassigning its outbox item.
4. Derive recovery routes from that readiness result rather than from the presence of a pending repair alone. A blocked or invalid historical item may expose safe escape routes and a diagnostic, but must not advertise exact retry.
5. Make `retryPendingMirrorCommit()` return an explicit outcome for every branch, including stale-render races, Journey ownership changes, runtime occupancy and already-running recovery. Surface immediate progress and bounded success or failure feedback through the recovery notice.
6. Keep old-generation synchronization scoped to its originating generation. Successful exact repair may settle and acknowledge that item; irrecoverable evidence remains durable and visible without blocking an independently ready active generation.
7. Preserve a bounded diagnostic for subsequent append failures so the app can distinguish the delivery failure from a later inability to reconstruct recovery evidence.

### Affected Files

Expected touchpoints, subject to TDD refinement:

- `src/domain/conversationReconciliation.ts`
- `src/domain/persistedJourneyConversation.ts`
- `src/app/journeyConversationStorage.ts`
- `src/app/journeySettlementRecovery.ts`
- `src/domain/conversationRecovery.ts`
- `src/app/App.tsx`
- `src/app/ConversationRecoveryNotice.tsx`
- `src/app/mirrorAppendOutboxStorage.ts` only if bounded attempt diagnostics require storage support
- focused tests under `src/tests/` for reconciliation parsing, persisted projections, settlement recovery, route selection, notice feedback and runtime integration

### Acceptance

- The incident fixture with valid authority and turn evidence but stale `commit_failed` derived metadata loads as a canonical `commit_pending` projection.
- The parser still rejects altered authority, invalid native IDs, malformed committed bodies, invalid checkpoints and mismatched Mirror Conversation identity.
- An exact generation-1 outbox item can be evaluated and repaired from its generation-1 projection while generation 2 remains independently usable.
- A retry button is not offered when exact evidence or runtime readiness is unavailable.
- If readiness changes after render, selecting retry produces a visible bounded diagnostic rather than returning silently.
- While retry executes, the notice communicates progress and prevents duplicate execution; completion produces visible success or failure feedback.
- Neither automatic recovery nor a manual synchronization retry invokes the provider.
- Failed or irrecoverable outbox items are never silently deleted, acknowledged, retargeted or assigned to another generation.

### Validation

- Add a redacted structural regression fixture derived from the observed generation-1 projection and outbox summary; do not copy private message content into the repository.
- Use unit tests to prove narrow classification canonicalization and fail-closed rejection of authoritative defects.
- Exercise route/readiness combinations for exact repair, invalid evidence, runtime occupancy, retained exact finalization and stale click races.
- Add component or integration coverage proving progress plus terminal feedback and proving that no click path exits silently.
- Prove provider invocation functions are absent from synchronization recovery paths.
- Run focused recovery suites, the complete frontend suite, TypeScript and the production web build. Run Rust tests and `cargo check` if native outbox persistence changes.
- Rebuild and validate with isolated `Mirror Desktop Dev` data containing synthetic historical debt; do not mutate production app data.

### Exclusions

- No implicit provider retry or regeneration of the assistant response.
- No weakening of Journey, Conversation, generation, turn, run, message or native-session authority checks.
- No generic repair of arbitrary malformed projections.
- No automatic discard, acknowledgement or reassignment of unresolved outbox debt.
- No reopening RS017, release preparation, publication, stable promotion or protected Mirror/app-data mutation.

### Authority Boundary

The Navigator promoted this concern into RS018 / CR040 after a second normal-use incident showed that the defect belongs to the broader Conversation authority architecture. This document remains evidence; it does not authorize isolated CR039 implementation. Commit, push, merge, publication and release remain separate decisions.

## Evidence

Read-only inspection on 2026-09-17 found:

- a retained `mirror-desktop` generation-1 outbox item while the active Conversation had advanced to generation 2;
- a complete generation-1 projection whose basic messages, attachment normalization and live identity were valid;
- reconciliation authority and individual turn evidence that were structurally valid;
- stored reconciliation `classification: commit_failed` although no body remained failed and the same evidence deterministically derived `commit_pending`;
- `parseConversationReconciliationState()` rejecting that mismatch, causing `parsePersistedJourneyConversation()` and `loadDedicatedJourneyConversation()` to return no projection;
- `resolvePersistedSettlementRecovery()` consequently reporting `settlement_recovery_evidence_missing`;
- recovery route selection advertising exact retry from `pendingMirrorRepair`, while `retryPendingMirrorCommit()` retained several silent precondition returns not represented by the route contract.

The exact historical guard that stopped the observed click cannot be proven after the event because those runtime conditions are not durably recorded. The source establishes that silent no-op outcomes are possible, and the screenshot plus disabled operational state are consistent with one of those guards. The original append failure also cannot be attributed to network or endpoint behavior because its bounded failure diagnostic was not retained.

No production data was changed during diagnosis.

## Outcome

Promoted to RS018 / CR040. The stale Mirror synchronization incident now informs the terminal-aligned Conversation authority contract rather than proceeding as an isolated retry correction.
