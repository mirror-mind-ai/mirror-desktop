[< RS019](index.md)

# CR060: Rehearse Non-Blocking Post-Terminal Continuity

**Status:** planned
**Driver:** @alissonvale
**Delivery:** `refinement/rs019-cr060-post-terminal-rehearsal`

## Problem

RS018 acceptance emphasized reconstruction and relaunch recovery, but did not prove the stronger product invariant: after Pi terminalization, failure in any secondary frontier must still permit an immediate successor without restarting the app.

CR057 corrected native occupancy, CR058 removed journal-derived admission and CR059 made late settlement run-scoped. Without one composed, release-shaped failure matrix, isolated tests can still leave a post-terminal frontier or terminal outcome unexercised, and manual evidence can omit a required invariant without being detected.

## Expected Behavior

A private-data-free, release-shaped rehearsal proves that once no exact Pi process remains active, the user can continue immediately despite failures in projection, journal advancement, Segment publication, outbox materialization, Mirror delivery, acknowledgement or presentation rendering.

The rehearsal covers completed, cancelled, provider-failed and process-died outcomes across every secondary frontier. It proves same-process successor admission, exact old-debt retention, late-cleanup isolation, no implicit provider rerun, Pi-backed relaunch reconstruction, multiple-Journey independence and active-only global capacity.

## Plan Or Decision

1. Define a bounded evidence contract
   - Add a deterministic validator for the exact 4 × 7 outcome/frontier matrix.
   - Accept only the DEV app identifier, bounded identifiers, exact keys and one result per required coordinate.
   - Require transcript integrity, process inactivity before successor admission, same-process Composer availability, visible old debt, successor isolation, unchanged provider-call count and relaunch equivalence.
   - Emit only counts and a digest suitable for release review; reject prompt, response and arbitrary metadata fields.

2. Compose the production authority functions in tests
   - Build private-data-free fixtures for `completed`, `cancelled`, `provider_failed` and `process_died` terminal outcomes.
   - Exercise projection, journal, Segment, outbox, Mirror, acknowledgement and presentation debt without adding any new admission input.
   - Use actual native occupancy and `ConversationAvailability` decisions to prove each terminal lease is non-blocking while unknown/open occupancy remains fail-closed.
   - Prove a successor can become current while exact older diagnostics remain retained.

3. Prove cross-run and cross-Journey isolation
   - Complete old cleanup against a fresh registry inspection containing a replacement run and require the successor to remain active.
   - Cover multiple Journeys and global capacity so released finalization debt consumes no slot while exact active execution still blocks.
   - Verify old success clears only old settlement diagnostics and old failure cannot overwrite successor debt.

4. Prove relaunch reconstruction without provider work
   - Rebuild both old and successor turns from a private-data-free Pi inspection while ignoring stale Desktop projection messages.
   - Re-run availability from reconstructed terminal evidence and require the same non-blocking result.
   - Assert the rehearsal path contains no provider retry, model fallback or credential inference.

5. Prepare isolated DEV validation
   - Add a package command for validating a captured rehearsal evidence document.
   - Record the exact matrix contract and evidence path in architecture documentation.
   - Do not mutate ordinary DEV data or run the live isolated matrix until separately authorized.

## Affected Files

- `scripts/rs019_post_terminal_matrix.mjs`
- `src/tests/rs019PostTerminalMatrix.test.mjs`
- `src/tests/postTerminalContinuityMatrix.test.ts`
- `src/tests/fixtures/postTerminalContinuity.ts`
- `package.json`
- `docs/architecture/app-architecture.md`
- `docs/architecture/terminal-aligned-conversation-authority.md`
- this CR and RS019 Workbench records

Runtime source changes are excluded unless TDD exposes a concrete regression in the already accepted CR057–CR059 authority behavior.

## Acceptance

For every post-terminal failure frontier and terminal outcome:

- exact Pi transcript evidence remains intact;
- Composer becomes available without restart;
- successor admission succeeds only after the prior process is inactive;
- older debt remains visible and recoverable;
- late cleanup cannot affect the successor;
- no provider call is retried implicitly;
- relaunch preserves the same availability and transcript.

Additionally:

- unknown or genuinely active native occupancy remains fail-closed;
- released terminal debt does not consume global capacity across Journeys;
- the evidence validator rejects incomplete, duplicate, private or contradictory reports;
- RS019 does not close until the automated matrix passes and an isolated development-app route receives explicit Navigator Validation.

## Validation

- TDD for a missing matrix coordinate before implementing the evidence validator.
- Focused Vitest suites for the evidence contract and composed continuity matrix.
- Existing availability, occupancy, settlement diagnostics, recovery, Pi-backed projection and runtime integration suites.
- Complete frontend suite and TypeScript/Vite production build.
- Rust suite and `cargo check --locked` because the rehearsal certifies the native boundary even if Rust source remains unchanged.
- `npm run roadmap:check`, RS019 relative-link validation and `git diff --check`.
- Separate explicit authorization before isolated DEV app-data preparation, fault injection or live rehearsal.
- Stop for explicit Navigator Validation before RS019 closure, push, merge, publication or release.

## Exclusions

- No new Conversation admission, occupancy or settlement semantics without a failing acceptance case.
- No production app-data or Conversation repair.
- No Mirror Core schema or runtime modification.
- No implicit provider retry, provider/model fallback or credential inference.
- No release publication, stable promotion, notarization or installation.
- No CR053/CR054 work.

## Reversibility

The deliverable is a private-data-free validator, fixtures, tests, package command and documentation. It introduces no durable schema or production mutation. Reverting removes the rehearsal contract without rewriting Pi JSONL, projections, journals, Segments, outbox or Mirror data.

## Authority Boundary

The Navigator selected CR060, confirmed Driver `@alissonvale` plus Delivery `refinement/rs019-cr060-post-terminal-rehearsal`, and explicitly authorized planning and implementation. Isolated DEV mutation, Navigator Validation, push, merge, publication, release and production mutation remain separate decisions.

## Boundaries

- Depends on CR057–CR059.
- Uses private-data-free fixtures and isolated development app data.
- Production app data remains read-only unless separately authorized.
- Release, publication and stable promotion remain separate decisions.

## Evidence

- CR057 proved exact terminal leases release native occupancy before secondary settlement completes.
- CR058 proved retained journal phases do not participate in `canSend`.
- CR059 proved exact late receipt merge and run-scoped diagnostic publication while a successor exists.
- RS018 supplies a bounded DEV app-data sandbox, terminal-window watcher and Pi-backed endurance fixture that can be reused without exposing content.

## Outcome

Plan approved for implementation. TDD begins with the bounded matrix validator and then composes the accepted CR057–CR059 authority functions across all required coordinates.
