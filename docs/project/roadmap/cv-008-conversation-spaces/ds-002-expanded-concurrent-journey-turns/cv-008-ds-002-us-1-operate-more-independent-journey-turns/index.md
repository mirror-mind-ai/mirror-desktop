[< Parent](../index.md)

# CV-008.DS-002-US-1 — Operate More Independent Journey Turns

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to operate up to four independent Journey turns and understand aggregate occupancy,
so that I can keep more work in motion without losing drafts or wondering why another send was refused.

## Outcome

While admitted Journey leases exist, the composer presents bounded `Concurrent turns: used / limit` status and available capacity without exposing sibling content. Full capacity remains an explicit persistent condition, while the fifth Journey's draft stays editable for deliberate retry.

## Acceptance Behavior

```text
Given one to four independent Journey turns are admitted
When the Navigator moves among Journeys
Then aggregate occupancy and available slots remain visible
And each Journey keeps its own sidebar and conversation state

Given four slots are occupied
When the Navigator attempts a fifth Journey turn
Then the app explains that capacity is occupied
And preserves the unsent draft
And creates no hidden queue or automatic retry
```

## Scope

- English-only aggregate occupancy presentation while occupancy is nonzero.
- Used, limit and available-slot text derived from bounded native inspection.
- Existing full-capacity notice and deliberate retry behavior.
- Existing Journey navigation, draft editing and owner-specific sidebar state.
- Component coverage for partial and full capacity presentation.

## Out Of Scope

- Showing sibling prompts, responses, providers, paths or conversation content.
- Notifications while occupancy is zero.
- Prompt queue controls or automatic send.
- New concurrency within one Journey.

## Evidence

Pure projection and component tests cover free, partial and full occupancy, accessibility status semantics and absence of owner identity in the presentation. Source integration checks keep native admission as the atomic authority. Natural four-Journey interaction remains the aggregate Navigator Validation route.
