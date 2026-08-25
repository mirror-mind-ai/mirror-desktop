# Validation — CV-003.DS-001.US-2

## Status

Blocked

## Automated Checks

- npm test -- src/tests/tacticalJourneyWorkspace.test.tsx src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudePreview.test.ts: 3 files, 12 tests passed
- npm test: 33 files, 232 tests passed
- npm run build: TypeScript and Vite production build passed
- cargo test: 14 tests passed
- cargo check: passed

Checks status: passed

## E2E

Decision: required

Evidence: Browser-based desktop-shell inspection confirmed the Tactical mission anchor, related Evidence and Deliverables, explicit representative-preview status, absence of composer/actions, and byte-exact survival of the unsent Operational draft after the round trip. Screenshot: /tmp/nautilus-us2-tactical-workspace.png. Final acceptance requires Navigator inspection in the real Tauri desktop app.

## Navigator Validation

Route: Launch the desktop app, type an unsent draft in Operational → Conversation, select Tactical, inspect mission/evidence/deliverables and preview honesty, then return to Operational.

Navigator accepted: no

Expected observation: Tactical feels calmer and more directional than Operational; mission leads; evidence and deliverables feel related; no editing or execution affordance appears; the Operational draft and conversation remain unchanged.

Pass condition: Navigator accepts this composition as the permanent Tactical shell for later hydration by CV-003.DS-003.

Fail condition: Tactical resembles a task board/dashboard, hierarchy is weak, preview content appears authoritative, an action/composer appears, layout is unacceptable, or Operational continuity changes.

## Missing Evidence

- Navigator validation has not been accepted
