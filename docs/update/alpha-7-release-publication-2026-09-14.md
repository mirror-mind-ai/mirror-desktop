# Alpha 7 Release Publication — 2026-09-14

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.7`
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes CV-008.DS-002 Expanded Concurrent Journey Turns. The Navigator explicitly authorized push, tag, upload, publication, and every act required to complete the release without interruption. This authority remains limited to the governed alpha release: it does not imply stable-channel promotion, installation, Apple Developer ID signing, notarization, or mutation of protected Mirror, Journey, conversation, attachment, credential, identity, or unrelated app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.7` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Candidate source revision:

```text
1d442cb042f279cf3f5db302ae80ba2c03be3103
```

Release note:

```text
docs/releases/v0.2.0-alpha.7.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.7.md
```

Release-reading body SHA-256:

```text
eeeaaac4bfa9d7ab6ecee6a8d877b576076b4acfe8d03f9bbb07e793b79b3c83
```

## Release Gates

- `npm ci`: passed with two moderate development-tool findings, no high or critical finding, and only a breaking automatic remediation path.
- Complete frontend suite: 717 tests passed across 131 files.
- Frontend production build: passed with the existing Vite chunk-size advisory.
- Rust suite: 117 tests passed.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- Alpha updater preflight and clean candidate inspection: passed.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.7_x64.dmg` | 6,829,474 | `47f6139ac5bada76273dbf25a7b2090ee846bd1eafbe19cd642b41282ab52faf` |
| `Mirror Desktop.app.tar.gz` | 6,806,186 | `620bec7b70f84722673df26bc87b524ca1bb7f625b79853353beacce9a3a0c43` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `3b5891b965c26fe6942463bd60728888474633756c7d4308883a5314e9c159de` |

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization. Local inspection found zero valid code-signing identities and no `MirrorDesktop` notarytool profile.

## Alpha Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths include:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.7.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.6/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.6/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.6/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.7.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.7.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.7_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests are byte-identical, report version `0.2.0-alpha.7`, publication timestamp `2026-09-14T13:18:12.818Z`, canonical alpha URLs, a 416-character signature, and the exact validated release-reading envelope. Manifest SHA-256:

```text
4887cf83099ce7e425cf095a7a0359757e259093d6cfd0c248d15a96f206af4e
```

The downloaded release note, release index, updater archive, signature, versioned DMG, latest DMG alias, and manifests match local or staged bytes exactly. The `updates.mirrormind.com.br` compatibility alias returns the exact canonical manifest bytes.

## Git And GitHub Publication

The complete source history, release authority, and endpoint evidence were pushed to `origin/main`. Annotated tag `v0.2.0-alpha.7` resolves to endpoint-evidence revision:

```text
9b2cd8402d011022f33fb09418656bcca01d7590
```

The updater-signed binaries remain attributable to candidate source revision `1d442cb042f279cf3f5db302ae80ba2c03be3103`; intervening commits contain bounded preparation and publication evidence only.

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.7
```

GitHub reports a non-draft prerelease published at `2026-09-14T13:20:31Z`. Downloaded copies of all three assets match the local candidate SHA-256 digests and byte counts:

- `Mirror.Desktop_0.2.0-alpha.7_x64.dmg`
- `Mirror.Desktop.app.tar.gz`
- `Mirror.Desktop.app.tar.gz.sig`

The tag is annotated but not GPG-signed. Artifact trust remains the separate updater-signature contract.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state. No stable promotion, installation, Apple signing, notarization, or public announcement is performed.
