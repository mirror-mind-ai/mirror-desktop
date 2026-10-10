[< Refinement Workbench](../index.md)

# RS024: Concurrent Work Inside One Journey

**Status:** active

## Framing

Promoted from [CR136](../rs023-conversations-as-first-class-workspaces/cr136-admit-concurrent-work-inside-one-journey.md), the fourth and gated slice of RS023. Its gate opened on 2026-10-09 on both readings: CR133, CR134 and CR135 shipped in `v0.2.0-alpha.43`, and production runs that binary, verified by hash from build to installation.

CR136's First Investigation, recorded in the CR under `## Investigation Findings (2026-10-09)`, measured the work as Story-sized. Its conclusion from 2026-10-08 — the key is the workspace and the workspace is the thread — **stands**. What changed is the cost of reaching it, in three ways the earlier characterisation did not see:

| Finding | Verified fact | Coordinate |
|---|---|---|
| The blocking constraint is a parser, not a predicate | `isValidPiInvocationInspection` requires distinct `journeyId` count to equal entry count; two same-Journey entries invalidate the whole payload, degrade it to `unknown`, and `hasBlockingPiInvocationOccupancy` reports blocking on `unknown` — an app-wide Composer lockout | `piInvocationOccupancy.ts:179`–`:181`, `:300` |
| The TypeScript runtime state is a second per-Journey index | `entries: Record<journeyId, Entry>`; 18 indexed reads across 7 production files, two of them delivered by CR134 | `journeyRuntimeState.ts:105`, `App.tsx:1061`, `:2489`, `:3733`, `:5358` |
| The registry has three consumers, not one | The only direct `.reserve()` caller is `suggest_desktop_conversation_title`; the turn path goes through `reserve_then_start`; compaction excludes by scan | `main.rs:3856`, `:3911`, `:4155`, `:4118`–`:4123`, `:4186`–`:4191` |

The system **fails closed** today, which is to its credit. But it means re-keying the Rust registry alone does not produce concurrency; it produces a lockout. That ordering fact is what shapes this Story: the renderer must be able to *carry* two workspaces before the native side is allowed to *admit* them.

**Three decisions taken by the Navigator on 2026-10-09, on the investigation's recommendation:**

1. **Promotion** into this Story, with the wire contract and the TypeScript re-grain as the first slice.
2. **The per-Journey share is three.** The alternative — two, with title suggestions excluded from share accounting — was rejected because it requires the registry to classify runs by kind, and a run kind read from a `run_id` prefix is exactly the kind of inference this project avoids. Three admits two Navigator workspaces and one background title suggestion. The number is derived from the measured consumers and is falsifiable; a fourth consumer would reopen it.
3. **The turn/compaction mutual exclusion stays per-Journey**, coarser than the per-thread file it protects. It is named here as deliberate contention so the next reader does not file the unnecessary refusal as a defect.

## Desired Outcome

Work in a Journey workspace is admitted while a conversation inside it works, where native process capacity and exact authority permit. Where they do not, the refusal names its real constraint — the same workspace is busy, the Journey's share of three is spent, global capacity is spent, or a compaction is in flight — rather than a generic global busy state.

## Authority Contract

- Journey authority is exactly `mirror-desktop`.
- Pi JSONL remains the sole transcript and native-entry authority. No Mirror Core change.
- The admission key is the workspace, `(journey_id, thread_id)`. Generation stays inside authority; it is not part of the key.
- The Rust registry and the TypeScript runtime state change their key **together or neither**, inherited from RS023. In this Story that invariant is realised by ordering, not by one commit: the renderer gains the capacity to carry two workspaces first, with the native side still emitting at most one, so no intermediate release can lock the Composer.
- Global process capacity is unchanged. The per-Journey share is three and is enforced natively, in the same lock as reservation.
- Turn and compaction remain mutually exclusive per Journey, in both directions. Narrowing that to the thread is out of scope and would need its own CR with its own file-safety argument.
- No fabricated concurrency: two workspaces run together only when both the native registry and the renderer agree they are distinct.
- A refusal may become narrower but never silent, and never generic where a specific reason exists.
- RS023's visibility invariant is inherited: running work is never representable only on a surface the Navigator can hide, collapse or leave unexpanded.

## Work Shape

Ordered slices. Each later slice is gated on the previous one being **merged**, because the ordering is what keeps every intermediate state safe.

1. **CR138** lets the inspection and the runtime state carry two workspaces in one Journey. Pure renderer preparedness: the validator's uniqueness rule, the `entries` index, and the predicates move to the workspace grain while Rust still emits at most one entry per Journey. **It has no field trigger by construction** and is closed on tests, which is said up front rather than discovered at verification.
2. **CR139** keys the native registry by workspace, adds the per-Journey share of three, retires per workspace, and characterises the journal's durability under two live authorities in one Journey. **Gate: not started before CR138 is merged** — the lockout in Finding 1 is the reason.
3. **CR140** names the constraint that refuses concurrent work on the surface, replacing the generic global busy state with the specific reason the native side returned. **Gate: not started before CR139 is merged**, since the reasons it surfaces do not exist until then.
4. **CR141** keys the Pi process event route by workspace. **Added 2026-10-10, after the field refuted the first three slices as sufficient.** The dispatcher's route map is keyed by `journeyId`, including in `deliver`, so a sibling's send throws inside `register` before admission is ever consulted. This slice was missing from the Work Shape because four First Investigations surveyed the admission path and none surveyed the event transport. **Gate: not started before CR140 is merged.** **Planned 2026-10-10.** The investigation found a second Journey-keyed site, `App.tsx:1252`, which selects the native lease by Journey and would hide the selected workspace's own blocking record and rehydration behind a sibling's; it is in scope. Delivery is two-staged: re-key and flip the grain, run the field, and only then remove `same_journey_occupied`.

## Acceptance Horizon

RS024 is complete only when:

- an inspection carrying two entries for one Journey with distinct threads parses as `known`, and one carrying two entries for the same workspace is rejected;
- a turn in a Journey workspace is admitted while a conversation in that Journey runs, up to the share of three, and the third concurrent run in a Journey is refused with `journey_share_exceeded`;
- a turn in a workspace that is already running is refused with the workspace named, not the Journey;
- the journal, settlement timings and segment projections of two concurrent turns in one Journey settle without one erasing or recounting the other, characterised by test before the registry changes;
- compaction remains refused while any workspace in the Journey runs, and a turn remains refused while the Journey compacts, with that coarseness named in a guard;
- every refusal the native side can return is distinguishable on the surface, and no refusal degrades to a generic busy state when a specific reason exists;
- **two concurrent turns in one Journey each receive their own Pi process events**, and the D1–D5 field sequence runs to completion.

**Measured 2026-10-10: this horizon is NOT reached.** CR138, CR139 and CR140 are delivered and the
second row above fails in the field — the Pi event route is keyed by Journey. CR141 is the slice
that closes it, and the field evidence owed by all three earlier slices is collected there.

## Boundaries

- No change to transcript authority, Mirror provenance or Mirror Core.
- No narrowing of the turn/compaction exclusion to the thread.
- No change to CR133's expansion, CR134's locus derivation or CR135's visibility, beyond re-keying the runtime entries they read.
- The per-Journey lifecycle claim (`JourneyProvisioningState.active`) is untouched. Its exclusive hold on a read, `load_desktop_conversation_catalog`, was noticed in CR136's investigation and is **not** this Story's work.
- Push, merge, publication, release and installation remain separate Navigator decisions.

## Change Requests

- [CR138: Let the Inspection Carry Two Workspaces in One Journey](cr138-let-the-inspection-carry-two-workspaces-in-one-journey.md)
- [CR139: Key the Native Registry by Workspace](cr139-key-the-native-registry-by-workspace.md) — gated on CR138 merged
- [CR140: Name the Constraint That Refuses Concurrent Work](cr140-name-the-constraint-that-refuses-concurrent-work.md) — gated on CR139 merged
- [CR141: Key the Pi Event Route by Workspace](cr141-key-the-pi-event-route-by-workspace.md) — gated on CR140 merged
