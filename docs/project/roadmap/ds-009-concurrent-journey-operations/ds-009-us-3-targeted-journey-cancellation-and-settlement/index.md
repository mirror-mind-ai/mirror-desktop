[< Parent](../index.md)

# DS-009.US-3 — Targeted Journey Cancellation and Settlement

**Status:** ✅ Done
**Type:** User Story
**Order:** 7 of 7
**Concurrency:** validate under real global limit 2
**Plan:** [plan.md](plan.md)
**Test guide:** [test-guide.md](test-guide.md)

## User Story

As Navigator, I want cancellation, failure and settlement to target only the intended Journey run, so that one Journey cannot interrupt or corrupt another.

## Outcome

Under real two-Journey concurrency, cancelling, failing or settling one Journey leaves other active Journeys running, and settlement uses the completed or interrupted run's captured authority.

## Scope

- Cancel by `journeyId` plus `runId` under global limit 2.
- Keep failure state Journey-local while another Journey continues.
- Keep finalization state Journey-local while another Journey continues.
- Prevent cancelled, failed, dead or stale runs from mutating replacement runs through late events.
- Verify app close with multiple child processes.

## Acceptance Behavior

```text
Given Journey A and Journey B are running concurrently
When the Navigator cancels Journey A or Journey A fails
Then only Journey A changes state
And Journey B continues unchanged
And late Journey A events are discarded or quarantined outside any replacement run.
```

## Out Of Scope

- New provider cancellation semantics beyond the existing process kill boundary.
- Multi-user cancellation permissions.
- Stable promotion.

## Validation

Integration and DEV desktop tests cover selective cancellation, isolated failure, process death, app close with multiple children, settlement while another Journey runs and late-event rejection after replacement.
