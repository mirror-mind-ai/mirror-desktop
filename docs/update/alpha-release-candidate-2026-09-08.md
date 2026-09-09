# Alpha Release Candidate — v0.2.0-alpha.1

**Date:** 2026-09-08
**Journey:** mirror-desktop
**Status:** published to private alpha endpoint after explicit Navigator authorization

## Result

Prepared the first governed Mirror Desktop alpha release candidate:

```text
v0.2.0-alpha.1
```

This candidate was first staged locally for review, then published to the private alpha endpoint after explicit Navigator authorization. No Git tag, GitHub Release, push, notarization, public announcement, app-data mutation, or Mirror-data mutation was performed.

## Version Authority

Updated release sources to:

```text
package.json: 0.2.0-alpha.1
package-lock.json: 0.2.0-alpha.1
src-tauri/tauri.conf.json: 0.2.0-alpha.1
src-tauri/Cargo.toml: 0.2.0-alpha.1
```

## Release Notes

Created:

```text
docs/releases/v0.2.0-alpha.1.md
```

Updated:

```text
docs/releases/index.md
```

Alpha release notes URL reserved for publication:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.1.md
```

## Build

Built with the alpha updater overlay:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.mirror-desktop-updater/alpha/updater.key)" \
TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" \
npm run tauri -- build --bundles app,dmg --config src-tauri/tauri.alpha-update.conf.json
```

Artifacts:

```text
src-tauri/target/release/bundle/dmg/Mirror Desktop_0.2.0-alpha.1_x64.dmg
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz
src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig
```

SHA-256:

```text
f8d372fec7c59cf709d3097cf8fd693b630edde2960b30722ea5ec251efea52c  Mirror Desktop_0.2.0-alpha.1_x64.dmg
df4609d26d2b67848f8f6ea1f33107975e3d9277d193ae790f2913f8a4c7a6b2  Mirror Desktop.app.tar.gz
8508f221aee0815f97b4dc113c9bbe8c99b7814c325b6ad684118d9e0439874b  Mirror Desktop.app.tar.gz.sig
```

## Staging

Staged locally with:

```bash
npm run release:private-update -- \
  --version 0.2.0-alpha.1 \
  --base-url https://updates.mirrormind.sh/mirror-desktop/alpha \
  --current-version 0.2.0-alpha.0 \
  --current-version 0.2.0-alpha.1 \
  --artifact 'src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz' \
  --signature 'src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz.sig' \
  --dmg 'src-tauri/target/release/bundle/dmg/Mirror Desktop_0.2.0-alpha.1_x64.dmg'
```

Staged directory:

```text
.tmp/private-update-publication/v0.2.0-alpha.1
```

Staged manifest paths:

```text
darwin/0.2.0-alpha.0/latest.json
darwin/0.2.0-alpha.1/latest.json
darwin-x86_64/0.2.0-alpha.0/latest.json
darwin-x86_64/0.2.0-alpha.1/latest.json
darwin-aarch64/0.2.0-alpha.0/latest.json
darwin-aarch64/0.2.0-alpha.1/latest.json
```

Manifest preview:

```json
{
  "version": "0.2.0-alpha.1",
  "notes": "https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.1.md",
  "url": "https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.1.app.tar.gz",
  "signatureLength": 416
}
```

## Validation

Passed:

```text
npm run alpha:channel:check
npm test -- src/tests/releaseNotes.test.mjs src/tests/releaseCandidate.test.mjs src/tests/alphaChannelGovernance.test.mjs src/tests/privateUpdatePublish.test.mjs
npm run build
npm run tauri -- build --bundles app,dmg --config src-tauri/tauri.alpha-update.conf.json
node scripts/release_candidate.mjs --json --artifact Mirror Desktop_0.2.0-alpha.1_x64.dmg --sha256 <dmg-sha256> --architecture x64 --release-notes-base-url https://updates.mirrormind.sh/mirror-desktop/alpha/releases
npm run release:private-update -- --version 0.2.0-alpha.1 --base-url https://updates.mirrormind.sh/mirror-desktop/alpha ...
```

## Private Alpha Publication

Navigator explicitly authorized publishing `v0.2.0-alpha.1` to the private alpha endpoint.

Published paths validated:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.1.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.0/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.1/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.0/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.1/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.0/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.1/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.1.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.1_x64.dmg
```

A first publish attempt used the alpha base URL with the default root web directory, which placed alpha files under the private-test root. The root pollution was repaired by removing the accidental alpha root files/manifests and restoring the root private-test release index. The publication script now derives the default web root from the base URL so `/mirror-desktop/alpha` maps to `/var/www/mirror-desktop-updates/mirror-desktop/alpha` unless explicitly overridden.

Post-repair validation confirmed:

```text
alpha release note: 200
alpha manifest: 200
root alpha release note: 404
root alpha manifest: 404
root private-test index: restored
```

## Clickable Alpha Bootstrap Rehearsal

Navigator manually validated the private alpha channel from the installed bootstrap app:

```text
0.2.0-alpha.0 -> 0.2.0-alpha.1
```

Observed result:

```text
chip appeared with the expected update state
update completed without errors
app relaunched on the private alpha release
functioning was perfect
```

This confirms the governed private alpha channel can move an installed alpha app from a previous alpha version to the published signed update artifact.

## Boundary

The alpha candidate is published to the private alpha endpoint. The following remain unperformed and require separate explicit Navigator authorization:

- publish staged files to the alpha endpoint;
- create Git tag `v0.2.0-alpha.1`;
- push commits;
- create a GitHub Release;
- submit for Apple notarization;
- announce public availability;
- promote to production/stable.

The updater artifact targets application bytes only and does not target Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, app data, or Nautilus Harness state.
