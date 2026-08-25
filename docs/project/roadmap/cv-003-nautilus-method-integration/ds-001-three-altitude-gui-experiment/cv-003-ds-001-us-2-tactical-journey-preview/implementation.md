# Implementation — CV-003.DS-001.US-2

## Summary

Implemented the durable Tactical Journey workspace shell as a pure read-only presentation over the existing representative Journey model.

## Delivered Behavior

- Replaced the Tactical foundation placeholder with `TacticalJourneyWorkspace`.
- Made the active mission the dominant directional anchor.
- Resolved evidence and deliverables through the mission's explicit relationship IDs so unrelated records do not appear.
- Rendered deliverable state as descriptive metadata only.
- Removed all Preview copy from the mission banner after Navigator review.
- Keyed representative Tactical data to its owning Journey ID so it cannot appear for another selected Journey.
- Added a shared inert Tactical/Strategic empty-data surface contextualized with the selected Journey name.
- Kept Strategic on its US-3 foundation placeholder.
- Added no forms, mutation controls, persistence, effects, native commands, Pi/Mirror/provider callbacks or runtime imports.
- Preserved the existing Operational Conversation/Artifacts composition and ephemeral altitude state.
- Added Tactical-scoped desktop styling with a calmer hierarchy and a narrow-layout fallback.

## TDD Evidence

The focused suite first failed because the Tactical component and App branch did not exist. It passed after introducing the pure component, relationship filtering and narrow App composition.

```text
Focused: 3 files, 12 tests passed
Frontend: 34 files, 234 tests passed
npm run build: passed
cargo test: 14 passed
cargo check: passed
```

## Desktop Evidence

Visual inspection confirmed:

- Tactical opens directly on the mission, followed by evidence and deliverables;
- the redundant Journey header summary and Tactical framing labels are absent;
- no Preview marker remains in the mission banner;
- Strategic shows the contextual no-data surface;
- automated component coverage proves non-matching Journeys receive the Tactical no-data surface;
- no composer or execution action is mounted;
- the right inspector recedes outside Operational Conversation;
- an unsent Operational draft survived the Tactical round trip byte-for-byte.

Screenshot:

```text
/tmp/nautilus-us2-tactical-workspace.png
/tmp/nautilus-us2-tactical-compact.png
/tmp/nautilus-us2-tactical-contextual.png
/tmp/nautilus-us2-strategic-empty.png
```

## Files

```text
src/app/TacticalJourneyWorkspace.tsx
src/app/JourneyAltitudeEmptyState.tsx
src/app/journeyAltitudePreview.ts
src/app/App.tsx
src/styles/app.css
src/tests/tacticalJourneyWorkspace.test.tsx
src/tests/operationalJourneyWorkspace.test.tsx
```

## Boundaries Preserved

- No live tactical derivation.
- No task-management workflow.
- No Strategic implementation.
- No provenance or checkpoint semantics.
- No native, filesystem, conversation, reconciliation or invocation changes.
