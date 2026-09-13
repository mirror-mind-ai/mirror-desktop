# Alpha 5 Release Publication — 2026-09-13

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.5`  
**Status:** published alpha prerelease

## Scope

This release brings exact canonical release readings into the trusted updater and installed application, corrects Agent Action summary ownership, gives point-in-time composer notices a bounded lifecycle, and restores semantic interaction contrast across all light themes. Roadmap reconciliation and the planned CV-008 Conversation Spaces horizon are included as source governance, not shipped Conversation Spaces behavior.

## Authorization

The Navigator explicitly authorized uninterrupted materialization, release-note authorship, commits, pushes, complete release gates, signed updater artifacts, endpoint publication, Git tag, and GitHub prerelease publication. Stable-channel promotion, application installation, Apple signing, notarization, and public announcement are not implied.

## Version And Source Authority

The following coordinates agree on `0.2.0-alpha.5`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Candidate source revision:

```text
b275b1730c1aeab5121f174d0ffc11649249622f
```

Intended immutable release tag: `v0.2.0-alpha.5`.

Canonical release note:

```text
docs/releases/v0.2.0-alpha.5.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md
```

Release-reading body SHA-256:

```text
76147c4f0e41e823b3a72f0fa70a93547af78e6f2d7b05ef24ef2399fca3112d
```

## Release Gates

- `npm ci`: passed; npm reported two moderate development-tool findings in Vitest and `@vitest/mocker`, with no high or critical finding and only a semver-major Vitest 5 remediation path.
- `npm run roadmap:check`: passed.
- Complete frontend suite: 701 tests passed across 128 files.
- Frontend production build: passed with the existing Vite chunk-size advisory.
- Rust suite: 111 tests passed.
- `cargo check --locked`: passed.
- Python script suite: 5 tests passed.
- Journey projection contract suite: 16 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.5`, and both Darwin architecture targets.
- Candidate inspection: passed with a clean worktree and exact version/tag agreement.

## Signed Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle with native identity:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.5
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.5_x64.dmg` | 6,777,836 | `e6c0cc47f9c5d49286a6f1427090e0abad5bdc254a50e9d7bc64fa29bf4f20f2` |
| `Mirror Desktop.app.tar.gz` | 6,755,019 | `d3ecab07d66efe5f924477c9d785062666b016d2b7a5ee9dac76351b74dc39b4` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `1b4e67382023cb625cbcf1a2bbeaf11a52ce51da07b7e5878fafc8c46eb038fa` |

The updater signature is non-empty. `codesign --verify --deep --strict` reports that the application bundle is not Apple-signed in architecture `x86_64`, matching the known Developer ID and notarization boundary. Updater signing does not claim Apple signing or notarization.

## Alpha Endpoint Publication

The checksum-matched payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.5.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.4/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.4/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.4/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.5.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.5.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.5_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests report `0.2.0-alpha.5`, publication timestamp `2026-09-13T16:00:10.606Z`, the canonical alpha release-note and updater artifact URLs, a non-empty signature, and the exact validated `release_reading` envelope derived from `docs/releases/v0.2.0-alpha.5.md`.

Downloaded updater bytes, signature, versioned DMG, stable DMG alias, release note, and release index match the local staged payload. The `updates.mirrormind.com.br` compatibility alias also reports `0.2.0-alpha.5` with canonical `.sh` payload coordinates.

## Source And GitHub Publication

The complete source history and candidate evidence were pushed to `origin/main`. Annotated tag `v0.2.0-alpha.5` points to the endpoint-publication evidence revision:

```text
a5b1ea6ce4f176cd24a691bef124959a46918cb5
```

The signed binaries remain attributable to candidate source revision `b275b1730c1aeab5121f174d0ffc11649249622f`; the intervening commits contain bounded release evidence only.

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.5
```

GitHub reports the release as a non-draft prerelease published at `2026-09-13T16:02:15Z`. Downloaded copies of all three uploaded assets match the local candidate SHA-256 digests:

- `Mirror.Desktop_0.2.0-alpha.5_x64.dmg`
- `Mirror.Desktop.app.tar.gz`
- `Mirror.Desktop.app.tar.gz.sig`

GitHub Actions inspection after both source pushes returned no workflow runs for `main`.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local `whats-new-state.v1.json` receipt required for exact release recognition. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state. No stable-channel promotion, runtime installation, Apple signing, or notarization is performed.
