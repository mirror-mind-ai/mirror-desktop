# Validation — DS-006.TS-2

## Status

Passed

## Automated Checks

- npm test passed: 12 test files, 42 tests
- npm run import:mirror -- --message-limit 80 exported Mirror bootstrap to user app-data disk
- npm run build passed; bootstrap data is not bundled in app JS
- cd src-tauri && cargo check passed

Checks status: passed

## E2E

Decision: required

Evidence: Navigator validated that real Mirror Journeys now appear in the desktop app, Journey selection opens imported conversations, and Livro Liderança Soberana now loads after changing latest-conversation selection to prefer the newest non-empty Mirror conversation.

## Navigator Validation

Route: Run npm run import:mirror, restart npm run tauri -- dev, search/select real Journeys including Nautilus, Amplia, Ariad, Mirror Dev, and Livro Liderança Soberana.

Navigator accepted: yes

Expected observation: The Harness reads the Mirror bootstrap from user disk, preserves the real Journey hierarchy/search surface, and seeds one local Nautilus conversation per Journey from Mirror history when messages exist.

Pass condition: Real Journeys appear, seeded conversations open, no Pi invocation happens automatically, Mirror remains read-only, and bootstrap data is outside the app bundle.

Fail condition: Registry remains partial, conversations do not open, Livro Liderança Soberana stays empty despite non-empty Mirror history, data remains bundled, or import mutates Mirror/workspace.

## Missing Evidence

- none
