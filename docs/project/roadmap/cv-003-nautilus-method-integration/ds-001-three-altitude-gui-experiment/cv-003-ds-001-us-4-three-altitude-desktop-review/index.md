[< Parent](../index.md)

# CV-003.DS-001.US-4 — Three-Altitude Desktop Review

**Status:** 🟡 Planned
**Type:** User Story

## User Story

As the Navigator,
I want to experience all three altitudes in the real desktop Harness,
so that I can decide whether this visual direction should continue before deeper semantics are built.

## Outcome

The complete experiment is reviewed in Tauri and receives an explicit `continue`, `correct` or `discard` judgment.

## Acceptance Behavior

```text
Given the implemented experiment and a real selected Journey
When I traverse Operational, Tactical and Strategic
Then I can judge their distinct rhythm and shared-territory continuity
And returning to Operational preserves the working cockpit.
```

## Scope

- Real desktop guided review.
- Journey switching and Operational continuity checks.
- Visual feedback and final direction judgment.
- Aggregate automated baseline.

## Out Of Scope

- New production semantics discovered during review.
- Real artifact or derivation implementation.
- Unapproved visual expansion after acceptance.

## Validation

Follow the parent test guide Scenarios 1 through 8 and record Navigator acceptance.
