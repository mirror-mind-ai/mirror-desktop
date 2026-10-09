[< RS024](index.md)

# CR140: Name the Constraint That Refuses Concurrent Work

**Status:** captured
**Driver:** —
**Delivery:** —

**Gate: not started before CR139 is merged.** The reasons this CR surfaces do not exist until the registry returns them.

## Friction

Today a refusal to start work reads as one of two strings, *"This Journey already has an active or finalizing Pi invocation"* or *"The global Pi process capacity is occupied"*, and the renderer's own pre-check collapses to `same_journey_occupied`, `global_capacity_reached` or `inspection_unknown`. After CR139 the native side can refuse for four distinct reasons — the same workspace is busy, the Journey's share of three is spent, global capacity is spent, or a compaction is in flight — and the surface has no place to say which.

CR132 left a named gap: a refusal the surface does not explain. RS023's Authority Contract forbids widening it, and the Navigator's stated outcome for CR136 was that where concurrency is refused, *the refusal must name its real constraint rather than a generic global busy state*.

Also in view, and recorded as debt since CR134: `hasBlockingPiInvocationOccupancy` is global, so any blocking state disables the Composer app-wide rather than for the workspace that is actually refused.

## Outcome

Every refusal the native side can return is distinguishable on the surface, in the Composer of the workspace that was refused, and no refusal degrades to a generic busy state when a specific reason exists.

## First Investigation

1. Enumerate every refusal the native side can return after CR139 and every string the renderer currently shows for them; produce the mapping table before touching a surface.
2. Establish where the refusal belongs: the refused workspace's Composer footer, the Journey row, or both. RS023's visibility invariant means the Journey row remains the guaranteed carrier for *running* work; a *refusal* may be workspace-local.
3. Decide whether `hasBlockingPiInvocationOccupancy`'s global reach is narrowed here or captured separately. If narrowing, name what currently depends on it being global — CR115 and CR116's recovery paths read it.
4. Check CR134's `occupiedLocus` on `journeyStartAvailability`: with two workspaces admitted, the locus must name *which* sibling occupies, or say the share is spent.

## Acceptance

- Each native refusal reason maps to one surface sentence, and a guard asserts the mapping is total.
- The refused workspace's Composer says why it was refused and, where another workspace holds the slot, which one.
- `inspection_unknown` stays distinguishable from every specific refusal; it is never relabelled as busy.
- No existing refusal becomes silent or less specific.
- Field: on Dev, with two conversations running in one Journey, a third start is refused and the surface names the share; a start in one of the running conversations is refused and the surface names that workspace.

## Boundaries

No change to admission itself; this CR only surfaces what CR139 decides. No change to CR132's abandonment affordance.
