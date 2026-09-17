[< RS018](index.md)

# CR042: Decouple Successor Admission from Desktop Projections

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr042-projection-independent-admission`

## Problem

A completed or otherwise terminal Pi invocation can remain permanently successor-ineligible because native journal admission revalidates historical `projected` records against the dedicated Desktop Conversation projection. That projection may be absent, unparsable, Segment-local or stale even when the exact Pi session and terminal journal evidence are intact.

Flip Podcast demonstrated the consequence: a completed Pi response survived, but a Segment-local message count regressed against a generation checkpoint. The Desktop projection remained conflicted, later `admit_turn_journal()` rejected the historical completed record before Pi could start, and the frontend reported the failure as `Could not start the local Pi worker`. Relaunch could not help because the projection disagreement was durable.

This violates the RS018 authority contract. Presentation repair, Segment state and Mirror delivery debt cannot occupy a Conversation after exact native execution has ended.

## Expected Behavior

Successor admission depends on exact control-plane binding and active native execution, not on the health of a Desktop projection. An exact invocation that is currently reserved, running or completing bounded in-process terminalization may block. A completed, failed, cancelled, interrupted or otherwise inactive historical attempt does not block merely because its projection, Segment or Mirror delivery state disagrees.

The turn journal remains durable lifecycle and terminal evidence. It does not reload a Desktop transcript to certify provider completion. Admission failures are classified at the admission boundary and are not mislabeled as Pi worker spawn failures. No recovery path invokes the provider without a new explicit user submission.

## Impact

This restores ordinary continuation for Conversations whose Pi transcript is healthy but whose derived Desktop state is stale. It removes the most direct runtime availability dependency on the superseded three-body reconciliation architecture while preserving exact Journey and generation routing, active process capacity and all historical evidence for later repair.

## Plan Or Decision

### Proposed Scope

1. Characterize current admission
   - Add focused tests around `admit_turn_journal()`, `is_successor_eligible()`, `start_pi_invocation()` and retained native leases.
   - Reproduce the Flip failure structurally with private-data-free authority, journal and projection fixtures.
   - Distinguish admission rejection from actual worker spawn failure in native and frontend error mapping.

2. Establish one successor-admission decision
   - Derive occupancy from exact native registry state plus the current journal lifecycle record.
   - Preserve fail-closed control-plane validation for Journey, thread, generation, Pi session and runtime channel.
   - Treat only an exact active or still-finalizing native execution as Conversation occupancy.
   - Treat terminal historical records as non-blocking regardless of projection, Segment or Mirror state.

3. Remove projection certification from admission
   - Stop calling dedicated Desktop projection validators when admitting a successor after terminal Pi evidence.
   - Keep projection validation in projection-writing or explicit repair paths where it belongs.
   - Preserve journal and projection files unchanged for later reconstruction; do not normalize them during admission.

4. Make relaunch behavior explicit
   - Do not interpret a vanished in-memory registry lease as durable process occupancy.
   - Preserve incomplete or ambiguous historical evidence for diagnosis and explicit recovery without silently rerunning Pi.
   - Keep current same-process bounded finalization protection so a genuinely live child cannot overlap its successor.

5. Verify availability without settling debt
   - Confirm that stale projection classification, checkpoint regression, missing Segment state and pending Mirror delivery do not change successor eligibility after exact execution ends.
   - Confirm that active execution and stale control-plane coordinates still reject admission.
   - Confirm no admission test acknowledges outbox debt or mutates Mirror state.

### Likely Affected Files

- `src-tauri/src/main.rs`
- `src-tauri/src/turn_journal.rs`
- `src/domain/conversationAvailability.ts` only if the frontend contract needs a narrower native reason
- `src/app/App.tsx` only for admission-error classification, not transcript integration
- focused Rust and frontend tests
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR document

### Acceptance

- A completed Pi turn with stale, missing or conflicted Desktop projection state admits a successor when no exact native process remains active.
- Failed, cancelled and explicitly interrupted inactive attempts do not retain Conversation occupancy.
- A currently reserved, running or bounded-finalizing exact invocation still blocks overlap.
- Invalid Journey, thread, generation, Pi-session or runtime-channel authority remains fail-closed.
- Journal admission does not read or validate dedicated Desktop Conversation or Segment projections.
- Projection and Mirror debt remain durable and visible to their independent repair paths.
- Relaunch does not infer a live process from a vanished in-memory lease and never reruns the provider implicitly.
- Native admission rejection and worker-spawn failure are surfaced as distinct diagnostics.
- A private-data-free Flip-shaped fixture proves that `checkpoint_regression` cannot prevent successor admission.
- Existing healthy Pi session, generation, title, catalog and Mirror destination bindings remain unchanged.

### Validation

- TDD with focused native journal and invocation-admission tests.
- Focused frontend error-boundary tests if frontend mapping changes.
- Complete Rust suite and `cargo check`.
- Complete frontend suite, TypeScript and production web build.
- `npm run roadmap:check`, `git diff --check` and relative-link validation.
- Isolated development-app rehearsal covering completion, provider failure, cancellation, relaunch and stale projection debt.
- Stop for explicit Navigator Validation before any production-data recovery or release work.

### Exclusions

- No Pi transcript Surface integration; that follows the CR041 reconstruction contract in a separate CR.
- No pre-agent optimistic staging redesign.
- No compatibility-outbox migration or Mirror Core change.
- No Conversation Segment deletion or checkpoint migration.
- No historical projection rewrite, acknowledgement or production Flip repair.
- No provider retry, generation reset or new Pi session for a healthy existing generation.
- No commit to an implementation Delivery branch, push, merge, publication or release without the applicable authority.

### Reversibility

The change removes an admission dependency rather than deleting evidence. Journal, Pi, projection, Segment and outbox files remain untouched. If validation finds an unsafe overlap case, the admission policy can be reverted without data migration.

### Authority Boundary

The Navigator confirmed Driver `@alissonvale`, Delivery `refinement/rs018-cr042-projection-independent-admission`, selection, focus, transition to `in_progress` and local implementation, accepted Navigator Validation, selected Debt Review `create_follow_up` and authorized terminal closure on 2026-09-17. Production mutation, push, merge, publication and release remain separate decisions.

## Evidence

- CR040 established that only exact active execution may block a successor and that presentation projections are not authority.
- CR041 proved that the exact active Pi transcript can be inspected independently of the Desktop projection.
- Flip Podcast retained completed Pi and journal evidence while projection reconciliation reported `checkpoint_regression` and blocked later admission.
- Current native admission validates historical locally completed projections before worker start, allowing presentation disagreement to masquerade as a worker-start failure.

## Navigator Validation

**Accepted:** 2026-09-17

The Navigator accepted the native-occupancy authority boundary, projection-independent journal admission, relaunch behavior, distinct admission diagnostics and automated regression evidence. Acceptance does not authorize production Flip repair, release or later RS018 migration slices.

## Proportionality And Debt Review

The delivered authority correction is proportional: it removes historical projection and journal occupancy gates while retaining exact native capacity, lifecycle evidence and control-plane validation. It does not migrate transcript, delivery or production data.

Debt decision: `create_follow_up` as [CR043](cr043-keep-bounded-turn-journal-retention-non-blocking.md). The journal's 64-record and serialized-byte bounds can still return `turn_journal_full` when accumulated unresolved historical records cannot be evicted, reintroducing an availability gate despite no active native execution. CR043 will make bounded lifecycle retention deterministic and non-blocking without creating an archive authority.

## Outcome

Done. Projection-independent successor admission is accepted. Bounded journal retention debt continues explicitly as CR043.

Native reservation now owns same-Journey overlap prevention. Journal admission appends the newly reserved run without consulting historical Desktop or Segment projections and without treating historical admitted, running, terminal, projected or delivery records as process occupancy. Exact run identity, Journey/thread/generation/Pi-session binding and runtime-channel validation remain unchanged.

The frontend now surfaces a journal blocker only when it correlates to the exact active native run. When the registry is empty after relaunch, stale journal lifecycle records remain durable but cannot set `localAdmissionReady` false or retain an unavailable Conversation.

Admission rejection is distinct from worker spawn failure. A pre-worker journal admission failure releases the newly terminalized reservation and returns `Pi invocation admission failed: <reason>` without fabricating spawn evidence. A real worker-thread spawn failure retains the existing durable terminalization path.

The obsolete locally-completed projection admission validator and its projection-certification test were removed. Projection validators used by projection persistence and explicit settlement remain unchanged.

### TDD And Validation Evidence

- The initial native test failed with `turn_journal_journey_occupied` when a historical running record preceded a successor.
- Native tests now cover journal-independent successor admission, stale completed projection evidence, failed projection evidence, exact registry occupancy and distinct admission/worker errors.
- Frontend tests prove that journal records block only when correlated to the exact active native run and that native admission diagnostics survive the stream boundary.
- Complete Rust suite: 142 passed, 1 ignored.
- Complete frontend suite: 802 passed.
- `cargo check`: passed without warnings.
- TypeScript and production web build: passed.

No provider was invoked. No Pi session, projection, Segment, journal, outbox, Mirror Core file or production app-data file was rewritten during implementation.
