# Plan — CV-003.DS-001.US-2

## Objective

Establish the permanent Tactical Journey workspace composition over the existing representative Journey model. Make the active mission the directional anchor, connect its evidence and deliverables in a calmer hierarchy, label all content explicitly as representative preview data, preserve the selected Journey and Operational conversation, and leave live derivation to `CV-003.DS-003`.

## Product Reading

Tactical is a change of distance, not a dashboard or task manager. Operational activity recedes so the Navigator can recognize direction and supporting signals. The visual hierarchy should read in this order:

1. this is representative preview data;
2. this is the active mission and why it matters;
3. these evidence signals support that mission;
4. these deliverables express movement toward it.

Evidence and deliverables are not independent inventories. They are resolved through the mission's existing `evidenceIds` and `deliverableIds`, making the causal relationship visible without introducing provenance semantics that belong to later stories.

## Implementation Shape

### 1. Characterize the Tactical contract first

Add focused failing tests for:

- mission title and purpose rendering;
- inclusion of only mission-related evidence and deliverables;
- explicit representative-preview language;
- semantic section/list hierarchy and Tactical tab-panel identity;
- absence of forms, composer controls, execution actions and live-data claims;
- App composition mounting Tactical while Strategic remains the existing foundation placeholder;
- no coupling between Tactical selection and invocation functions.

### 2. Introduce a dedicated Tactical presentation component

Create `src/app/TacticalJourneyWorkspace.tsx` rather than expanding `App.tsx` or overloading `JourneyAltitudePlaceholder.tsx`.

The component should:

- receive the typed representative Journey preview as input;
- render a `tabpanel` labeled `Tactical workspace`;
- show the existing representative preview badge prominently but quietly;
- render one mission anchor with title and purpose;
- resolve and render its related evidence and deliverables deterministically;
- represent deliverable state as read-only descriptive metadata, not an actionable workflow;
- contain no local persistence, effects, commands or runtime imports.

Keep the representative model immutable. If relation resolution needs a helper, keep it pure and colocated with the presentation boundary or the existing preview module.

### 3. Mount Tactical without disturbing Operational

In `src/app/App.tsx`:

- preserve the current Operational Conversation/Artifacts branch exactly;
- mount `TacticalJourneyWorkspace` only when `selectedAltitude === "tactical"`;
- keep `JourneyAltitudePlaceholder` for Strategic until US-3;
- pass the existing `representativeJourneyPreview` explicitly;
- do not add effects, persistence or invocation callbacks.

Altitude selection remains ephemeral and selectors remain disabled under their existing active-run/reload conditions.

### 4. Establish Tactical visual rhythm

Extend `src/styles/app.css` under Tactical-specific classes:

- use the available workspace width with a bounded readable measure;
- make the mission anchor visually dominant;
- place evidence and deliverables as related secondary regions, using two columns where desktop width permits;
- use more breathing room and less event-level density than Conversation/Artifacts;
- preserve the existing Nautilus color/material language;
- avoid kanban columns, progress bars, numeric scores and controls that imply editability;
- retain legibility at the normal desktop window and collapse safely at the existing narrow breakpoint.

### 5. Validate continuity and safety

Run focused tests, the complete frontend suite, production build, Rust tests and Rust check. Then inspect the real Tauri desktop app without sending a provider turn:

- type an unsent Operational draft;
- move to Tactical;
- verify mission → evidence/deliverable hierarchy and preview honesty;
- verify no composer or execution action exists;
- return to Operational and confirm conversation/draft/runtime continuity.

## Expected Files

```text
src/app/TacticalJourneyWorkspace.tsx                new
src/app/App.tsx                                     narrow composition change
src/styles/app.css                                  Tactical-scoped styles
src/tests/tacticalJourneyWorkspace.test.tsx         new focused behavior tests
src/tests/operationalJourneyWorkspace.test.tsx      composition/safety characterization
```

No Rust, Python, storage, registry, conversation, Pi or Mirror files are expected to change.

## Acceptance Behavior

```text
Given the shared representative Journey model
When Tactical is rendered
Then the active mission is the strongest reading
And evidence and deliverables shown are related through that mission
And all content is unmistakably representative preview data.
```

```text
Given the Tactical workspace
When I inspect its available controls and markup
Then I find no composer, send action, form, mutation control, drag/drop affordance or provider action
And deliverable states are descriptive only.
```

```text
Given draft text and existing Operational state
When I select Tactical and return to Operational
Then the draft, conversation, reconciliation and runtime state are unchanged
And no Pi, Mirror or provider invocation occurred.
```

## Non-Goals

- Do not implement `CV-003.DS-001.US-3` or the aggregate foundation review.
- Do not derive tactical meaning from real artifacts or conversation activity.
- Do not introduce provenance, confidence, correction or checkpoint semantics.
- Do not add mission CRUD, deliverable status transitions or task management.
- Do not persist altitude or Tactical state.
- Do not alter Journey registry, filesystem projection or conversation ownership.
- Do not introduce native commands or provider/Mirror invocation.

## Required Checks

```bash
npm test -- src/tests/tacticalJourneyWorkspace.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

## Navigator Validation Route

1. Launch the real Tauri desktop app and select `nautilus-harness`.
2. In Operational → Conversation, type a distinctive draft without sending.
3. Select Tactical.
4. Read the surface from mission to evidence and deliverables.
5. Confirm representative-preview labeling and absence of composer/actions.
6. Return to Operational and confirm the draft and conversation remain intact.
7. Optionally switch Journeys while idle and confirm Tactical remains a projection, not persisted Journey state.

### Expected observation

Tactical feels calmer and more directional than Operational. The mission leads; evidence and deliverables feel causally related rather than like independent card collections. Preview status is honest, and no part of the surface suggests editing, workflow execution or live derivation.

### Pass condition

The Navigator accepts the composition as the permanent Tactical shell for later hydration by `CV-003.DS-003`, with Operational continuity and invocation safety preserved.

### Fail condition

The surface resembles a task board or dashboard, the mission hierarchy is weak, evidence/deliverables feel unrelated, preview data appears authoritative, any execution/editing affordance appears, or Operational state changes across the round trip.

## Stop Conditions

- The composition requires live derivation to be understandable.
- Relation resolution requires changing the shared semantic model beyond representative presentation needs.
- Mounting Tactical threatens Operational conversation ownership or runtime state.
- The work begins absorbing Strategic, provenance/checkpoint or task-management semantics.
- Required regression checks fail without a story-scoped fix.

## Implementation Contract

- Follow TDD for behavior changes.
- Keep all Tactical data representative, sanitized and visibly labeled.
- Keep the component pure and presentation-only.
- Preserve explicit invocation and three-body reconciliation boundaries.
- Use no `dangerouslySetInnerHTML`.
- Use `uv run` for project Python commands when applicable.
- Stage only story-scoped files; do not use `git add .`.
- Commit coherent changes with descriptive English messages explaining why.

## Approval Gate

Implementation remains blocked until the Navigator approves this plan.
