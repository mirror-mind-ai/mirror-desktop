[< Parent](../index.md)

# DS-006.US-5 — Pin Important Journeys

**Status:** 🟡 Planned
**Type:** User Story

---

## Outcome

Implement DS-006.US-5 by adding runtime-only pin/unpin interaction for Journeys in the sidebar. Add a small pin control to each Journey row that can pin or unpin the Journey without selecting it or invoking Pi. Pinned Journeys should remain visible at the top of Recent mode using the existing JourneyPreferences.pinnedJourneyIds model, with active Journey still visible even if unpinned. In A-Z and Tree modes, pinned state should be visible but should not override the selected ordering unless the Navigator explicitly switches back to Recent. Search results should show pin state and allow pin/unpin without clearing the search or changing active Journey unless the row itself is clicked. Pinning is Nautilus-local runtime preference only in this US; do not persist pins to disk because that belongs to DS-006.TS-3. Do not write to Mirror, Journey files or workspace. Add tests for pinned-first behavior, pin/unpin state updates where practical, active visibility when unpinned, and non-persistence boundary. Validate with npm test, npm run build, cargo check, and visual Navigator checks pinning/unpinning Journeys in Recent/A-Z/Tree/search.

## Story Statement

As a user,
I want to Pin Important Journeys,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-5
When the Navigator exercises DS-006.US-5
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver DS-006.US-5 as an observable slice.
- Keep the implementation narrow enough to validate at the Plan-defined checkpoint.

## Out Of Scope

- Do not silently absorb adjacent roadmap work.

## Validation

- Run automated tests that cover the planned behavior.
- Provide a Navigator-visible route with expected observation, pass condition, and fail condition.

---

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
