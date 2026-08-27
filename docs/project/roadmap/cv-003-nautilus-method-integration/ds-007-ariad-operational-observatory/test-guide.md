[< Story](index.md)

# Test Guide — CV-003.DS-007

## Aggregate Validation

Validate the complete read-only Ariad Operational Observatory across read model, Operational navigation, Ariad Home, Delivery observation, Refinement workbench, Exploration observation and no-mutation guardrails.

Recommended automated checks:

- read model composes Ariad State, Next Safe Movement, Delivery, Refinement and Exploration from complete fixtures;
- read model represents missing runtime, roadmap, Refinement or Exploration sources as bounded unavailable states;
- selecting Structure items updates Selected Matter without mutating source data;
- Delivery field preserves roadmap hierarchy, status, active item and source artifact references;
- Refinement field preserves active RS, active CR, evidence, status and source-owned Driver and Delivery metadata without inference;
- Exploration field preserves story summary, attractors, experiments, handoff artifacts and promotion boundary without converting exploration into backlog;
- Ariad observatory interactions perform no writes to roadmap, runtime cursor, Refinement, Exploration, Mirror or Journey source files.

## Child Work Packages

- CV-003.DS-007.TS-1
- CV-003.DS-007.US-1
- CV-003.DS-007.US-2
- CV-003.DS-007.US-3
- CV-003.DS-007.US-4
- CV-003.DS-007.TS-2

## Navigator Validation

Navigator route:

```text
Open the Harness with a Journey that has Ariad adopted.
Select the Journey.
Open Operational.
Switch from Conversation or Artifacts to Ariad.
Inspect Ariad Home.
Open or select Delivery, Refinement and Exploration matter.
Confirm that each field is legible, distinct and read-only.
```

Expected observation:

```text
Operational contains an Ariad subview. Ariad Home shows Ariad State, Next Safe Movement, field summaries, Structure and Selected Matter. Delivery reads as construction commitment. Refinement reads as friction care. Exploration reads as organized uncertainty. Missing or unavailable sources appear explicitly. No direct mutation action is offered from the observatory.
```

Pass condition:

```text
The Navigator can explain the Journey's Ariad position, active or available work, Refinement state and Exploration state from the observatory, and confirms that the UI behaves as a read-only map rather than an editor.
```

Fail condition:

```text
The view hides important source absence, mixes Delivery, Refinement and Exploration into one backlog, offers mutation controls without an explicit runtime boundary, changes source state during observation, or fails to orient the Navigator to next safe movement.
```

## Validation Evidence

Pending implementation and validation.
