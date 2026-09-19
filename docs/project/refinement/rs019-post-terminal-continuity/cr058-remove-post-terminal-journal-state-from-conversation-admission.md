[< RS019](index.md)

# CR058: Remove Post-Terminal Journal State from Conversation Admission

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs019-cr058-journal-admission-release`

## Problem

Even after CR057 narrows native occupancy, frontend availability still accepts `localAdmissionReady: !blockingTurnJournalRecord`. The live submission path also repeats `Boolean(blockingTurnJournalRecord)` as a direct guard after computing `conversationAvailability`.

This leaves a retained or stale turn-journal recovery record with direct power over `canSend` and `generatePacket("live")`, even when exact native inspection proves there is no active writer. The journal record may be useful for diagnosis, response projection or model-free repair, but it is not process occupancy.

CR057's DEV proof showed the corrected target behavior when occupancy reconciliation cleared the stale gate after a forced projection failure. CR058 makes that outcome contractual rather than dependent on state-clearing order.

## Expected Behavior

Conversation submission derives admission from exact Conversation/control-plane readiness and active native execution only. Journal records may select notices and explicit model-free recovery actions, but cannot independently disable Send after native inactivity is established.

The frontend must preserve these distinct facts:

- unknown native inspection remains fail-closed;
- an exact open reserved/running native execution blocks overlap;
- a process-local start reservation or selected live runtime blocks duplicate submission;
- the native admission command remains the atomic authority for durable journal admission and process start;
- post-terminal journal evidence remains visible and recoverable without owning `canSend`.

## Plan Or Decision

### Proposed Scope

1. Characterize the duplicated journal admission gates
   - Add failing domain tests that remove journal readiness from the Conversation availability input.
   - Add App integration/source-contract tests proving a retained recovery record is not passed to availability and is not checked independently by the live submission path.
   - Table-drive `terminal_durable`, `projected`, `outbox_enqueued`, `settled` and `interrupted` presentation/debt states under known-inactive occupancy.

2. Remove journal state from Conversation availability
   - Remove `localAdmissionReady`, `local_admission_unavailable` and `repair_local_admission` from the availability contract when they represent a retained journal record.
   - Keep Conversation authority, runtime binding, live selected execution, unknown inspection, exact same-Journey occupancy, global capacity and active recovery inspection as explicit independent conditions.
   - Preserve native `start_pi_invocation` journal admission as the final atomic fail-closed boundary; a new journal write failure must reject before provider spawn rather than being predicted from historical records.

3. Remove direct submission coupling in `App.tsx`
   - Stop passing `!blockingTurnJournalRecord` into `decideConversationAvailability()`.
   - Remove the duplicate `Boolean(blockingTurnJournalRecord)` guard from `generatePacket("live")`.
   - Ensure Send button and Enter submission use only the canonical availability result plus existing provider/settings/attachment validation and exact start-reservation guard.

4. Separate recovery presentation from admission
   - Retain the exact journal record for notices, evidence classification and explicit model-free recovery routes.
   - Rename blocking-oriented local concepts where needed so presentation debt is not described as execution authority.
   - Update notices and Composer placeholders so inactive debt says the user may continue, while unknown inspection or real active execution still explains why Send is unavailable.
   - Do not make recovery actions implicit or start a provider from any recovery route.

5. Preserve non-submission safety boundaries
   - Audit restart/reset and administrative controls separately from Send. Keep any generation-mutation guard that protects active persistence unless this CR can prove it is only the same obsolete post-terminal journal gate.
   - Do not redesign projection, outbox, acknowledgement or late-callback ordering; record any cross-run settlement dependency for CR059.

### Likely Affected Files

- `src/domain/conversationAvailability.ts`
- `src/app/App.tsx`
- `src/app/composerPlaceholder.ts`
- `src/app/turnJournal.ts` only if naming/classification must be clarified
- `src/domain/conversationRecovery.ts` only to preserve recovery routes independently of admission
- `src/tests/conversationAvailability.test.ts`
- `src/tests/conversationRecovery.test.ts`
- `src/tests/composerPlaceholder.test.ts`
- `src/tests/journeyRuntimeIntegration.test.ts`
- focused post-terminal integration coverage
- `docs/architecture/terminal-aligned-conversation-authority.md`
- `docs/architecture/app-architecture.md`
- this CR document

### Acceptance

- `terminal_durable`, `projected`, `outbox_enqueued`, `settled` and `interrupted` records cannot independently disable Send.
- A retained journal recovery record may render an exact notice and recovery action while `canSend` remains true.
- An active exact native run still blocks same-Journey overlap.
- Unknown native inspection remains bounded fail-closed.
- Invalid Conversation/control-plane authority still blocks submission.
- A new native journal-admission failure rejects before provider spawn and restores reversible staging without implicit retry.
- Send button, Enter and `generatePacket("live")` converge on one availability decision rather than retaining a hidden journal guard.
- Recovery actions remain exact, explicit and model-free.
- Restart does not change availability solely by erasing process-local correlation.
- No provider retry, fallback, model switch or credential inference is introduced.

### Validation

- TDD with focused `conversationAvailability` tests first.
- Focused App/integration tests for every post-terminal journal phase under known inactive occupancy.
- Regression tests for unknown inspection, active same-Journey occupancy, live selected execution and pre-spawn native admission rejection.
- Focused recovery-route and placeholder tests.
- Complete frontend suite and TypeScript/Vite production build.
- Complete Rust suite and `cargo check --locked` if native integration expectations change; otherwise confirm no native source diff and retain CR057's native evidence.
- `npm run roadmap:check`, RS019 relative-link validation and `git diff --check`.
- Isolated DEV rehearsal: retain exact terminal journal debt, confirm Send remains available, submit a successor without relaunch and verify no automatic provider retry or cross-run evidence mutation.
- Stop for explicit Navigator Validation before closure, push, merge, publication, release or production-data recovery.

### Exclusions

- No redesign of post-terminal async settlement ordering or active-generation assumptions; CR059 owns that.
- No release-shaped all-frontier failure matrix; CR060 owns that.
- No production Conversation repair or app-data mutation.
- No provider error text work; CR054 remains separate.
- No model/argument clarity work; CR053 remains separate.
- No push, merge, release, publication, stable promotion, notarization or installation.

### Reversibility

The change removes an obsolete frontend admission input and hidden duplicate guard. Native atomic admission, occupancy inspection and journal evidence remain intact, so the frontend contract can be reverted without migrating Pi JSONL, journal, projection, Segment, outbox or Mirror data.

### Authority Boundary

The Navigator selected CR058, confirmed Driver `@alissonvale` plus Delivery `refinement/rs019-cr058-journal-admission-release`, authorized implementation/TDD, accepted Validation and explicitly authorized terminal closure. Push, merge, publication, release, production mutation and CR059/CR060 work remain separate decisions.

## Evidence

- CR057 established and validated that only exact open reserved/running native entries occupy a Journey.
- `decideConversationAvailability()` still accepts `localAdmissionReady` and maps false to `local_admission_unavailable`.
- `App.tsx` still passes `localAdmissionReady: !blockingTurnJournalRecord`.
- `generatePacket("live")` independently includes `Boolean(blockingTurnJournalRecord)` after canonical availability is computed.
- Recovery-route derivation already accepts journal evidence separately and remains model-free.
- CR057's forced DEV projection failure proved a complete terminal answer and immediate same-process successor without production mutation.
- TDD removed `localAdmissionReady`, `local_admission_unavailable` and `repair_local_admission`, then removed the independent `Boolean(blockingTurnJournalRecord)` live-submission guard.
- Focused availability coverage table-drives `terminal_durable`, `projected`, `outbox_enqueued`, `settled` and `interrupted` debt while App source-contract coverage proves retained recovery evidence is absent from submission admission.
- Frontend regression: 856 tests passed across 155 files.
- TypeScript/Vite production build, roadmap consistency, RS019 relative links and whitespace validation passed.
- No native source changed; Rust behavior remains the CR057 terminal-occupancy boundary.
- Authorized isolated DEV rehearsal passed on disposable Journey `us1-rerun-a-0831us1-rerun-a-0831` in one unrestarted debug-app process (`PID 81645`):
  - startup retained 17 journal records, including exact `interrupted`, `outbox_enqueued` and `settled` debt, while the Composer remained available;
  - the available Composer admitted successor `agent-run-2026-09-19T21:03:50.886Z` without relaunch and rendered `CR058 SUCCESSOR`;
  - the successor reached `settled / completed / complete` in the same process;
  - the older CR057 records remained independently inspectable at `outbox_enqueued / completed / complete` and `settled / completed / complete`;
  - no automatic provider retry, fallback or model switch occurred, and the DEV process chain was stopped explicitly.
- Rehearsal artifacts are under `/tmp/rs019-cr058-dev-20260919T205931Z/`, including journal snapshots, process identity, stable-data digests and screenshots of ready, running and settled states.
- Stable app data remained byte-identical across 135 files (`7a4582496c5b2924435f70cf373dc4b9617791e8162c9d4ea52cc85271904c95`). Production app-data, release state and remote repository state were not mutated.

## Navigator Validation

**Accepted.** The Navigator accepted the automated checks and isolated same-process DEV rehearsal as sufficient evidence that retained post-terminal journal debt no longer owns Conversation admission while exact native safety boundaries remain intact.

## Proportionality and Debt Review

**Result:** `no_action`

- The implementation deletes one obsolete availability input, its condition/action pair and one duplicated live-submission guard; it introduces no replacement authority or state machine.
- Journal evidence, notices and explicit model-free recovery remain available without being promoted back into occupancy.
- Native atomic journal admission, unknown-inspection fail-closed behavior, exact active execution, start reservation and selected live runtime continue to protect overlap.
- No schema, migration, background scheduler, retry, queue, provider/model fallback, credential inference or production-data repair was introduced.
- Post-terminal settlement ordering and cross-run callback isolation remain intentionally sequenced CR059 scope, not hidden CR058 debt.
- The broader release-shaped frontier rehearsal remains CR060 scope.

## Outcome

Done. The Navigator accepted Validation, the proportionality/debt review concluded `no_action`, and terminal closure was explicitly authorized. Retained post-terminal journal records no longer disable Send or independently block live submission. RS019 remains active with no selected CR; CR059 remains captured. Push, merge, publication, release and production repair remain unauthorized.
