[< Parent](../index.md)

# DS-012.TS-3 — Retire Distributed Lifecycle Authority

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to prevent the old architecture from remaining as a competing fallback,
as the Harness lifecycle owner,
I want React, dispatcher, lease and projection heuristics removed or reduced to journal-derived adapters,
so that one source governs lifecycle after serial and restart behavior is proven.

## Outcome

No React effect, route tombstone, selected-Journey snapshot, lease phase or projection heuristic independently decides admission, completion, recovery or successor eligibility. Compatibility code that cannot be expressed as a journal projection is removed.

## Acceptance Behavior

```text
Given journal ownership is active
When frontend, dispatcher, lease and projection evidence disagree
Then only the validated journal transition can change lifecycle
And disagreement is bounded diagnostic evidence rather than a competing recovery path.
```

```text
Given a replacement run starts in the same Journey
When stale callbacks or old UI effects execute
Then they cannot recreate authority, route, lease, projection or warnings for the replacement.
```

## Scope

- Inventory and removal of distributed lifecycle decision points.
- Journal-derived selectors for presentation and admission.
- Dispatcher reduced to exact correlated transport.
- Native registry reduced to execution ownership and inspection.
- Removal of superseded retained-lease and projection inference.
- Characterization proving no DS-009 authority or isolation regression.

## Out Of Scope

- New user-visible features.
- Capacity two enablement.
- Unrelated runtime-state or UI refactoring.

## Validation

Automated only. No desktop E2E or screenshots. Require source-level authority guardrails, focused selector/dispatcher/registry tests, dead-code checks, full suites and build checks. The previously accepted US-1/US-2 DEV smoke remains valid unless this story changes an unproven desktop boundary; if it does, stop and obtain an explicit revised smoke decision instead of rerunning automatically.
