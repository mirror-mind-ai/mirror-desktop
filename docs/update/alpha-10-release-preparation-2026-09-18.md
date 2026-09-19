# Alpha 10 Release Preparation, 2026-09-18

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.10`
**Status:** prepared locally; not published

## Scope

This candidate delivers RS018 Terminal-Aligned Conversation Continuity. It makes Pi JSONL the authoritative agent transcript, keeps Desktop projections and Conversation Segments rebuildable, makes native occupancy the only successor-blocking execution authority, keeps Mirror synchronization model-free and non-blocking, and validates recovery across outage, interruption, relaunch, concurrent Journeys, failed native leaves, post-native delivery repair, and deleted copied caches.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.10` in:

```text
package.json
package-lock.json
src-tauri/tauri.conf.json
src-tauri/Cargo.toml
src-tauri/Cargo.lock
```

Intended immutable tag, if publication is later authorized:

```text
v0.2.0-alpha.10
```

No tag was created for this preparation.

Canonical release note:

```text
docs/releases/v0.2.0-alpha.10.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.10.md
```

Release-reading body SHA-256:

```text
2a2f0ecba380d8deb79d1ffa7c9b45278abae2a0f3d9205f82862fca063bd481
```

## Preparation Gates

- Release-reading validation: passed for `v0.2.0-alpha.10`, title `Terminal-Aligned Conversation Continuity`, with 7 bounded highlights.
- Candidate inspection: passed for version `0.2.0-alpha.10`, intended tag `v0.2.0-alpha.10`, artifact `Mirror Desktop_0.2.0-alpha.10_x64.dmg`, and DMG SHA-256 `ed4156f5a30ed33254ddf194ec10c8ffe8ac9ff12768b163efdf7923b1bf2e7e`; worktree was dirty because the preparation files were local and uncommitted.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on the `x86_64` build host using explicit local DEV binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.10`, and governed Darwin target families.
- Roadmap consistency: passed with `Mirror Desktop roadmap: READY`.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- `cargo check --locked`: passed after the frontend build existed.
- Complete frontend suite: 835 tests passed across 153 files.
- Complete Rust suite: 154 tests passed, 1 ignored.
- Python release-script suite: 5 tests passed.
- `git diff --check`: passed.

## Updater-Signed Local Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.10
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.10_x64.dmg` | 7,066,254 | `ed4156f5a30ed33254ddf194ec10c8ffe8ac9ff12768b163efdf7923b1bf2e7e` |
| `Mirror Desktop.app.tar.gz` | 7,045,643 | `88d01172754ba410c24b58b45c0b2bc9b3e023fb8583b3f6a3565a381f5b3337` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `834bc6b88c18fc31f4cd407e487e66bd6b06525ece5b315a9c2b3c85a181b6a9` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.10
Executable: Mach-O 64-bit executable x86_64
```

## Publication Boundary

This preparation does not authorize or perform Git tag creation, Git push, GitHub Release, endpoint upload, stable latest alias mutation, notarization, public announcement, production installation, production app-data mutation, or production Mirror mutation.

Before publication, the Navigator must explicitly authorize the release publication route. That route should re-check a clean release revision, create the immutable tag, stage/publish alpha artifacts and manifests, validate endpoints, and record publication evidence.

## Protected-State Boundary

The release may replace application bytes only after a separate publication/install decision. It must not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state.
