# Versioned macOS Release Candidate

This is the manual release-candidate route for Mirror Desktop. It creates a reviewable release identity before any publication, signing, notarization or self-update authority exists.

## Authority

The canonical version must match in all source coordinates:

```text
package.json
src-tauri/tauri.conf.json
src-tauri/Cargo.toml
```

The Git tag for version `X.Y.Z` is exactly:

```text
vX.Y.Z
```

A release candidate starts only from a clean authorized revision. The tag is the immutable source authority for the produced artifact, checksum, provenance receipt and release notes.

## Inspect the candidate

```bash
npm run release:candidate
npm run release:candidate -- --json \
  --artifact 'Mirror Desktop_X.Y.Z_x64.dmg' \
  --architecture x64 \
  --sha256 '<sha256>'
```

The inspection is read-only. It does not create a tag, build an artifact, publish a release, push, sign, notarize or mutate remote state.

## Build and verify

The user-channel build is updater-enabled and signed. It overlays `src-tauri/tauri.alpha-update.conf.json` and requires the trusted updater key at `$HOME/.mirror-desktop-updater/alpha/updater.key` or the path named by `MIRROR_DESKTOP_UPDATER_SIGNING_KEY`; it has no unsigned fallback.

Run the ordinary gates from a clean checkout:

```bash
npm ci
npm test
npm run build
(
  cd src-tauri
  cargo test
  cargo check --locked
)
uv run python -m unittest discover -s scripts/tests -p 'test_*.py'
npm run tauri:build:user -- -- --locked
```

Verify the bundle identity and selected artifact checksum:

```bash
/usr/libexec/PlistBuddy -c 'Print :CFBundleName' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/Info.plist'
file 'src-tauri/target/release/bundle/macos/Mirror Desktop.app/Contents/MacOS/mirror-desktop'
shasum -a 256 'src-tauri/target/release/bundle/dmg/Mirror Desktop_X.Y.Z_<architecture>.dmg'
```

Expected identity:

```text
Bundle name: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
```

## Provenance receipt

A release candidate receipt records only bounded facts:

```text
product
version
tag
source revision
artifact filename
architecture
SHA-256
build-host architecture and bounded macOS version
gate statuses
release notes path
promotion decision: pending | promoted | rejected
rollback target, when known
```

Do not record credentials, private paths, Mirror user slugs, Journey names, prompts, responses, database contents, identity documents, channel URLs or personal delivery details.

## Promotion and rollback

Promotion is a separate maintainer decision after candidate validation. A promoted candidate may be attached to an immutable release record or private distribution location chosen for that release capability. Rejection preserves the provenance receipt with the reason and does not reuse the tag for different bytes.

Rollback means pointing consumers to an earlier trusted version and checksum. It does not delete Mirror homes, application data, Nautilus Harness state or local conversations.

## Boundaries

This process does not implement in-app update discovery, automatic installation, public access widening, app-store distribution, Windows or Linux packaging. Signing and notarization remain explicit future decisions unless separately added to the release plan.
