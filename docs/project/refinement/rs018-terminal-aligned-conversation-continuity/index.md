[< Refinement Workbench](../index.md)

# RS018: Terminal-Aligned Conversation Continuity

**Status:** active

## Framing

Mirror Desktop pursued stronger recovery and synchronization guarantees than the Mirror terminal by persisting one agent turn across a Pi session, Desktop projection, turn journal, native invocation registry, Conversation Segments, Mirror append outbox and Mirror Conversation. Normal sustained use showed that these bodies can become competing authorities. A stale projection prevented outbox repair in one Journey; a Segment-local message count regressed against a generation checkpoint in another, leaving a completed Pi turn unable to admit a successor after relaunch.

The terminal avoids this failure class because the Pi session owns conversation continuity and Mirror logging is a non-blocking side effect. RS018 reorients the Desktop toward that authority shape while preserving capabilities that genuinely require a desktop coordinator.

## Desired Outcome

A durable Pi session is the authoritative transcript of an agent Conversation. Only an actually active invocation may block another turn for the same authority. The Desktop projection and Conversation Segments are rebuildable views. The turn journal preserves active lifecycle and terminal evidence without becoming a second transcript. Mirror synchronization is independent delivery debt that never prevents local continuation.

The Desktop retains exact Journey and Conversation routing, concurrent Journeys, streaming, cancellation, attachments, steering, relaunch recovery and explicit Mirror delivery without requiring every representation to agree before ordinary use can continue.

## Authority Contract

- Pi session JSONL owns the durable agent transcript and native entry identity.
- Native invocation occupancy owns only current process capacity and active execution.
- The turn journal owns active lifecycle transitions and terminal evidence needed across interruption.
- Desktop projections own local presentation and Desktop-only metadata; they must be rebuildable.
- Conversation Segments own bounded history presentation; they never define transcript counts or settlement authority.
- The Mirror append outbox owns unacknowledged delivery debt and enough exact coordinates to retry delivery independently.
- Mirror Conversations are synchronized memory projections, not prerequisites for the next Pi turn.
- Provider execution is never repeated implicitly during reconstruction or delivery repair.

## Work Shape

RS018 begins with an explicit authority inventory and migration contract before runtime changes. Subsequent CRs should move one boundary at a time: successor admission, transcript reconstruction, Mirror delivery isolation, Segment demotion, existing-data recovery and sustained-use validation. Each migration must preserve current durable evidence and include a rollback or compatibility path until the superseded authority is removed.

## Acceptance Horizon

The story is not complete when isolated unit tests pass. Closure requires sustained normal use across long Conversations, Pi compaction, multiple Segments, Mirror unavailability, provider failure, cancellation, application termination, relaunch and concurrent Journeys. A derived projection must be deletable and reconstructible without losing the Pi transcript or blocking a successor.

## Boundaries

- Journey authority is exactly `mirror-desktop`.
- Refinement remains file-first at `docs/project/refinement/index.md`; legacy SQLite is not consulted or dual-written.
- Production Mirror Desktop app data is read-only evidence until a separately reviewed recovery operation receives explicit authorization.
- No step may retry the provider implicitly, weaken exact Journey routing or silently discard unresolved Mirror delivery debt.
- RS018 must work with the currently released Mirror Core. The Desktop may use the existing append CLI through a non-blocking compatibility outbox, but must not require Mirror Core code, schema, queue or release changes.
- CR038 remains independent work in its existing worktree; RS018 does not absorb its uncommitted implementation.
- Commit, push, merge, publication and release remain separate Navigator decisions.

## Change Requests

- [CR043: Keep Bounded Turn Journal Retention Non-Blocking](cr043-keep-bounded-turn-journal-retention-non-blocking.md)
- [CR042: Decouple Successor Admission from Desktop Projections](cr042-decouple-successor-admission-from-desktop-projections.md)
- [CR041: Reconstruct Desktop Conversations from the Pi Session](cr041-reconstruct-desktop-conversations-from-pi-session.md)
- [CR040: Establish the Terminal-Aligned Conversation Authority Contract](cr040-establish-terminal-aligned-conversation-authority-contract.md)

CR043 is `in_progress` with Driver `@alissonvale` and Delivery `refinement/rs018-cr043-non-blocking-journal-retention`. It prevents bounded historical journal retention from becoming a successor-admission gate.

CR042 is `done` with Driver `@alissonvale` and Delivery `refinement/rs018-cr042-projection-independent-admission`. The Navigator accepted projection-independent successor admission and exact native-occupancy blocking on 2026-09-17. Proportionality review found the correction appropriately bounded; Debt Review selected `create_follow_up` as CR043, and the Navigator authorized terminal closure.

CR041 is `done` with Driver `@alissonvale` and Delivery `refinement/rs018-cr041-pi-session-transcript`. The Navigator accepted the versioned, authority-validated active Pi transcript inspection on 2026-09-17. Proportionality review found the read-only adapter appropriately bounded; Debt Review concluded `no_action`.

CR040 is `done` with Driver `@alissonvale` and Delivery `refinement/rs018-cr040-terminal-aligned-authority`. The Navigator accepted the source-grounded authority inventory, Pi-owned transcript contract, currently released Mirror Core boundary and reversible migration sequence. Proportionality review found the docs-only contract appropriately bounded; Debt Review concluded `no_action`.
