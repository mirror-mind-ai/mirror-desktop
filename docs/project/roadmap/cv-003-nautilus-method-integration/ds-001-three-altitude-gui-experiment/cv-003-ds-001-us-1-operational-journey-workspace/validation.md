# Validation — CV-003.DS-001.US-1

## Status

Blocked

## Automated Checks

- npm test -- src/tests/operationalJourneyWorkspace.test.tsx src/tests/journeyAltitudeSwitcher.test.tsx: 2 files, 11 tests passed
- npm test: 29 files, 197 tests passed
- npm run build: TypeScript and Vite production build passed
- cargo test: 8 tests passed
- cargo check: passed

Checks status: passed

## E2E

Decision: required

Evidence: Correction validated in the live local GUI: Operational Chat opened at full width with the inspector collapsed; Artifacts replaced Chat at full width with an internal browser/detail composition; returning to Chat preserved the unsent draft. Tactical/Strategic remained bounded placeholders. Screenshots remain outside the repository at /tmp/nautilus-us1-full-chat.png and /tmp/nautilus-us1-full-artifacts.png.

## Navigator Validation

Route: Review the corrected Harness GUI and confirm that Chat and Artifacts alternate at full workspace width, the inspector is optional and Chat-only, returning preserves the draft/conversation, and future altitudes are not compressed by a permanent sidebar.

Navigator accepted: no

Expected observation: Operational opens on full-width Chat; selecting Artifacts replaces it with a full-width artifact canvas; no permanent artifact sidebar remains; returning to Chat preserves state and triggers no runtime work.

Pass condition: Navigator accepts full-width Chat/Artifacts alternation as the corrected Operational workspace.

Fail condition: Either surface remains permanently compressed, the inspector stays open outside Chat, operational state is lost, or surface navigation triggers/hides runtime work.

## Missing Evidence

- Navigator validation has not been accepted
