[< Parent](../index.md)

# DS-006.US-2 — Search Journeys

**Status:** 🟡 Planned
**Type:** User Story

---

## Outcome

Implement Search Journeys for the registry-derived sidebar. Add a controlled search input in the sidebar that searches across all nodes of fixtureJourneyRegistry using flattened registry data, matching Journey name, description, id, and breadcrumb text. When the query is empty, keep the current sidebar derivation from JourneyPreferences: pinned/active/recent/fallback visibility rules. When the query is non-empty, show search results from the full hierarchy with breadcrumb context, preserve visual selection for the active Journey when it appears, allow clicking a result to select that Journey and clear or retain search according to the simplest usable behavior, and do not reorder the baseline sidebar just because a Journey is clicked. Keep pin UI, sort UI, Mirror import, workspace scanning, and Journey mutation out of scope. Search must be local, deterministic, case-insensitive, non-mutating, and must not invoke Pi/Mirror automatically.

## Story Statement

As a user,
I want to Search Journeys,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-2
When the Navigator exercises DS-006.US-2
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver DS-006.US-2 as an observable slice.
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
