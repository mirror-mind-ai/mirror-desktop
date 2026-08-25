[< Parent](../index.md)

# CV-003.DS-001.US-1 — Operational Journey Workspace

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want the existing conversation and a Journey artifacts preview to share the Operational altitude,
so that I can feel work and its material context as one nearby field.

## Outcome

Operational remains the functional cockpit while a clearly labeled representative artifact composition appears beside it.

## Acceptance Behavior

```text
Given a loaded conversation and unsent draft
When I leave Operational and return
Then the conversation, draft, controls and reconciliation state remain unchanged.
```

## Scope

- Reuse the existing message stream, composer and runtime surfaces.
- Representative folders/files beside conversation.
- Preview honesty and desktop composition.
- Existing settings and diagnostics remain reachable.

## Out Of Scope

- Real filesystem inspection or mutation.
- Automatic prompt attachment.
- Conversation lifecycle refactoring beyond presentation needs.

## Validation

Automated continuity characterization and real desktop Scenario 2/3 review.
