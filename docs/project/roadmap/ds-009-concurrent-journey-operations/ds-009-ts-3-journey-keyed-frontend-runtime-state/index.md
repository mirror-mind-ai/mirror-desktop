[< Parent](../index.md)

# DS-009.TS-3 — Journey-Keyed Frontend Runtime State

**Status:** ✅ Done
**Type:** Technical Story
**Order:** 2 of 7
**Concurrency:** serial only
**Plan:** [plan.md](plan.md)
**Test guide:** [test-guide.md](test-guide.md)
**Validation:** [validation.md](validation.md)
**Review:** [review.md](review.md)
**Coherence:** [coherence.md](coherence.md)
**Done:** [done.md](done.md)

## Outcome

Frontend runtime state is keyed by Journey while the backend remains serial, so deltas, operations, warnings, diagnostics, controls, context usage, finalization and terminal outcomes update only the owning Journey.

## Scope

- Replace selected-Journey global runtime state with Journey-keyed state.
- Route stream events by authority from `RunAuthority`.
- Introduce one central app-level Tauri event dispatcher.
- Avoid one independent listener per run receiving all events.
- Reject stale or replaced-run events.
- Discard or quarantine stale diagnostics outside current run state.
- Preserve selected Journey as presentation only, not mutation authority.

## Acceptance Behavior

```text
Given execution is still globally serial
And the selected Journey changes during an active run
When process events arrive through the central dispatcher
Then reducers update only the Journey that owns the RunAuthority
And stale events for an old run do not become diagnostics in a replacement run.
```

## Out Of Scope

- Backend process registry implementation.
- Enabling multiple simultaneous Pi processes.
- Sidebar personalization from RS015.

## Validation

Pure reducer and dispatcher tests cover Journey-keyed state, selected-Journey changes, listener mount/unmount without duplication, stale quarantine and cleanup that does not remove active or finalizing Journeys.
