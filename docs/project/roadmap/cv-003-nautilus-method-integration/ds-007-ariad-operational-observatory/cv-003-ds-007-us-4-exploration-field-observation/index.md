[< Parent](../index.md)

# CV-003.DS-007.US-4 - Exploration Field Observation

**Status:** ✅ Done
**Type:** User Story

---

## User Story

As a Navigator observing exploratory work,
I want to inspect Exploratory Stories, attractors, experiments and handoff state,
So that I can see organized uncertainty without turning it into hidden backlog or premature delivery commitment.

## Outcome

The Exploration field renders active and historical Exploratory Stories as narrative surfaces with summary, current story, attractor, open tensions, experiment proposal, handoff state and promotion boundary.

## Acceptance Behavior

```text
Given a Journey has an active Exploratory Story
When I open the Exploration field
Then I see the active story, its state, summary, attractor or absence, experiment or absence, and promotion boundary
```

```text
Given an exploration has already produced a Builder handoff
When I inspect that story
Then I can see the handoff artifact links and understand that Builder promotion is separate from observation
```

## Scope

- Render active and historical Exploratory Stories for the selected Journey.
- Show story summary, last card, attractors, experiments, handoff artifacts and archive or promotion state when available.
- Preserve a narrative reading shape rather than a backlog list.
- Link to generated exploration documents when present.
- Show missing exploration data as an empty field with clear boundary.

## Out Of Scope

- Opening, thickening, archiving, handing off or promoting explorations from this view.
- Creating Delivery roadmap entries from Exploration automatically.
- Treating exploration items as planned work.
- Editing exploration documents.

## Validation

Navigator can open the Exploration field and distinguish living uncertainty, proposed experiment, Builder handoff and promoted work without reading the exploration as an obligation queue.
