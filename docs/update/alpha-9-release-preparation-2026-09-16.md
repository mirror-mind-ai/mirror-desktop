# Alpha 9 Release Preparation, 2026-09-16

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.9`
**Status:** prepared locally; publication authorized by the Navigator

## Scope

This candidate delivers RS017 Reliable Agent Access and CR030 light-theme Journey Conversation contrast. It separates exact durable local completion from secondary Mirror synchronization, admits safe successor turns without waiting for remote delivery, adds explicit model-free recovery routes, rejects stale Pi completion evidence, prevents failed finalization from stranding the composer, makes Journey authority proportional to destination and mutation rather than source provenance, and restores readable Journey Conversation expansion and list controls in Daylight, Mist, and Parchment.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.9` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
623f4c7a354f4ffdf9cd136df8af9f364168d44f
```

Intended immutable tag:

```text
v0.2.0-alpha.9
```

Canonical release note:

```text
docs/releases/v0.2.0-alpha.9.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.9.md
```

Release-reading body SHA-256:

```text
b752e5734fce683d463c7de5c974b8002c7915034ae56c35794ad76f74558248
```

## Preparation Gates

- `npm ci`: passed; npm reported two moderate development-tool findings, no high or critical finding, and only a breaking automatic remediation path.
- Complete frontend suite: 800 tests passed across 144 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Rust suite: 137 tests passed; one explicitly generated real-Pi fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- `npm run roadmap:check`: passed with `Mirror Desktop roadmap: READY`.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on the `x86_64` build host.
- Alpha updater preflight and clean candidate inspection: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.9`, and both governed Darwin target families.
- `git diff --check`: passed.

## Updater-Signed Local Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.9
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.9_x64.dmg` | 7,021,779 | `1689ac8438de110c928adeba902c5d2621eda8a6390fac03c126be09b56288da` |
| `Mirror Desktop.app.tar.gz` | 6,999,816 | `64692b47840b72b464b76cfdba9d7e35bcc6f7c761eae039266f994c7809c0c3` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `a602a5a9fe5accc16a1c58eb9d4dd71f716f5a34cc9aad39c00572135fdb4db7` |

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization. Local inspection found zero valid code-signing identities. These are known distribution boundaries, not updater-signing failures.

## Publication Contract

The Navigator explicitly authorized push, immutable tag, alpha endpoint publication, GitHub prerelease, and bounded release evidence for `v0.2.0-alpha.9`. Publication must retain the canonical alpha host `https://updates.mirrormind.sh`, exact release-reading content, byte-for-byte artifact and signature identity, versioned DMG, stable latest-DMG alias, governed Darwin manifests, immutable candidate attribution, and GitHub prerelease status.

This authority does not include stable-channel promotion, local installation over the stable app, Apple signing, notarization, app-store distribution, or a separate public announcement beyond the governed release surfaces.

## Protected-State Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It must not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state.
