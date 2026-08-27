[< Parent](../index.md)

# CV-004.DS-004.US-2 — Resume After Restart

**Status:** 🟡 Planned  
**Type:** User Story

## User Story

As the Navigator, I want a restarted Journey to reopen its newest ready generation automatically, so that old Pi or Mirror conversations never require selection and never become current by recency.

## Acceptance Behavior

```text
Given generation N is inactive and generation N+1 is active
When I return to the Journey or restart the desktop
Then only N+1's exact Pi session, Mirror conversation and Harness projection load
And N remains bounded read-only history
And no title, timestamp or conversation picker influences authority
```

## Scope

- Deterministic active-generation restore.
- Exact generation-scoped transcript/projection loading.
- Bounded inactive-generation history display.
- Stale historical authority rejection.

## Out of Scope

- Browsing full inactive transcripts.
- Reactivating an older generation.
- Importing external conversations.

## Validation

Journey switching and desktop restart with multiple generations, including stale names/timestamps that cannot affect selection.
