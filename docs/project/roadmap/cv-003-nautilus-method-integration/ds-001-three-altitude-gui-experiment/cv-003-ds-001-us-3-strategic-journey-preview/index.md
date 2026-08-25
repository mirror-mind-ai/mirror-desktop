[< Parent](../index.md)

# CV-003.DS-001.US-3 — Strategic Journey Workspace Shell

**Status:** 🟠 In Validation
**Type:** User Story

## User Story

As the Navigator,
I want a durable Strategic workspace for realizations, impacts and complementary value lenses at a wider altitude,
so that I can perceive what the Journey has made possible before live strategic derivation exists.

## Outcome

Strategic establishes the permanent spatial composition connecting one primary realization to its observed impacts and to pragmatic and integrative value. Representative content resolves only for the Journey it describes; Journeys without strategic data retain the contextual empty surface established during US-2.

## Acceptance Behavior

```text
Given a selected Journey with contextual representative strategic data
When I select Strategic
Then one realization is the primary reading
And only its related impacts appear
And pragmatic and integrative value are presented as complementary lenses
And no score, ranking, executive metric, workflow or live-derivation claim appears.
```

```text
Given a selected Journey without strategic data
When I select Strategic
Then I see the inert no-data surface naming that Journey
And no other Journey's realization, impact or value appears.
```

## Scope

- Permanent Strategic workspace component mounted for the Strategic altitude.
- Primary realization anchor.
- Related observed-impact composition.
- Equal pragmatic and integrative value lenses.
- Wider visual rhythm than Tactical.
- Journey-keyed representative resolution.
- Existing contextual empty surface for missing Strategic data.
- Accessible headings, list semantics and tab-panel identity.

## Out Of Scope

- Live semantic derivation or filesystem reading.
- Multiple-realization selection/history.
- Executive metrics, scores, ranking or performance dashboard.
- Editable forms, workflow actions or strategic state persistence.
- Provenance, confidence, correction and synthesis checkpoints.
- Changes to Tactical, Operational, Pi, Mirror or provider ownership.

## Validation

Focused relation/component/source-characterization tests, complete frontend/native regression checks, and real desktop Scenario 5 plus the Strategic portion of Scenario 6 from the parent test guide.

## Artifacts

- [Plan](plan.md)
- [Test Guide](test-guide.md)
- [Implementation](implementation.md)
