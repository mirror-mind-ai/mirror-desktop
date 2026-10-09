[< RS023](index.md)

# CR134: Name the Workspace That Owns the Work

**Status:** captured
**Driver:** —
**Delivery:** —

## Friction

`Working`, `Ready` and related signals are attached to the Journey even when the work is happening in one conversation below it. `JourneyRuntimeState.entries` is `Record<journeyId, Entry>` (`journeyRuntimeState.ts:50`), so a Journey workspace and every conversation inside it share one runtime entry and cannot be told apart by key. The sidebar, the Journey header and the area above the Composer therefore all report a Journey as working when the work belongs to one conversation within it — a parent impersonating its child.

The Navigator cannot tell, from any surface, which workspace is actually busy.

## Outcome

Every status surface names the workspace that owns the work. Where a Journey-level summary is shown it is explicitly a summary, never a claim that this workspace is the one working.

## First Investigation

1. Confirm that `entry.identity.authority` reliably identifies the owning workspace in every runtime phase, including `reserved`, `running`, `finalizing` and the post-terminal recovery window, and including a restored entry after reload.
2. Enumerate every surface deriving status from the Journey entry — `deriveComposerTurnStatus`, `deriveJourneyNavigationPresentation`, `selectJourneyRuntimeOwnerPhase` and their sidebar and header consumers — and record what each one would need in order to compare against the selected workspace.
3. Establish the honest vocabulary for the three cases: this workspace is working; another workspace in this Journey is working; nothing in this Journey is working. Decide what the aggregate says without implying the Navigator may send work, since admission is unchanged until CR136.
4. Determine what a workspace with no live entry should read when the Journey has one, and confirm it is not a false `Ready` that invites a send the Journey will refuse.

## Acceptance

- The sidebar, the selected-workspace header and the Composer name runtime status at the conversation or workspace that owns it.
- A parent Journey does not read `Working` merely because a child conversation is working.
- Aggregate Journey state, where shown, is explicitly aggregate rather than impersonating the child.
- A workspace that is not the owner does not read `Ready` in a way that implies a send would be admitted while the Journey is occupied; the surface distinguishes *free* from *occupied elsewhere*.
- Status derivation is a pure function of the selected workspace and the durable runtime entry, and is covered by guard-level tests for all three cases.

## Boundaries

No change to how runtime is keyed, no change to admission or occupancy, and no new concurrency — this CR makes ownership legible, not parallel. No change to transcript authority. It must not present an occupied Journey as available.
