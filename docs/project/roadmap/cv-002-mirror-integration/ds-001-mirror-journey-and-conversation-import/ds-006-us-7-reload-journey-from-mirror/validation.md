# Validation — DS-006.US-7

## Status

Passed

## Automated Checks

- python3 scripts/export_mirror_bootstrap.py --journey-id amplia --message-limit 5 reloaded only the Amplia Journey conversation and created backup through existing materialization path
- npm test passed: 15 test files, 65 tests
- npm run build passed
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Observed the dev UI at http://localhost:1420: conversation header menu opens and includes Reload from Mirror above Restart Conversation. Verified local materialization evidence: ~/Library/Application Support/com.nautilus.harness/journey-conversations/amplia.json exists and backup exists at journey-conversations/backups/2026-08-23T13-12-08.272574Z/amplia.json after single-Journey reload. Full Tauri route remains available for manual confirmation.

## Navigator Validation

Route: Run npm run tauri -- dev. Open a Journey that has recent Mirror terminal changes. Use the conversation header menu ⋯ → Reload from Mirror. Confirm the action closes the menu, shows feedback, refreshes the visible conversation, creates a backup in journey-conversations/backups/<timestamp>/, and does not change other Journey conversation files.

Navigator accepted: yes

Expected observation: The active Journey can be explicitly refreshed from Mirror without continuous sync, Pi invocation, or broad import.

Pass condition: Only the selected Journey conversation is overwritten after backup, importedActivity remains present, the chat reloads visibly, Mirror remains read-only, and no workspace/Pi side effects occur.

Fail condition: Reload imports all Journeys, fails to backup, does not refresh the active chat, invokes Pi, mutates Mirror/workspace, or creates multiple local conversations for the Journey.

## Missing Evidence

- none
