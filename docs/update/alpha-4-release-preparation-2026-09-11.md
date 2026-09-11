# Alpha 4 Release Publication — 2026-09-11

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.4`  
**Status:** published alpha prerelease

## Scope

This release consolidates RS011 into the next governed `0.2.0` alpha. It delivers stable same-Journey settlement, semantic assistant-turn composition, durable terminal action disclosure, historical-turn compaction, and exact copy controls for fenced Agent Comment blocks.

## Authorization

The Navigator authorized version and release-note updates, all release gates, local signed candidate creation, Git push, annotated tag, GitHub prerelease, and alpha endpoint publication without additional confirmation. Installation, stable-channel promotion, and Apple notarization were not requested.

## Version and Source Authority

The following coordinates agree on `0.2.0-alpha.4`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Candidate source revision:

```text
7de6c29d46d9ba54d12f80fc44d933769428d414
```

Immutable release tag: `v0.2.0-alpha.4`.

Release note:

```text
docs/releases/v0.2.0-alpha.4.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.4.md
```

## Release Gates

- `npm ci`: passed; npm reported two moderate development-tool findings in Vitest and `@vitest/mocker`, with no high or critical findings and only a semver-major Vitest 5 remediation path.
- Complete frontend suite: 673 tests passed across 123 files.
- Frontend production build: passed with the pre-existing Vite chunk-size warning.
- Rust suite: 109 tests passed.
- `cargo check --locked`: passed.
- Release Python suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 20 focused tests passed.
- Alpha updater preflight: passed for `ai.mirrormind.desktop` and version `0.2.0-alpha.4`.

## Signed Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle with native identity:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.4
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.4_x64.dmg` | 6,779,787 | `4d7730d670befb2ccc3dcd0e8e4a6fc6dbc27a80e3e097310f54253b2a8e1c9e` |
| `Mirror Desktop.app.tar.gz` | 6,755,024 | `ee2015fbf1170e917af098131298caee35b8159952f12e246435a79a2e370dc2` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `b6c4423e6d450906d4c2c7a2d27a1b32f86f986abe73152d23fd37f7a19dc586` |

The updater signature is non-empty. `codesign --verify --deep --strict` reports that the application bundle is not Apple-signed in architecture `x86_64`, matching the known Developer ID and notarization boundary. Updater signing does not claim Apple signing or notarization.

## Alpha Endpoint Publication

The checksum-matched payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.4.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.3/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.3/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.3/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.4.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.4_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests report `0.2.0-alpha.4`, the alpha release-note URL, updater artifact URL, and a non-empty signature. Downloaded updater bytes, versioned DMG bytes, stable DMG alias, release note, and release index match the local staged payload. The `updates.mirrormind.com.br` compatibility alias also reports `0.2.0-alpha.4`.

## Source and GitHub Publication

The linear release history was fast-forwarded and pushed to `origin/main`. Annotated tag
`v0.2.0-alpha.4` points to the endpoint-publication evidence revision:

```text
e349a3659c957d5f1cbe7b0508455d624914e1d0
```

The signed binaries remain attributable to candidate source revision
`7de6c29d46d9ba54d12f80fc44d933769428d414`; the intervening commit contains bounded
release evidence only.

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.4
```

GitHub reported the expected release as a non-draft prerelease and returned matching
SHA-256 digests for all three uploaded assets:

- `Mirror.Desktop_0.2.0-alpha.4_x64.dmg`
- `Mirror.Desktop.app.tar.gz`
- `Mirror.Desktop.app.tar.gz.sig`

GitHub Actions inspection after the push returned no workflow runs for `main`.

## Explicit Boundary

This release does not install or promote the user-channel application, mutate stable updater configuration, submit for Apple notarization, or touch Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, app data, or Nautilus Harness state. Installed-app self-update from `v0.2.0-alpha.3` remains a separate rehearsal.
