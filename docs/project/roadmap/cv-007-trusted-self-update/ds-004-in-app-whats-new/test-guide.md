[< Story](index.md)

# Test Guide: CV-007.DS-004

## Aggregate Validation

Validate that exact release information moves coherently from the canonical release-note source into the staged updater manifest, the offered-update UI, a channel-local pending receipt and the verified post-relaunch What's New state without becoming update authority or touching Mirror data.

## Child Work Packages

- CV-007.DS-004.TS-1: deterministic release reading and additive updater manifest contract.
- CV-007.DS-004.US-1: concise pre-update reading and complete Details surface.
- CV-007.DS-004.US-2: exact-version post-relaunch recognition, Later, Got it and reopening.
- CV-007.DS-004.TS-2: channel-local state, malformed input, version mismatch and authority guardrails.

## Automated Checks

```bash
npx vitest run \
  src/tests/releaseReading.test.ts \
  src/tests/whatsNewStorage.test.ts \
  src/tests/selfUpdateNotification.test.tsx \
  src/tests/selfUpdatePanel.test.tsx \
  src/tests/privateUpdatePublish.test.mjs \
  src/tests/releaseNotes.test.mjs \
  src/tests/updateChannel.test.ts \
  src/tests/updateInstallation.test.ts
npm run roadmap:check
npm test
npm run build
cd src-tauri && cargo test --locked && cargo check --locked
```

Exact test filenames may be adjusted if the implementation preserves an existing cohesive suite rather than creating a redundant file. The behavioral coverage may not be dropped.

## Contract Scenarios

- A valid reading matches `Mirror Desktop`, offered version, canonical HTTPS URL and body SHA-256.
- Missing additive metadata preserves legacy update availability with an honest unavailable explanation.
- Mismatched product, version, URL, field bounds or body hash cannot be displayed.
- The concise popover and complete Settings reading show content from the same envelope.
- Details, Later, Got it and Update remain separate explicit actions.
- Pending state is written before installation and cannot claim success until startup observes the exact target version.
- Mismatched, malformed and stale pending state never produces a What's New success prompt.
- Acknowledgement is exact-version and channel-local; it suppresses emphasis but not Settings access.
- Runtime-busy, consent, updater verification, download, install, relaunch and rollback behavior remains unchanged.

## Navigator Validation

Use the isolated `Mirror Desktop Dev` bundle, `ai.mirrormind.desktop.dev`.

1. Load a controlled available update containing a valid reading. Open the header chip and verify title, digest, highlights, versions and preservation copy.
2. Choose Details. Verify the complete release body and source URL correspond to the same offered version and no installation begins.
3. Load a legacy or malformed reading. Verify the app says details are unavailable while the trusted update action remains governed by existing checks.
4. Create a controlled channel-local pending receipt for the current Dev version and restart Dev. Verify the chip says `what's new` without opening a modal.
5. Choose Later, restart and confirm the reminder remains. Choose Got it, restart and confirm emphasis stays dismissed while Settings can reopen the reading.
6. Use a mismatched target version and confirm the app never claims that release was installed.
7. Confirm the user-channel application and all Mirror/Journey data remain untouched.

## Pass Condition

The exact release reading is understandable before update and recoverable after exact-version relaunch; legacy and failure states remain honest; acknowledgement behaves predictably; and existing updater trust, runtime and protected-data boundaries are unchanged.

## Fail Condition

Fail if content can cross versions or channels, a malformed reading blocks or authorizes installation incorrectly, post-update success is inferred without exact version evidence, dismissal destroys Settings access, any surface auto-installs or auto-opens, or protected user/Mirror state is touched.

## Validation Evidence

Pending implementation and aggregate Navigator validation.
