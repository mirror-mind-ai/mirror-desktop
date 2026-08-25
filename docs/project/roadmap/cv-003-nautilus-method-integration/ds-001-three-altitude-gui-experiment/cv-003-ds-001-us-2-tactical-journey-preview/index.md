[< Parent](../index.md)

# CV-003.DS-001.US-2 — Tactical Journey Workspace Shell

**Status:** 🟠 In Validation
**Type:** User Story

## User Story

As the Navigator,
I want a durable Tactical workspace that presents the active mission, its evidence and its deliverables at a calmer altitude,
so that I can orient the Journey without reading the entire operational stream and before live tactical derivation exists.

## Outcome

Tactical establishes the permanent spatial composition for mission, evidence and deliverables. The selected Journey remains the territory, the mission becomes the directional anchor, and evidence and deliverables appear as related supporting readings. Representative data is keyed to the Journey it describes and cannot leak into another Journey; Journeys without tactical or strategic data receive an honest contextual empty surface until `CV-003.DS-003` and `CV-003.DS-004` supply live derivation.

## Acceptance Behavior

```text
Given the shared representative Journey model
When I select Tactical
Then the active mission anchors the workspace
And only its related evidence and deliverables appear beneath it
And the reading belongs to the selected Journey
And a Journey without tactical data receives an honest empty surface
And no composer, execution action, editable workflow or live-derivation claim appears.
```

```text
Given an existing selected Journey and Operational conversation state
When I visit Tactical and return to Operational
Then Journey identity, conversation, draft, runtime and reconciliation state remain unchanged
And altitude navigation has invoked no Pi, Mirror or provider process.
```

## Scope

- Permanent Tactical workspace component mounted for the Tactical altitude.
- Active mission as the primary directional anchor.
- Related evidence and deliverables composed beneath the mission.
- Calmer density and stronger hierarchy than Operational.
- Journey-keyed representative data with no cross-Journey fallback.
- Shared contextual empty surface when Tactical or Strategic data is absent.
- Accessible headings, list semantics and tab-panel identity.
- Existing shared representative model reused without mutation.

## Out Of Scope

- Live derivation or reading the real Journey filesystem.
- Mission selection, multiple-mission navigation or tactical history.
- Editable forms, status controls, drag/drop or task-board behavior.
- Provenance, confidence, correction and synthesis checkpoints.
- Strategic workspace composition.
- Persistence of altitude or tactical UI state.
- Any Pi, Mirror or provider invocation path.

## Validation

Focused model/component/source-characterization tests, complete frontend/native regression checks, and real desktop Scenario 4 plus the Tactical portion of Scenario 6 from the parent test guide.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)
