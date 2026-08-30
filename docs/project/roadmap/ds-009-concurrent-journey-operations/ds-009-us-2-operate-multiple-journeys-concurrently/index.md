[< Parent](../index.md)

# DS-009.US-2 — Operate Multiple Journeys Concurrently

**Status:** 🟡 Planned
**Type:** User Story
**Order:** 6 of 7
**Concurrency:** enable global limit 2

## User Story

As Navigator, I want to start work in another Journey while one Journey is already running, so that independent Journey work can proceed without global blocking.

## Outcome

Only after TS-4 is complete, the DEV app permits two active Pi-backed runs in different Journeys and rejects a second active or finalizing run in the same Journey.

## Scope

- Raise the single internal capacity constant from 1 to 2.
- Use the same registry implementation already tested with injected limit 1.
- Permit Journey B submission while Journey A is running.
- Enforce one active or finalizing run per Journey.
- Surface capacity and same-Journey rejection clearly.
- Preserve rollback by returning the internal capacity constant to 1.

## Acceptance Behavior

```text
Given TS-1, TS-3, US-1, TS-2 and TS-4 are complete
And global capacity is 2
When the Navigator starts Journey A and Journey B runs
Then both Journeys run under separate authority
And a second run in either Journey is rejected until that Journey settles.
```

## Out Of Scope

- More than two concurrent executions.
- Arbitrary environment override for capacity.
- Remote or multi-user orchestration.

## Validation

Integration and DEV desktop validation cover two simultaneous Journeys, same-Journey rejection, global capacity rejection for a third run, and rollback to limit 1 using the same implementation.
