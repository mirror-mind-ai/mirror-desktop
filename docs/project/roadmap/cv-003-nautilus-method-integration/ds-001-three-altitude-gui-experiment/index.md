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

## Candidate Stories

| Code | Story | Type | Outcome | Status |
|------|-------|------|---------|--------|
| [CV-003.DS-001.TS-1](cv-003-ds-001-ts-1-altitude-navigation-and-preview-contract/index.md) | Altitude Navigation and Preview Contract | Technical Story | Define the three-altitude UI state, representative Journey preview data and characterization boundary without changing runtime ownership | ✅ Done |
| [CV-003.DS-001.US-1](cv-003-ds-001-us-1-operational-journey-workspace/index.md) | Operational Journey Workspace | User Story | Preserve the working conversation while composing a nearby, dense Operational view with a clearly representative artifacts panel | 🟠 In Validation |
| [CV-003.DS-001.US-2](cv-003-ds-001-us-2-tactical-journey-preview/index.md) | Tactical Journey Preview | User Story | Let the Navigator feel missions, evidence and deliverables as a quieter tactical reading of the same representative Journey | 🟡 Planned |
| [CV-003.DS-001.US-3](cv-003-ds-001-us-3-strategic-journey-preview/index.md) | Strategic Journey Preview | User Story | Let the Navigator feel realizations, impacts and pragmatic/integrative value as a spacious strategic reading of the same Journey | 🟡 Planned |
| [CV-003.DS-001.US-4](cv-003-ds-001-us-4-three-altitude-desktop-review/index.md) | Three-Altitude Desktop Review | User Story | Validate the complete visual transition in the real desktop app and record whether to continue, correct or discard the direction | 🟡 Planned |

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
