[< Story](index.md)

# Implementation — CV-003.DS-007

## Summary

Implemented the first complete local version of the Ariad Operational Observatory as a read-only Operational subview.

## Delivered Behavior

- Added `Operational > Ariad` beside Conversation and Artifacts.
- Extended the published Operational projection model to preserve Ariad content needed by the UI.
- Added a typed Ariad observatory read model for Ariad State, Next Safe Movement, Delivery, Refinement and Exploration.
- Added Ariad Observatory with Structure and Selected Matter panels.
- Added Delivery observation from roadmap hierarchy, including collapsible tree rows for roadmap items with children.
- Added Refinement observation from published Refinement Stories and Change Requests when present.
- Added Exploration observation from published Exploratory Stories, attractors, experiments and handoff metadata.
- Added unavailable-source and read-only boundary states.
- Added tests for read model composition, unavailable source behavior and component rendering.

## Changed Files

- `src/domain/ariadObservatory.ts`
- `src/domain/journeyProjections.ts`
- `src/app/AriadOperationalObservatory.tsx`
- `src/app/OperationalWorkspaceSwitcher.tsx`
- `src/app/App.tsx`
- `src/styles/app.css`
- `src/tests/ariadObservatory.test.ts`
- `src/tests/ariadOperationalObservatory.test.tsx`
- `src/tests/operationalJourneyWorkspace.test.tsx`

## Checks

- `npm test`
- `npm run build`

## Boundary

The observatory remains read-only. It does not edit roadmap artifacts, run Builder lifecycle actions, mutate Refinement Work, mutate Exploratory Stories, invoke Mirror, repair sources or synchronize background state.
