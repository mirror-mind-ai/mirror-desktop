# Alpha 6 Release Publication — 2026-09-13

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.6`  
**Status:** alpha endpoint published; Git tag and GitHub prerelease authorized and pending

## Scope

This release delivers CV-008.DS-001 active-turn Steering and CR029 long-conversation responsiveness. It lets the Navigator send FIFO text corrections to the exact active Pi process with evidence-backed application truth, then keeps growing Journey transcripts out of composer-only renders and mounts historical operation bodies only when requested. CV-008.DS-004 receives the broader continuity and compaction contract as source governance, not shipped multiple-conversation behavior.

## Authorization

The Navigator explicitly authorized uninterrupted merge, version materialization, release-note authorship, commits, pushes, complete release gates, signed updater artifacts, alpha endpoint publication, Git tag and GitHub prerelease publication. This authorization does not convert updater signing into Apple signing or notarization, promote a stable channel, mutate protected Mirror/Journey/app data, or require installation into the user channel.

## Version And Source Authority

The following coordinates agree on `0.2.0-alpha.6`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Candidate source revision:

```text
79822c7d95ad1e02ca53af154aa6da51c7243638
```

Intended immutable release tag: `v0.2.0-alpha.6`.

Canonical release note:

```text
docs/releases/v0.2.0-alpha.6.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.6.md
```

Release-reading body SHA-256:

```text
21e1307f22bdf22e7c93e34ec1a0b2a628b4555c6c5c6506e6f984d5416ddfc5
```

## Release Gates

- `npm ci`: passed; npm reported two moderate development-tool findings with no high or critical finding and a semver-major remediation path.
- `npm run roadmap:check`: passed.
- Complete frontend suite: 715 tests passed across 131 files.
- Frontend production build: passed with the existing Vite chunk-size advisory.
- Rust suite: 116 tests passed.
- `cargo check --locked`: passed.
- Python script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance and publication tooling: 21 focused tests passed.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.6`, and both Darwin architecture targets.
- Candidate inspection: passed from a clean worktree with exact version, tag and release-note agreement.

## Signed Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle with native identity:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.6
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.6_x64.dmg` | 6,827,762 | `738421e2796f7e5efb10c599947408094f9c5fd3a28d0e40a4b05f77666dd165` |
| `Mirror Desktop.app.tar.gz` | 6,799,194 | `aed72c1dcde729a0f5073338d3ac9b82b4055a7e2da7691c93e3a9856f1ad0fa` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `9d828ca37cf788be538f7bf79de6fd18d387f7b3baa2be7f70aab4eacda4d3fe` |

The updater signature is non-empty. `codesign --verify --deep --strict` reports that the application is not Apple-signed in architecture `x86_64`; `security find-identity -v -p codesigning` reports zero valid identities; and `xcrun notarytool history --keychain-profile MirrorDesktop` reports no stored profile. These are the known Developer ID and notarization boundaries, not updater-signing failures.

## Alpha Endpoint Publication

The checksum-matched payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.6.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.5/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.5/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.5/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.6.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.6.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.6_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests report `0.2.0-alpha.6`, publication timestamp `2026-09-13T22:14:24.645Z`, canonical alpha release-note and updater artifact URLs, a non-empty 416-character signature and the exact validated `release_reading` envelope. The published manifest SHA-256 is:

```text
1040d4f4f9cef97eeeb6f39eddf897ab0a4c1775da8bcda904c5ec185765e763
```

Downloaded updater bytes, signature, versioned DMG, stable DMG alias, release note, release index and all manifests match the local staged payload. The `updates.mirrormind.com.br` compatibility alias is an exact manifest match and retains canonical `.sh` payload coordinates.

## Source And GitHub Publication

The candidate source revision was pushed to `origin/main`. The annotated tag and GitHub prerelease are pending the commit that records this endpoint evidence so published binaries remain attributable to the clean candidate source while the immutable tag includes the bounded publication receipt.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local `whats-new-state.v1.json` receipt required for exact release recognition. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data or Nautilus Harness state. No stable-channel promotion, runtime installation, Apple signing, notarization or public announcement is performed.
