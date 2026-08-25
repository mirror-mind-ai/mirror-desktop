# Validation — CV-003.DS-001.US-2

## Status

Blocked

## Automated Checks

- npm test -- src/tests/tacticalJourneyWorkspace.test.tsx src/tests/journeyAltitudeEmptyState.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts: 4 files, 14 tests passed
- npm test: 34 files, 234 tests passed
- npm run build: TypeScript and Vite production build passed
- cargo test: 14 tests passed
- cargo check: passed

Checks status: passed

## E2E

Decision: required

Evidence: Desktop-shell inspection confirmed stronger Evidence/Deliverables and 01/02 hierarchy, removal of all Preview copy, and a contextual Strategic empty surface naming the selected Journey. Automated tests prove Tactical representative data resolves only for its owning Journey and non-matching Journeys receive the inert contextual empty surface. Screenshots: /tmp/nautilus-us2-tactical-contextual.png and /tmp/nautilus-us2-strategic-empty.png. Final acceptance requires Navigator inspection with the real multi-Journey registry.

## Navigator Validation

Route: In the real desktop app, inspect Tactical for nautilus-harness, then select a Journey without Tactical data and inspect Tactical and Strategic. Confirm hierarchy, absence of Preview copy, Journey naming and empty-state isolation.

Navigator accepted: no

Expected observation: Evidence/Deliverables and 01/02 are visually stronger than their items; no Preview marker remains; only nautilus-harness receives its representative Tactical reading; other Journeys show their own contextual no-data surface in Tactical and Strategic.

Pass condition: Navigator accepts the hierarchy and confirms no Tactical/Strategic data leaks across selected Journeys.

Fail condition: Preview copy remains, headings remain indistinguishable from items, another Journey receives nautilus-harness data, the empty surface names the wrong Journey, or Operational continuity changes.

## Missing Evidence

- Navigator validation has not been accepted
