# Alpha 12 Release Publication, 2026-09-19

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.12`  
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes the CR055 corrective alpha for Mirror Desktop: the Composer is released after a terminal provider failure has settled as an interrupted attempt, while the preserved native attempt remains unchanged and provider retry remains explicit.

The Navigator explicitly authorized the governed publication route for the `mirror-desktop` Journey, including alpha endpoint publication, Git push, immutable tag, GitHub prerelease, and remote byte verification.

This authority did not include stable-channel promotion, Apple Developer ID signing, notarization, app-store distribution, production Mirror data mutation, production Conversation repair, installation over stable, or mutation of unrelated Journey, credential, identity, attachment, or app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.12` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
04e06c2f9022e74aa927dac5edbf069d425d52fd
```

Published Git tag:

```text
v0.2.0-alpha.12
```

Tag object:

```text
34a93bcf562e6a3df9838991a8de1db22baa4b47
```

Tag target commit:

```text
94cd25e18de18bd27b432c4a2a35c6ef3331a1c2
```

Release note:

```text
docs/releases/v0.2.0-alpha.12.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.12.md
```

Release-reading body SHA-256:

```text
e1eddfbc36ede34260d136d01bb1571c395ed3011188f4f7be2c4ff1bfa58312
```

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.12
```

## Release Gates

- Release-reading validation: passed for `v0.2.0-alpha.12`.
- Candidate inspection: passed for version `0.2.0-alpha.12`, intended tag `v0.2.0-alpha.12`, source revision `04e06c2f9022e74aa927dac5edbf069d425d52fd`, clean worktree, version-file agreement, and artifact `Mirror Desktop_0.2.0-alpha.12_x64.dmg`.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- `git diff --check`: passed.
- Complete frontend suite: 847 tests passed across 155 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64` using explicit local runtime binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.12`, and governed Darwin target families.
- Complete Rust suite: 154 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Signed alpha build, staging, publication and remote byte verification: passed.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.12_x64.dmg` | 7,078,496 | `b97e689f7ad7e52322b70d82dd155f1e40178b33d444ed6aacc2b634f75b8f90` |
| `Mirror Desktop.app.tar.gz` | 7,053,350 | `c7e105adb2c7128c65985da727414007677b02425a645415c4d5810cfeb7463e` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `14b4965e9966065a59198e51f139c54ec6dcaf12fd142b13351be2102141fbaf` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.12
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
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.12.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.12.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.12.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.12_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.11/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.12/latest.json
```

Remote byte verification confirmed the published endpoint matches local candidate bytes:

| Remote payload | Bytes | SHA-256 |
|----------------|------:|---------|
| updater artifact | 7,053,350 | `c7e105adb2c7128c65985da727414007677b02425a645415c4d5810cfeb7463e` |
| updater signature | 416 | `14b4965e9966065a59198e51f139c54ec6dcaf12fd142b13351be2102141fbaf` |
| versioned DMG | 7,078,496 | `b97e689f7ad7e52322b70d82dd155f1e40178b33d444ed6aacc2b634f75b8f90` |
| latest DMG alias | 7,078,496 | `b97e689f7ad7e52322b70d82dd155f1e40178b33d444ed6aacc2b634f75b8f90` |
| release note | 4,384 | `e1eddfbc36ede34260d136d01bb1571c395ed3011188f4f7be2c4ff1bfa58312` |
| release index | 4,212 | `68a6e77f17903def17e5ebffcb2e1353ee1f93080e90465fdfb4dc5f3a0ca838` |
| macOS download manifest | 357 | `95a95671309589eee9b9930e648de529a17172922cafe11d812f6690dc4065b2` |
| alpha.11 x86_64 updater manifest | 6,368 | `a5b201e4757a917d97eea460028937f697f22cdaa5c9a9817747f802973f2be3` |
| alpha.12 x86_64 updater manifest | 6,368 | `a5b201e4757a917d97eea460028937f697f22cdaa5c9a9817747f802973f2be3` |

The updater manifests report version `0.2.0-alpha.12`, updater URL `https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.12.app.tar.gz`, notes URL `https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.12.md`, and release-reading body SHA `e1eddfbc36ede34260d136d01bb1571c395ed3011188f4f7be2c4ff1bfa58312`.

## Git Publication

`origin/main` was advanced to:

```text
94cd25e18de18bd27b432c4a2a35c6ef3331a1c2
```

The annotated tag `v0.2.0-alpha.12` was pushed to GitHub and targets the same candidate commit.

## Boundaries Preserved

No stable-channel promotion, notarization, app-store delivery, Windows/Linux packaging, production Mirror data mutation, production Conversation repair, local stable installation, implicit provider retry, fallback-provider selection, or unrelated app-data mutation was performed.
