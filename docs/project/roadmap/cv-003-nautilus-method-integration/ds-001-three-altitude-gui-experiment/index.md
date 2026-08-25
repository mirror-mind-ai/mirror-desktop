[< CV-003](../index.md)

# CV-003.DS-001 - Three-Altitude GUI Experiment

**Status:** 🟡 Planned

## Outcome

Navigator can switch among operational, tactical and strategic wireframe views of the selected Journey and feel them as changes of distance over one continuous territory.

## Experience Slice

- Preserve the current Journey selection sidebar.
- Add a persistent altitude selector for Operational, Tactical and Strategic views.
- Keep the existing conversation functional in the Operational view.
- Compose a Journey artifacts panel as a visual preview beside the conversation.
- Compose Tactical preview content for missions, evidence and deliverables.
- Compose Strategic preview content for realizations, impacts and pragmatic/integrative value.
- Use one coherent set of representative Journey content across all three views.
- Give each altitude a distinct density and rhythm while preserving the shared application shell.

## Validation Intent

Run the real desktop app and evaluate whether changing altitude feels like moving closer to or farther from the same Journey. Capture Navigator feedback before planning real artifact projection or semantic derivation.

## Done Condition

This experiment is done when all three views are navigable in the current Harness, the Operational conversation remains usable, preview content is clearly non-authoritative, existing Journey selection and conversation safety contracts remain intact, automated characterization tests are green, and the Navigator has recorded whether the visual direction should be continued, corrected or discarded.

## Boundary

- This is a product-learning implementation, not the final Nautilus information model.
- Do not implement real tactical or strategic derivation in this story.
- Do not add new implicit Pi, provider or Mirror invocation.
- Do not broaden filesystem authority; the artifact panel may use representative preview data in this experiment.
- Provenance, confidence, correction and synthesis checkpoints remain deferred to CV-003.DS-005.

## Source

- [Explorer handoff](../../../explorations/tres-altitudes-da-jornada-no-nautilus-harness/index.md)
