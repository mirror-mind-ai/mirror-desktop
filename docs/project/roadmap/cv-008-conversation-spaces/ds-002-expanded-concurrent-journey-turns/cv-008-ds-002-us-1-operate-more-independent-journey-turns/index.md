[< Parent](../index.md)

# CV-008.DS-002-US-1 — Operate More Independent Journey Turns

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to operate up to four independent Journey turns without process-management noise,
so that I can keep more work in motion and receive guidance only when the concurrency bound affects my action.

## Outcome

Each running Journey continues to communicate its own existing sidebar and conversation state. Mirror Desktop adds no global process or turn counter. Only actionable full-capacity refusal appears; the fifth Journey's draft stays editable while Send remains disabled until capacity frees.

## Acceptance Behavior

```text
Given one to four independent Journey turns are admitted
When the Navigator moves among Journeys
Then each Journey keeps its owner-specific active state
And no global process counter occupies the conversation surface

Given four slots are occupied
When the Navigator drafts a fifth Journey turn
Then the app explains that capacity is occupied
And preserves the editable unsent draft while disabling Send
And creates no process, hidden queue or automatic retry
```

## Scope

- Existing owner-specific sidebar and conversation runtime state.
- Explicit English-only notice when the selected Journey cannot be admitted at full capacity.
- Disabled Send with the unsent draft still editable and preserved for deliberate retry after capacity frees.
- No ordinary partial-occupancy notification or global process counter.
- Source integration coverage for the intentional absence of the counter.

## Out Of Scope

- Showing sibling prompts, responses, providers, paths or conversation content.
- A process monitor, global turn counter or available-slot indicator.
- Prompt queue controls or automatic send.
- New concurrency within one Journey.

## Evidence

Integration tests require ordinary occupancy to remain silent, disable Send under a known full-capacity refusal, retain the editable draft and keep native admission as the atomic authority. Existing owner-keyed runtime tests cover four interleaved Journeys. Natural four-Journey interaction remains the aggregate Navigator Validation route.
