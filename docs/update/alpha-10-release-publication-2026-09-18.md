# Alpha 10 Release Publication, 2026-09-18

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.10`
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes RS018 Terminal-Aligned Conversation Continuity. The Navigator explicitly authorized uninterrupted execution of the governed alpha release route, including all gates, alpha endpoint publication, Git push, immutable tag, GitHub prerelease, verification, and bounded evidence required to make `v0.2.0-alpha.10` available.

This authority does not include stable-channel promotion, installation over the stable app, Apple Developer ID signing, notarization, app-store distribution, production Mirror data mutation, production Conversation recovery, or mutation of protected Mirror, Journey, conversation, attachment, credential, identity, or unrelated app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.10` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
9859e1f704959cbaeb683049a1b3f40bd51bf3d7
```

Release note:

```text
docs/releases/v0.2.0-alpha.10.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.10.md
```

Release-reading body SHA-256:

```text
2a2f0ecba380d8deb79d1ffa7c9b45278abae2a0f3d9205f82862fca063bd481
```

## Release Gates

- Release-reading validation: passed for `v0.2.0-alpha.10`, title `Terminal-Aligned Conversation Continuity`, with 7 bounded highlights.
- Candidate inspection: passed for version `0.2.0-alpha.10`, intended tag `v0.2.0-alpha.10`, source revision `9859e1f704959cbaeb683049a1b3f40bd51bf3d7`, clean worktree, version-file agreement, artifact `Mirror Desktop_0.2.0-alpha.10_x64.dmg`, and DMG SHA-256 `ed4156f5a30ed33254ddf194ec10c8ffe8ac9ff12768b163efdf7923b1bf2e7e`.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64` using explicit local DEV binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.10`, and governed Darwin target families.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Complete frontend suite: 835 tests passed across 153 files.
- Complete Rust suite: 154 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- `git diff --check`: passed.
- Alpha build, staging, publication and remote byte verification: passed.

## Signed Alpha Candidate

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

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization.

## Alpha Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths include:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.10.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.9/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.9/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.9/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.10.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.10.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.10_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All six updater manifests are byte-identical, report version `0.2.0-alpha.10`, publication timestamp `2026-09-19T02:58:00.677Z`, canonical alpha URLs, a 416-character signature, and the exact validated release-reading envelope. Manifest SHA-256:

```text
232c08c9ab15bdf9e941dc7b3a967f22dc5f1bced036c8ae656229ebb09616ba
```

Remote byte verification matched local or staged bytes:

| Remote surface | SHA-256 |
| --- | --- |
| release note | `2a2f0ecba380d8deb79d1ffa7c9b45278abae2a0f3d9205f82862fca063bd481` |
| release index | `7cfe0d8d56e8583fb9ccb92fdc8d8e49aef39b1cc740c546231e7da28111a7e2` |
| updater archive | `88d01172754ba410c24b58b45c0b2bc9b3e023fb8583b3f6a3565a381f5b3337` |
| updater signature | `834bc6b88c18fc31f4cd407e487e66bd6b06525ece5b315a9c2b3c85a181b6a9` |
| versioned DMG | `ed4156f5a30ed33254ddf194ec10c8ffe8ac9ff12768b163efdf7923b1bf2e7e` |
| latest DMG alias | `ed4156f5a30ed33254ddf194ec10c8ffe8ac9ff12768b163efdf7923b1bf2e7e` |
| latest download manifest | `bca9a05cdbaf0b80c752f0e9a51febd62f40ab36a9d4be510fbf9a521e7fa103` |

## Git And GitHub Publication

Pending in this evidence revision until the commit is pushed, the immutable tag is created, and the GitHub prerelease is published.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, Nautilus Harness state, or production Conversation data. No stable promotion, installation over the stable app, Apple signing, notarization, app-store distribution, production recovery, or separate public announcement is performed.
