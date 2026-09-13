# Alpha 5 Release Publication — 2026-09-13

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.5`  
**Status:** signed candidate staged; publication authorized

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

## Staged Alpha Payload

The checksum-matched endpoint payload is staged locally under:

```text
.tmp/alpha-5-publication
```

It contains the updater archive and signature, versioned DMG, stable macOS DMG alias, download manifest, canonical release note and index, and updater manifests for `darwin`, `darwin-x86_64`, and `darwin-aarch64` clients currently on `0.2.0-alpha.4`.

Every staged updater manifest reports `0.2.0-alpha.5`, the canonical alpha release-note and artifact URLs, a non-empty signature, and the exact validated `release_reading` envelope derived from `docs/releases/v0.2.0-alpha.5.md`.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local `whats-new-state.v1.json` receipt required for exact release recognition. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state. No stable-channel promotion, runtime installation, Apple signing, or notarization is performed.
