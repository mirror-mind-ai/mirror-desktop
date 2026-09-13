[< Parent](../index.md)

# CV-008.DS-001-US-1 - Correct a Running Turn from the Composer

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to send a correction while the selected Journey turn is still running,
so that Pi can change course without losing useful work through cancellation and replay.

## Outcome

The selected Journey composer accepts a text correction during its exact active run, presents it as Steering within that logical turn and shows evidence-backed progress without creating a sibling run.

## Acceptance Behavior

```text
Given the selected Journey owns one active Mirror-mediated turn
When I send a non-empty text correction from its composer
Then the message is submitted as Steering to that exact run
And I can distinguish pending, accepted, applied, rejected or terminally unconsumed state
And no second assistant placeholder, run or cancellation appears
```

## Scope

- Running composer text entry and send behavior.
- Compact semantic Steering message and status presentation.
- Multiple ordered text corrections.
- Clear feedback for unsupported, stale and terminal attempts.
- Keyboard and accessibility behavior consistent with the existing composer.

## Out Of Scope

- Images, attachments, voice, extension commands, templates and skills.
- Follow-up queue controls or manual queue editing.
- Steering a background Journey from another Journey's composer.

## Validation

Component and integration tests plus isolated `Mirror Desktop Dev` validation with a real long-running Pi turn and one then two corrections.
