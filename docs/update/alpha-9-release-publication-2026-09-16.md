# Alpha 9 Release Publication, 2026-09-16

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.9`
**Status:** alpha endpoint published; Git tag and GitHub prerelease pending

## Scope And Authorization

This release publishes RS017 Reliable Agent Access and CR030 light-theme Journey Conversation contrast. The Navigator explicitly authorized uninterrupted execution of the governed alpha push, immutable tag, endpoint upload, GitHub prerelease, verification, and bounded evidence required to make `v0.2.0-alpha.9` available.

This authority does not include stable-channel promotion, installation over the stable app, Apple Developer ID signing, notarization, app-store distribution, or mutation of protected Mirror, Journey, conversation, attachment, credential, identity, or unrelated app data.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.9` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
623f4c7a354f4ffdf9cd136df8af9f364168d44f
```

Release note:

```text
docs/releases/v0.2.0-alpha.9.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.9.md
```

Release-reading body SHA-256:

```text
b752e5734fce683d463c7de5c974b8002c7915034ae56c35794ad76f74558248
```

## Release Gates

- `npm ci`: passed with two moderate development-tool findings, no high or critical finding, and only a breaking automatic remediation path.
- Complete frontend suite: 800 tests passed across 144 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Rust suite: 137 tests passed; one explicitly generated real-Pi fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- Alpha maintainer preflight, updater preflight, clean candidate inspection, updater-signed build, bundle identity, staged payload, and remote byte verification: passed.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.9_x64.dmg` | 7,021,779 | `1689ac8438de110c928adeba902c5d2621eda8a6390fac03c126be09b56288da` |
| `Mirror Desktop.app.tar.gz` | 6,999,816 | `64692b47840b72b464b76cfdba9d7e35bcc6f7c761eae039266f994c7809c0c3` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `a602a5a9fe5accc16a1c58eb9d4dd71f716f5a34cc9aad39c00572135fdb4db7` |

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization. Local inspection found zero valid code-signing identities.

## Alpha Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths include:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.9.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.8/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.9.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.9.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.9_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests are byte-identical, report version `0.2.0-alpha.9`, publication timestamp `2026-09-17T03:16:28.435Z`, canonical alpha URLs, a 416-character signature, and the exact validated release-reading envelope. Manifest SHA-256:

```text
01348d62d30f7fbad33ece8f58d93b8c7dcafe2ef7ae5ac0560f87f8e2ec60ca
```

The downloaded release note, release index, updater archive, signature, versioned DMG, latest DMG alias, download manifest, and updater manifests match the local or staged bytes exactly.

## Git And GitHub Publication

Pending the endpoint-evidence commit. The immutable tag and GitHub prerelease will be created from that exact committed publication record, then independently downloaded and verified before this evidence is completed.

## Explicit Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It does not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state. No stable promotion, installation, Apple signing, notarization, app-store distribution, or separate public announcement is performed.
