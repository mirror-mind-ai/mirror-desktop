[< DS-010](../index.md)

# DS-010.TS-1 — Canonical Journey Mutation Contract

**Status:** 🟡 Planned
**Type:** Technical Story

---

## Technical Story

In order to administer Journeys without split authority,
As the Harness/Mirror boundary,
I want a versioned mutation contract for canonical Journey identity and structure,
So that create, move, reorder and project-path operations share deterministic invariants and recovery semantics.

## Outcome

One contract defines native Journey ID authority, expected registry version, parent and sibling-order grammar, slug uniqueness, canonical project-path representation, cycle prevention, stale-source rejection, atomic outcome and private-content-free receipts.

## Acceptance Behavior

```text
Given exact current registry authority and one bounded Journey mutation
When the contract validates it
Then the operation has one deterministic valid result or fails before canonical state changes.
```

## Scope

- Mutation request and receipt schemas.
- Native ID, slug, hierarchy, order and path invariants.
- Optimistic concurrency and stale-source rejection.
- Failure classes, atomicity and rollback contract.
- Protected identity, semantic and dedicated-thread fields.

## Out Of Scope

- Desktop interaction design.
- Provider or conversational execution.
- Journey deletion, merging or slug renaming after creation.

## Validation

Contract fixtures cover valid creation, reparenting, sibling reordering and path assignment plus duplicate slug, cycle, stale source, invalid path and unauthorized-field rejection.
