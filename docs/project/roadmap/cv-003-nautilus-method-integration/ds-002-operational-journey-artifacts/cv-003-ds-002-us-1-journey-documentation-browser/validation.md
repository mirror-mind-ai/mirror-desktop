# Validation — CV-003.DS-002.US-1

## Status

Blocked

## Automated Checks

- npm test -- src/tests/journeyDocumentation.test.ts src/tests/journeyDocumentationBrowser.test.tsx src/tests/operationalJourneyWorkspace.test.tsx: 3 files, 17 tests passed
- npm test: 31 files, 208 tests passed
- npm run build: TypeScript and Vite production build passed
- cargo test: 14 tests passed
- cargo check: passed

Checks status: passed

## E2E

Decision: required

Evidence: The native boundary now projects the registered Journey root rather than an optional docs directory. Tests prove root-level files and folders appear, hidden entries and generated directories are omitted, direct reads of omitted components fail, hierarchy depth is bounded, symlinks/traversal remain blocked and payloads remain Journey-relative. Visual fixture: /tmp/nautilus-ds2-us1-journey-root-browser.png. Final acceptance requires Navigator inspection in the real registry-backed desktop app.

## Navigator Validation

Route: Select Journeys with and without docs directories, open Operational → Artifacts, verify root-level siblings such as docs, src and JOURNEY.md, inspect content/metadata, and confirm hidden/generated entries are absent.

Navigator accepted: no

Expected observation: The tree root is the registered Journey directory; visible root artifacts appear regardless of docs convention; hidden and generated entries remain absent; content/details stay safe and Conversation state remains unchanged.

Pass condition: Navigator accepts the Journey-root workspace browser and its omission/safety boundaries.

Fail condition: The browser still depends on docs, omits legitimate visible root artifacts, exposes hidden/generated content, escapes the registered Journey root, or changes Conversation/runtime state.

## Missing Evidence

- Navigator validation has not been accepted
