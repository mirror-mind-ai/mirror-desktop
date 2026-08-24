# Validation — DS-006.TS-6

## Status

Passed

## Automated Checks

- npm run import:mirror -- --message-limit 80 wrote journey-registry.json and materialized 46 Journey conversation files under user app data
- Running import a second time created a timestamped backup directory with 46 existing conversation files before overwrite
- Legacy mirror-bootstrap.json is absent from user app data after import
- npm test passed: 11 test files, 39 tests
- npm run build passed; app bundle remains ~270 kB JS and does not bundle imported data
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated visually: real Journeys appear from local journey-registry.json, selected Journeys load conversations from journey-conversations/<journey-id>.json, and the runtime no longer depends on mirror-bootstrap.json.

## Navigator Validation

Route: Run npm run import:mirror, restart npm run tauri -- dev, confirm real Journeys appear from local journey-registry.json, select several Journeys and confirm conversations load from journey-conversations/<journey-id>.json. Run npm run import:mirror again and confirm a new journey-conversations/backups/<timestamp>/ directory is created.

Navigator accepted: yes

Expected observation: The app reads only local Harness registry and conversation files; there is no runtime bootstrap file branch. Reimport overwrites local conversations only after backing up existing files.

Pass condition: Real Journeys appear, conversations open, mirror-bootstrap.json is not used, reimport creates backups, Mirror remains read-only, and no Pi/workspace action is invoked.

Fail condition: App still depends on mirror-bootstrap.json, conversations require imported-vs-persisted branching, reimport overwrites without backup, or Journeys/conversations fail to load.

## Missing Evidence

- none
