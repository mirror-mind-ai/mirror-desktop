[< Parent](../index.md)

# CV-003.DS-007.US-1 - Operational Ariad Home

**Status:** ✅ Done
**Type:** User Story

---

## User Story

As a Navigator working inside a Journey,
I want to open an Ariad view inside Operational,
So that I can understand the method position and the three Ariad fields without leaving the operational workspace.

## Outcome

`Operational` includes an `Ariad` subview beside `Conversation` and `Artifacts`. The Ariad Home renders current method state, next safe movement, field summaries for Delivery, Refinement and Exploration, a Structure column and a Selected Matter panel.

## Acceptance Behavior

```text
Given a selected Journey with Ariad adopted
When I open Operational and select Ariad
Then I see Ariad State, Next Safe Movement, Delivery, Refinement, Exploration, Structure and Selected Matter
```

```text
Given I select an item in Structure
When the selection changes
Then Selected Matter updates with the item title, type, status, evidence or boundary, and allowed read-only interpretation
```

## Scope

- Add Ariad as an Operational subview alongside Conversation and Artifacts.
- Render Ariad Home from the read model.
- Show the three fields together without collapsing their semantic distinction.
- Support selecting field items and displaying Selected Matter.
- Include empty and unavailable states.

## Out Of Scope

- Mutating Ariad state.
- Running Builder or Explorer commands from the view.
- Rendering deep field-specific layouts beyond the homepage.
- Tactical or Strategic view changes.

## Validation

Navigator can open the Harness, select a Journey, enter `Operational > Ariad`, and explain where the Journey is in Ariad, what the next safe movement is, and what Delivery, Refinement and Exploration currently contain.
