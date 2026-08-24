[< Parent](../index.md)

# DS-006.US-1 — Navigate Journey Sessions

**Status:** 🟡 Planned
**Type:** User Story

---

## Outcome

Implement Navigate Journey Sessions using the hierarchical Journey Registry model. Replace the hardcoded sidebar journey array with sidebar items derived from fixtureJourneyRegistry and JourneyPreferences. Allow selecting a visible Journey to update activeJourneyId, update header/sidebar context from registry metadata and breadcrumbs, load that Journey's persisted conversation, and save future conversation changes under that Journey id. Keep pinned/search/sort UI out of scope, but preserve active Journey visibility even when not pinned and use fallback roots when needed. Do not import from Mirror CLI/database, scan workspace roots, mutate Journey files, invoke Pi automatically, or introduce multiple conversations per Journey.

## Story Statement

As a user,
I want to Navigate Journey Sessions,
So that I can receive the value of this story.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.US-1
When the Navigator exercises DS-006.US-1
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver DS-006.US-1 as an observable slice.
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
