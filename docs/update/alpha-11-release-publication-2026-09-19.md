# Alpha 11 Release Publication, 2026-09-19

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.11`  
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes Conversation Search and Close Safety for Mirror Desktop, including CV-008.DS-006 conversation search and turn navigation, CR037 close confirmation while agents are working, and the related Composer draft persistence refinements. The Navigator explicitly authorized the governed release route for the `mirror-desktop` Journey, including gates, alpha endpoint publication, Git push, immutable tag, GitHub prerelease, and verification.

This authority does not include stable-channel promotion, Apple Developer ID signing, notarization, app-store distribution, production Mirror data mutation, production Conversation recovery, or mutation of unrelated Journey, credential, identity, attachment, or app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.11` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
3d2dccec069607aa527fa335b4668139b0908000
```

Release note:

```text
docs/releases/v0.2.0-alpha.11.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.11.md
```

Release-reading body SHA-256:

```text
da07f7b53aa9eb96e7c7e1c39243617fc0b78520abbd6e1fd60460d80f1b2a8c
```

## Release Gates

- Candidate inspection: passed for version `0.2.0-alpha.11`, intended tag `v0.2.0-alpha.11`, source revision `3d2dccec069607aa527fa335b4668139b0908000`, clean worktree, version-file agreement, and artifact `Mirror Desktop_0.2.0-alpha.11_x64.dmg`.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64` using explicit local runtime binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.11`, and governed Darwin target families.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- Complete frontend suite: 847 tests passed across 155 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Complete Rust suite: 154 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- `git diff --check`: passed.
- Alpha build, staging, publication and remote byte verification: passed.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.11_x64.dmg` | 7,076,789 | `99f3748638df00302dfc329ebc05735c7e3d6f0f5058ea7b4b98ae4136763ec6` |
| `Mirror Desktop.app.tar.gz` | 7,051,865 | `64d8126df9798cd1880baa3ddfd35454eae9b7e57aeeb1e42740130b31c0e16a` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `a7f45ee44b80847b287dc76158bbed12ad1d71c99b24a29df17096b5bcb8d7bb` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.11
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
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.11.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.10/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.10/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.10/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.9/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.11.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.11.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.11_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All validated updater manifests are byte-identical, report version `0.2.0-alpha.11`, publication timestamp `2026-09-19T14:31:53.152Z`, canonical alpha URLs, a 416-character signature, and the exact validated release-reading envelope. Manifest SHA-256:

```text
2f8c529d8a51466040ae800dedc6c1deb8a7fde4db0382e10b7aa7e97749ee85
```

Remote byte verification matched local or staged bytes:

| Remote surface | SHA-256 |
| --- | --- |
| release note | `da07f7b53aa9eb96e7c7e1c39243617fc0b78520abbd6e1fd60460d80f1b2a8c` |
| release index | `81e6c63279fcff4d44bb95990502131f74b766d18324b1d567aaa62e9da4e4a3` |
| updater archive | `64d8126df9798cd1880baa3ddfd35454eae9b7e57aeeb1e42740130b31c0e16a` |
| updater signature | `a7f45ee44b80847b287dc76158bbed12ad1d71c99b24a29df17096b5bcb8d7bb` |
| versioned DMG | `99f3748638df00302dfc329ebc05735c7e3d6f0f5058ea7b4b98ae4136763ec6` |
| latest DMG alias | `99f3748638df00302dfc329ebc05735c7e3d6f0f5058ea7b4b98ae4136763ec6` |
| latest download manifest | `9b9f1a48d1008755a5a30729148f034694c06b1b4bd7efa2665029b97e7937bf` |

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, Nautilus Harness state, or production Conversation data. No stable promotion, Apple signing, notarization, app-store distribution, production recovery, or separate public announcement is performed.
