# Validation — CV-003.DS-002.US-1

## Status

Blocked

## Automated Checks

- npm test -- src/tests/journeyDocumentation.test.ts src/tests/journeyDocumentationBrowser.test.tsx src/tests/operationalJourneyWorkspace.test.tsx: 3 files, 18 tests passed
- npm test: 31 files, 209 tests passed
- npm run build: TypeScript and Vite production build passed
- cargo test: 13 tests passed
- cargo check: passed
- Tauri launch check: application remained running until controlled stop

Checks status: passed

## E2E

Decision: required

Evidence: Native tests prove registry-owned Journey root resolution, deterministic recursive projection, relative-path-only payloads, traversal/absolute-path rejection, symlink omission, supported UTF-8 reads and unavailable fallbacks. A browser visual fixture confirmed tree expansion, selected content, metadata and full-width layout at /tmp/nautilus-ds2-us1-document-browser.png. Final acceptance requires Navigator inspection in the real registry-backed desktop app; no provider turn is required.

## Navigator Validation

Route: Launch Nautilus Harness, select a Journey with nested docs, open Operational → Artifacts, expand folders, select Markdown/text and unsupported items, switch Journeys, then return to Conversation.

Navigator accepted: no

Expected observation: The left panel shows the selected Journey docs hierarchy; the right panel shows safe content or honest details/metadata; no absolute paths or file actions appear; stale Journey content does not leak; Conversation state remains unchanged.

Pass condition: Navigator accepts the real desktop documentation browser, native root boundary and Conversation continuity.

Fail condition: The tree is not the selected Journey docs hierarchy, content or metadata is wrong, path authority escapes docs, stale data appears, mutation/attachment is offered, runtime work starts, or Conversation state changes.

## Missing Evidence

- Navigator validation has not been accepted
