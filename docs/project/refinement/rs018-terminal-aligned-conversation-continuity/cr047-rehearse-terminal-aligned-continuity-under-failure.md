[< RS018](index.md)

# CR047 — Rehearse Terminal-Aligned Continuity Under Failure

**Status:** done
**Driver:** @alissonvale
**Delivery:** `refinement/rs018-cr047-continuity-endurance-rehearsal`

## Problem

CR040–CR046 establish Pi-owned transcript authority, projection-independent admission, bounded lifecycle evidence, self-contained compatibility debt, non-authoritative pre-agent staging and Pi-backed presentation. RS018 still requires one deterministic, production-shaped rehearsal that proves these boundaries continue to compose under long history, compaction, missing caches, Mirror unavailability and interrupted native execution.

Existing unit evidence is distributed across subsystems. Without an explicit rehearsal matrix, the story could be closed from individually green components while an end-to-end failure class remains unexercised.

## Expected Behavior

- A private-data-free Pi fixture with at least 50 complete turns and one compaction reconstructs every visible native message in order.
- Deleting or never creating Desktop transcript projections and Conversation Segments does not prevent Pi-backed reconstruction.
- Projection-only ghosts do not appear after reconstruction.
- Native terminal completion admits a successor independently of Mirror delivery debt.
- Mirror-unavailable debt remains bounded, exact and retryable without redefining transcript state.
- Provider failure, cancellation, pre-agent rejection and stale native evidence never become successful turns or trigger implicit provider retry.
- Relaunch and interruption classes preserve exact active-run authority; vanished processes do not remain occupancy authority.
- Different Journeys may proceed within native capacity while the same Journey remains protected by exact reservation authority.
- All automated rehearsal state is isolated beneath temporary directories. Production app data and Mirror data remain untouched.

## Scope

### Deterministic endurance fixture

- Generate a bounded private-data-free Pi JSONL session with 50 ordinary turns, a native compaction entry and an incomplete admitted tail.
- Exercise the released active-branch inspection and Pi-backed Surface projector against that fixture.
- Verify exact message count, ordering, compaction diagnostics, incomplete-tail visibility and projection-ghost omission.

### Failure matrix

- Bind existing native occupancy, terminal classification, journal retention and Pi-backed outbox evidence into an explicit validation matrix.
- Add missing integration assertions only where the composed acceptance route lacks direct evidence.
- Run the complete frontend and Rust suites after focused TDD.

### Interactive rehearsal

- Use only the DEV channel and one scenario at a time.
- Relaunch around completed and incomplete states without implicit provider invocation.
- Any real provider turn requires an explicit Navigator submission.
- Record observed GUI outcomes separately from deterministic fixture evidence.

## Files

Expected primary files:

- `src-tauri/src/main.rs`
- `src/tests/continuityEnduranceRehearsal.test.ts`
- `src/tests/fixtures/continuityEndurance.ts`
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR and RS/Workbench indexes

Additional test-only files may change if the failure matrix exposes a missing seam. Product code changes require a demonstrated defect and must remain within RS018 authority boundaries.

## Acceptance

1. A deterministic 50-turn, compacted Pi fixture projects 100 ordered completed-turn messages and preserves the incomplete admitted user tail as message 101.
2. The same transcript reconstructs with no Desktop projection or Segment body present.
3. Projection-only ghosts and stale compatibility metadata cannot replace native content.
4. Existing exact tests cover Mirror-unavailable debt, projection-independent successor admission, provider failure, cancellation, pre-agent rejection, vanished-process recovery and cross-Journey native capacity.
5. Complete frontend, Rust, TypeScript, production build, roadmap, relative-link and diff checks pass.
6. Guided DEV relaunch confirms no duplicate, blank or raw-JSON messages and no implicit provider retry.
7. No production app data, Mirror database or Mirror Core source is mutated.
8. Navigator Validation is explicit before terminal closure.

## Validation Plan

- Red/green focused frontend endurance test.
- Red/green Rust active-branch endurance inspection test.
- Focused existing lifecycle, occupancy, journal and outbox suites.
- Complete frontend and Rust suites plus `cargo check`.
- TypeScript and production web build.
- Roadmap consistency, relative-link and `git diff --check`.
- Guided DEV relaunch, one scenario per Navigator response.

## Exclusions

- No production Flip Podcast repair or mutation.
- No 50 paid provider calls; deterministic native JSONL is the endurance oracle.
- No implicit provider invocation or retry.
- No Mirror Core schema, API, queue, source or release change.
- No stable promotion, installation, push, merge, publication or release.
- No claim that RS018 is closed merely because CR047 passes.

## Reversibility

All fixture state is generated in tests or temporary directories. Reverting CR047 removes rehearsal evidence without rewriting Pi sessions or compatibility state. Any product correction discovered during rehearsal must preserve Pi JSONL and use the existing reversible projection boundary.

## Authority Boundary

The Navigator explicitly requested CR047 creation, planning and execution and approved the existing Driver and proposed Delivery branch on 2026-09-18. Navigator Validation, production mutation, push, merge, publication, release and RS018 closure remain separate decisions.

## Outcome

Automated rehearsal and guided DEV relaunch execution are complete and accepted by Navigator Validation.

The private-data-free native fixture builds 50 complete user/assistant turns, inserts one Pi compaction after turn 25 and ends with one admitted user entry interrupted before an assistant response. Rust inspection reconstructs the exact 102-entry active branch, reports one compaction and 50 completed turns, projects 101 visible user/assistant entries and names the incomplete native user leaf. No Desktop projection, Segment body, journal or Mirror record exists in that fixture.

The frontend endurance fixture rebuilds the same 100 completed-turn messages plus incomplete tail in native order. Two deliberately supplied projection-only ghosts disappear, proving that compatibility presentation cannot replace Pi content.

### Failure Matrix Evidence

| Acceptance class | Deterministic evidence |
|---|---|
| 50-turn compacted reconstruction | `reconstructs_fifty_compacted_turns_and_an_interrupted_tail_without_desktop_caches`; `continuityEnduranceRehearsal.test.ts` |
| Missing projection and Segments | Native Rust fixture has neither; Pi-backed frontend projection receives metadata only |
| Mirror unavailable and successor admission | `completed_projected_turn_allows_a_successor_before_mirror_synchronization`; `permits a successor after exact local completion without waiting for Mirror synchronization`; Pi-backed outbox materialization tests |
| Provider failure and stale completion | `provider_error_with_zero_exit_is_a_terminal_failure_not_a_completed_turn`; `terminal_evidence_must_advance_beyond_the_pre_invocation_pi_leaf` |
| Cancellation | Pi process registry cancel/done race and directed-cancel tests; frontend cancelled-then-done mapping |
| Pre-agent rejection | `pre_admission_authority_does_not_require_an_optimistic_projection_turn`; rejected reservation integration tests |
| Relaunch and vanished execution | journal interruption/restart decision tests and exact registry terminal ownership tests |
| Cross-Journey concurrency | four-Journey production-capacity registry test and two-Journey journal interleaving test |
| Bounded retention and delivery debt | complete `turn_journal` and compatibility-outbox suites |

### Automated Validation Evidence

- Focused failure matrix: 88 frontend tests passed.
- Complete frontend suite: 816 passed.
- Complete Rust suite: 152 passed, 1 ignored.
- `cargo check`, TypeScript and production web build passed.
- Roadmap consistency and `git diff --check` passed.
- Global `cargo fmt --check` retains unrelated pre-existing drift beginning in `src-tauri/src/journey_appearance.rs`; no mass formatting was applied.
- Two provider turns were explicitly submitted by the Navigator during DEV validation. No provider was invoked implicitly. No production app data, Mirror database or Mirror Core source was read or mutated.

### Interactive DEV Evidence

Guided validation on 2026-09-18 confirmed:

- idle relaunch preserved ordered Conversation history without duplicates, blank messages, raw JSON or implicit retry;
- application termination during an explicitly submitted provider turn retained the admitted native user entry and fabricated no assistant response;
- relaunch did not retry the provider and did not retain vanished-process occupancy;
- the Composer was available immediately after relaunch;
- an explicitly submitted successor completed once with `sucessor confirmado`;
- a second relaunch preserved the interrupted user entry and the complete successor exactly once, with the Composer available.

The interrupted attempt displayed no dedicated interruption notice. This is a non-blocking UX observation rather than transcript, admission or recovery authority failure: the incomplete native entry remained visible and the successor route was immediately available. Whether to add explicit inactive-attempt explanation belongs to Debt Review; it is not silently treated as completed CR047 behavior.

### Navigator Validation

Accepted on 2026-09-18 after the deterministic endurance matrix and guided interruption/successor/relaunch route passed. Validation does not authorize push, merge, publication, release, production mutation or RS018 closure.

### Proportionality Review

The implementation is proportional. It adds private-data-free frontend and Rust endurance fixtures, binds existing failure tests into one explicit matrix and records observable DEV evidence. It changes no product behavior, durable schema, Pi session, Mirror Core contract or provider policy.

### Debt Review

Decision: `create_follow_up`.

CR048 captures the missing non-blocking explanation for an inactive admitted attempt with no terminal assistant response. The observation does not invalidate CR047: Pi transcript truth, native occupancy release, successor admission and relaunch continuity all held. Production Flip recovery, push, merge, release and RS018 closure remain separate decisions.
