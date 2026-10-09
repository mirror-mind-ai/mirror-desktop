[< RS024](index.md)

# CR139: Key the Native Registry by Workspace

**Status:** captured
**Driver:** —
**Delivery:** —

**Gate: not started before CR138 is merged.** Re-keying the registry while the renderer's validator still forbids two entries per Journey produces an app-wide Composer lockout as its first observable effect (CR136, Finding 1).

## Friction

`PiProcessRegistry.entries` is a map keyed by `journey_id` inside `reserve` (`pi_process_registry.rs:263`–`:292`), with capacity accounting and `retire_finalizing_journey` on that key. A second reservation in the same Journey returns `ReserveError::DuplicateJourney`, mapped at `main.rs:3913` and `:4219` to *"This Journey already has an active or finalizing Pi invocation."*

Three consumers share that key. The turn path reserves through `reserve_then_start` from `start_pi_invocation` (`:4155`). `suggest_desktop_conversation_title` reserves directly (`:3856`, `:3911`) under the Desktop conversation's own `thread_id`, so after re-keying it occupies a workspace slot of its own. Compaction does not reserve; it excludes by scanning `entry.authority.journey_id == journey_id && entry.is_active_execution()` (`:4118`–`:4123`), and the turn's admission closure excludes compaction by `compaction_in_flight.contains(&journey_id)` (`:4186`–`:4191`). Both scans survive re-keying mechanically and both become coarser than the per-thread session file compaction actually rewrites.

The durable layer is already shaped for this. Journal records resolve by full `TurnJournalAuthority` equality; the journal lock stripes on `(journey_id, 0)`; every durable artifact is a per-Journey file holding per-authority records. Exactly one production call site stripes on a real generation (`main.rs:9031`). That characterisation was made by reading, not by test, and this CR must turn it into a test before changing the key.

## Outcome

The registry indexes by `(journey_id, thread_id)`, admits up to three live entries per Journey, refuses the same workspace by name, retires per workspace, and keeps turn and compaction mutually exclusive per Journey — deliberately coarse, and guarded as such.

## First Investigation

1. **Durability characterisation against unchanged code**: two `RunAuthority` values in one Journey with distinct `thread_id`s, journaled, settled and compacted in interleaved order, must leave both records intact with correct revisions. CR136's Phase 1 as originally written, now sequenced after CR138.
2. Design `WorkspaceKey` and the trait method that yields it from `RunAuthority`; establish whether `RunTarget` gains a third field or carries the key, and what `inspect()` emits — it must still satisfy CR138's validator byte for byte.
3. Define `ReserveError::DuplicateWorkspace` and `ReserveError::JourneyShareExceeded`, map both at `:3913` and `:4219`, and keep `CapacityReached` global.
4. Establish how `retire_finalizing_journey` becomes per-workspace without stranding a `finalizing` sibling — CR116's recovery guard pins the current semantics and must be re-aimed, not deleted.
5. Write a guard that asserts the compaction exclusion scans by `journey_id` and names the coarseness in its description, so that narrowing it later is a visible decision.
6. Confirm `materialize_completed_journal_delivery_debt` (inside the admission closure, per Journey) is safe to run while a sibling workspace is live.

## Acceptance

- Two workspaces in one Journey reserve, run and retire independently; the same workspace twice returns `DuplicateWorkspace`; a fourth live entry in one Journey returns `JourneyShareExceeded`; global capacity is unchanged.
- A title suggestion counts toward the Journey's share of three and never toward a refusal of its own parent workspace's turn.
- Compaction is refused while any workspace in the Journey runs, and a turn is refused while the Journey compacts, with a guard naming that as deliberate.
- The durability characterisation from item 1 passes before and after the key change with identical verdicts.
- `cargo test` and the renderer suite are green together; the inspection emitted by the new registry parses as `known` under CR138's validator.
- Field: on Dev, a turn started in the Journey workspace while a conversation in that Journey runs is admitted; the Dev turn journal shows two records with distinct `threadId`s and overlapping `createdAt`/`updatedAt` windows.

## Boundaries

No narrowing of the turn/compaction exclusion to the thread. No change to `JourneyProvisioningState`. No change to transcript authority. The share is three and is not configurable.
