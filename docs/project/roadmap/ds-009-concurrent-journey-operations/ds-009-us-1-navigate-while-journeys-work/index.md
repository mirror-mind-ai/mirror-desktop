[< Parent](../index.md)

# DS-009.US-1 — Navigate While Journeys Work

**Status:** 🟡 Planned
**Type:** User Story
**Order:** 3 of 7
**Concurrency:** serial only

## User Story

As Navigator, I want to switch Journeys while a Pi-backed run continues, so that one long-running Journey does not lock the desktop cockpit.

## Outcome

Journey navigation remains available during one serial active run, and returning to the running or settled Journey shows the state that belongs to it.

## Scope

- Remove global navigation blocks caused by an active run in another Journey.
- Show compact active state in the sidebar for the running Journey.
- Keep drafts, attachments, stream state and conversation display scoped to the selected Journey.
- Preserve global execution limit 1.

## Acceptance Behavior

```text
Given Journey A is running under global limit 1
When the Navigator selects Journey B
Then the UI switches to Journey B without cancelling Journey A
And Journey A remains visibly active in the sidebar
And Journey B cannot start a run until global serial capacity is available.
```

## Out Of Scope

- Enabling concurrent execution.
- Sidebar personalization from RS015.

## Validation

Component and integration tests cover Journey switching while another Journey owns active runtime state under global limit 1.
