# Private Test Release — v0.1.1-test.1

**Date:** 2026-09-08
**Journey:** mirror-desktop
**Scope:** private release rehearsal on `updates.mirrormind.com.br`

## Result

Generated and published a private Mirror Desktop test release for the updater channel:

```text
v0.1.1-test.1
```

This was a private rehearsal release only. It did not create a Git tag, GitHub Release, notarization claim, public release, or stable updater key custody process.

## Version Authority

Updated local release sources to:

```text
package.json: 0.1.1-test.1
package-lock.json: 0.1.1-test.1
src-tauri/tauri.conf.json: 0.1.1-test.1
src-tauri/Cargo.toml: 0.1.1-test.1
```

## Updater Channel

Added a private-test updater overlay:

```text
src-tauri/tauri.private-test-update.conf.json
```

Endpoint:

```text
https://updates.mirrormind.com.br/mirror-desktop/{{target}}/{{current_version}}/latest.json
```

A local private-test updater signing key was generated outside the repository:

```text
~/.mirror-desktop-updater/private-test/updater.key
```

The private key is not committed. This is still a test-channel key, not final production key custody.

## Artifacts

Built with:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.mirror-desktop-updater/private-test/updater.key)" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
npm run tauri -- build --bundles app,dmg --config src-tauri/tauri.private-test-update.conf.json
```

Artifacts:

```text
src-tauri/target/release/bundle/dmg/Mirror Desktop_0.1.1-test.1_x64.dmg
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig
```

SHA-256:

```text
92078341de0b32155d3b3af21595d2d30aa3246bf29a8f8638c2c4fa7662b72e  Mirror Desktop_0.1.1-test.1_x64.dmg
8b9fe74cf234c7941096976983444670ae7f6de657c0b688cb4930fd2cdc26a6  Mirror Desktop.app.tar.gz
ab51cab01178cecb7c9c97c006e486dd17f89ac753ee7e216e47f740700a1f96  Mirror Desktop.app.tar.gz.sig
da5d9b09b6de6bdbf870bfb223dff5489d2c7ba59ed2cf37601e36b71a0ba1e8  latest.json
```

## Published Private URLs

Release notes:

```text
https://updates.mirrormind.com.br/mirror-desktop/releases/v0.1.1-test.1.md
```

Artifacts:

```text
https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1.app.tar.gz
https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1.app.tar.gz.sig
https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1_x64.dmg
```

Manifests published for private-test current-version paths:

```text
/mirror-desktop/darwin/0.1.1-test.0/latest.json
/mirror-desktop/darwin/0.1.1-test.1/latest.json
/mirror-desktop/darwin-x86_64/0.1.1-test.0/latest.json
/mirror-desktop/darwin-x86_64/0.1.1-test.1/latest.json
/mirror-desktop/darwin-aarch64/0.1.1-test.0/latest.json
/mirror-desktop/darwin-aarch64/0.1.1-test.1/latest.json
```

## Validation

Passed:

```text
npm test -- src/tests/releaseNotes.test.mjs src/tests/releaseCandidate.test.mjs
npm run build
node scripts/release_candidate.mjs --json
npm run self-update:preflight -- --config src-tauri/tauri.private-test-update.conf.json
npm run tauri -- build --bundles app,dmg --config src-tauri/tauri.private-test-update.conf.json
```

Endpoint checks passed:

```text
curl -fsS https://updates.mirrormind.com.br/mirror-desktop/releases/v0.1.1-test.1.md
curl -fsS https://updates.mirrormind.com.br/mirror-desktop/darwin/0.1.1-test.1/latest.json
curl -fsSI https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1.app.tar.gz
curl -fsSI https://updates.mirrormind.com.br/mirror-desktop/artifacts/Mirror%20Desktop_0.1.1-test.1_x64.dmg
```

## Clickable Bootstrap Rehearsal

Navigator manually validated the private-test channel from the installed bootstrap app:

```text
0.1.1-test.0 -> 0.1.1-test.1
```

Observed result:

```text
chip appeared with the expected update state
update completed without errors
app relaunched on the private test release
```

This confirms the private-test channel can move an installed app from a previous app version to the published signed update artifact.

## Boundary

This release changed application release artifacts only. It did not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, app data, or Nautilus Harness state.

Existing older rehearsal apps may not be able to self-update into this release if they were built with a different temporary updater public key. A bootstrap app built with `src-tauri/tauri.private-test-update.conf.json` is the correct base for this private-test channel.
