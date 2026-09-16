# Alpha 8 Release Publication, 2026-09-16

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.8`
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes CV-008.DS-004 Multiple Conversations per Journey. The Navigator explicitly requested a new release, authorizing the governed alpha push, tag, endpoint upload, GitHub prerelease, and bounded evidence needed to complete it. This authority does not include stable-channel promotion, installation, Apple Developer ID signing, notarization, app-store distribution, or mutation of protected Mirror, Journey, conversation, attachment, credential, identity, or unrelated app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.8` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
ab672354d96d61b851b91297184be62cdac3d514
```

Release note:

```text
docs/releases/v0.2.0-alpha.8.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.8.md
```

Release-reading body SHA-256:

```text
f720144f330e484bf43d2b97cf81f8b0810fe9ff5b8abb63cbbb83116ecd6f91
```

## Release Gates

- `npm ci`: passed with two moderate development-tool findings, no high or critical finding, and only a breaking automatic remediation path.
- Complete frontend suite: 779 tests passed across 142 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Rust suite: 132 tests passed; one explicitly generated real-Pi fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- Alpha maintainer preflight, updater preflight, clean candidate inspection, updater-signed build, bundle identity, staged payload, and remote byte verification: passed.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.8_x64.dmg` | 7,018,699 | `d7bbcd643b822e658c2074bd1b44a7bf403a4fe99f7eeeb928f8d2568f744749` |
| `Mirror Desktop.app.tar.gz` | 7,000,622 | `9c2f306e013a63a41947f95b7c9a7a05f56ca1e5dfac962e2c11c88dd3b8409b` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `65825233f5f3a363cfd25e11ed87f5e722b4cd33f785c8a3394e61889b266ae4` |

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization. Local inspection found zero valid code-signing identities.

## Alpha Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths include:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.8.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.7/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.7/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.7/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.8.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.8.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.8_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests are byte-identical, report version `0.2.0-alpha.8`, publication timestamp `2026-09-16T13:58:38.792Z`, canonical alpha URLs, a 416-character signature, and the exact validated release-reading envelope. Manifest SHA-256:

```text
80c9977412345cbc04b1ba73bb091d8bee6f26dc5e6ac04b86bf6e56193055fd
```

The downloaded release note, release index, updater archive, signature, versioned DMG, latest DMG alias, download manifest, and updater manifests match the local or staged bytes exactly. The compatibility host returned the exact canonical manifest bytes.

## Git And GitHub Publication

The completed source and endpoint evidence are intended for `origin/main` under annotated tag `v0.2.0-alpha.8`. The updater-signed binaries remain attributable to candidate source revision `ab672354d96d61b851b91297184be62cdac3d514`; subsequent commits contain bounded release preparation and publication evidence only.

The GitHub release must remain a non-draft prerelease and attach the exact DMG, updater archive, and updater signature whose hashes are recorded above. The tag is annotated but not GPG-signed. Artifact trust remains the separate updater-signature contract.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state. No stable promotion, installation, Apple signing, notarization, app-store distribution, or separate public announcement is performed.
