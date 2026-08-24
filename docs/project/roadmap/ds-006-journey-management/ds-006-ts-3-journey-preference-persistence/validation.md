# Validation — DS-006.TS-3

## Status

Passed

## Automated Checks

- npm test passed: 12 test files, 49 tests
- npm run build passed
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated visually: pins, order mode, active Journey and recents persist through app restart using journey-preferences.json; no secrets/provider config/env vars are stored.

## Navigator Validation

Route: Run npm run tauri -- dev. Change Journey sidebar state: pin/unpin some Journeys, switch order to A–Z or Tree, select a different active Journey, and send a message to update recents. Quit and restart the app. Confirm pins, ordering mode, active Journey and recents restore from ~/Library/Application Support/com.nautilus.harness/journey-preferences.json.

Navigator accepted: yes

Expected observation: Journey preferences persist locally across app restarts without storing secrets or provider configuration.

Pass condition: Pinned Journey ids, active Journey, recent Journey ids and selected order restore after restart; invalid registry ids are ignored; no Mirror/workspace/Pi side effects occur.

Fail condition: Preferences reset on restart, preferences file contains secrets/provider config/env vars, invalid ids break the sidebar, or saving preferences invokes Pi/Mirror/workspace actions.

## Missing Evidence

- none
