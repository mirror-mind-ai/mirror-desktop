[< RS019](index.md)

# CR060: Rehearse Non-Blocking Post-Terminal Continuity

**Status:** captured
**Driver:** @alissonvale
**Delivery:** `refinement/rs019-cr060-post-terminal-rehearsal`

## Problem

RS018 acceptance emphasized reconstruction and relaunch recovery, but did not prove the stronger product invariant: after Pi terminalization, failure in any secondary frontier must still permit an immediate successor without restarting the app.

Without a composed failure matrix, isolated tests can close individual gaps while leaving another post-terminal state capable of retaining occupancy.

## Expected Behavior

A private-data-free, release-shaped rehearsal proves that once no exact Pi process remains active, the user can continue immediately despite failures in projection, journal advancement, Segment publication, outbox materialization, Mirror delivery, acknowledgement or presentation rendering.

## Proposed Scope

- Build deterministic fixtures for completed, cancelled, provider-failed and process-died terminal outcomes.
- Inject failure independently at each post-terminal frontier.
- Start a successor without relaunch while prior debt remains unresolved.
- Complete late old-run work after the successor starts and prove cross-run isolation.
- Relaunch and reconstruct both turns from Pi JSONL.
- Rehearse multiple Journeys and global-capacity behavior.
- Record bounded evidence suitable for Navigator validation and release review.

## Acceptance

For every post-terminal failure frontier:

- exact Pi transcript evidence remains intact;
- Composer becomes available without restart;
- successor admission succeeds only after the prior process is inactive;
- older debt remains visible and recoverable;
- late cleanup cannot affect the successor;
- no provider call is retried implicitly;
- relaunch preserves the same availability and transcript.

RS019 cannot close until this matrix passes in tests and an isolated development-app route receives explicit Navigator Validation.

## Authority Boundary

The Navigator selected CR060 as the next Workbench focus after closing CR059 and confirmed Driver `@alissonvale` plus Delivery `refinement/rs019-cr060-post-terminal-rehearsal`. CR060 remains `captured`; planning, status advancement, implementation/TDD, DEV mutation, validation, push, merge, publication and release require separate decisions.

## Boundaries

- Depends on CR057–CR059.
- Uses private-data-free fixtures and isolated development app data.
- Production app data remains read-only unless separately authorized.
- Release, publication and stable promotion remain separate decisions.
