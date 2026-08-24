[< Parent](../index.md)

# DS-006.TS-1 — Journey Registry Model

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Outcome

Plan DS-006.TS-1 as a Hierarchical Journey Registry Model. Define TypeScript domain types for a Mirror-sourced hierarchical registry with roots, children, parent references, status/stage/description metadata and a syncedAt/schemaVersion envelope. Keep Nautilus-local preferences separate from Mirror metadata: pinnedJourneyIds, active/lastActive journey and recents are local Harness state, not Mirror Journey fields. Implement pure helpers to validate unique journey ids, flatten the tree for search, derive breadcrumbs, find journeys by id, and derive sidebar items where pinned journeys are always visible and the active journey remains visible even when not pinned. Do not implement Mirror database/CLI import yet, do not scan workspace roots, do not mutate Journey files, and do not implement full search UI or pin UI in this TS. Use a fixture-backed registry so later stories can replace the source with explicit Mirror sync.

## Story Statement

In order to support the delivery capability,
As an engineering team/system component,
I want to Journey Registry Model,
So that the expected technical outcome is available.

## Acceptance Behavior

```text
Given the starting state needed for DS-006.TS-1
When the Navigator exercises DS-006.TS-1
Then the planned observable behavior is visible
And out-of-scope sibling roadmap items remain untouched
```

## Scope

- Deliver DS-006.TS-1 as an observable slice.
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
