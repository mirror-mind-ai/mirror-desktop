# Alpha 2 Publication

**Journey:** mirror-desktop
**Version:** 0.2.0-alpha.2
**Date:** 2026-09-09
**Endpoint:** `https://updates.mirrormind.sh/mirror-desktop/alpha`

## Authorization

Navigator authorized preparing and publishing `0.2.0-alpha.2`.

## Source Revision

```text
e0d556a1a7dd74d14d75d183962d87bc6b6ec6a4
```

## Validation

```bash
npm run alpha:channel:check
npm test -- src/tests/selfUpdateNotification.test.tsx src/tests/runtimeChannelConfiguration.test.ts src/tests/alphaBuild.test.mjs src/tests/alphaChannelGovernance.test.mjs src/tests/privateUpdatePublish.test.mjs src/tests/releaseCandidate.test.mjs src/tests/releaseNotes.test.mjs
npm run alpha:build
```

Result: passed. Vite emitted the existing large chunk warning only.

## Artifact

```text
src-tauri/target/release/bundle/dmg/Mirror Desktop_0.2.0-alpha.2_x64.dmg
```

SHA-256:

```text
1ac8f6e4bd1b1b675eeb2e8334c919d246defb27fea1192f04f4dda4e808804d
```

Updater artifacts:

```text
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig
```

## Published Paths Validated

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.2.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.1/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.1/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.2.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.2_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

The `latest.json` download manifest reports:

```json
{
  "version": "0.2.0-alpha.2",
  "dmg": "https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.dmg",
  "artifact": "https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.2_x64.dmg",
  "releaseNotes": "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.2.md"
}
```

## Boundaries

No Git tag, GitHub Release, Apple notarization submission, stable channel promotion, production/stable updater declaration, Mirror home mutation, `memory.db` mutation, identity mutation, credentials mutation, Journey content mutation, conversations mutation, app data mutation, or Nautilus Harness state mutation was performed.
