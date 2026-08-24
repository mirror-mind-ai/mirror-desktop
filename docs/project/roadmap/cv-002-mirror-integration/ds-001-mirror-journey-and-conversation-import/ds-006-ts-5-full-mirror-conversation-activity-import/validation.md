# Validation — DS-006.TS-5

## Status

Passed

## Automated Checks

- npm run import:mirror -- --message-limit 80 materialized importedActivity into local Journey conversation files
- Inspected local files: nautilus conversation has 76 imported activity records including 64 ariad_surface events; nautilus-harness has 38 ariad_surface events; softwarezen has llm_call metadata activity
- npm test passed: 11 test files, 40 tests
- npm run build passed
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated that importedActivity is present in canonical local conversation JSON files, existing user/assistant messages remain readable, and the app still loads conversations normally.

## Navigator Validation

Route: Run npm run import:mirror -- --message-limit 80. Inspect ~/Library/Application Support/com.nautilus.harness/journey-conversations/nautilus.json and nautilus-harness.json and confirm conversation.importedActivity.events includes ariad_surface/metadata provenance records while conversation.messages still contains normal user/assistant turns. Start the app and confirm conversations still load normally.

Navigator accepted: yes

Expected observation: Local canonical Journey conversation files preserve an inert importedActivity trace for observable Mirror activity/provenance without breaking current chat rendering.

Pass condition: importedActivity is present where Mirror durable data contains Ariad surfaces or metadata; existing messages still load; no tool/command is executed; Mirror remains read-only; no chain-of-thought field is introduced.

Fail condition: Activity data is absent for known Ariad-surface conversations, app conversation loading breaks, imported records become executable actions, or private chain-of-thought is imported as a first-class field.

## Missing Evidence

- none
