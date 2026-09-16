# Alpha 8 Release Preparation, 2026-09-16

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.8`
**Status:** prepared locally; publication authorized by the Navigator request for a new release

## Scope

This candidate delivers CV-008.DS-004 Multiple Conversations per Journey. It preserves the Journey root workspace, adds bounded associated Desktop and Mirror Conversations, exact per-Conversation authority, model-free creation, rename and explicit title recommendations, actionable Mirror history, bounded handoffs, generation reset, safe deletion, Pi-owned Segment checkpoints, bounded history loading, unified detail surfaces, persistent active Conversation identity, and selected-Journey attachment behavior.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.8` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.

Candidate source revision:

```text
ab672354d96d61b851b91297184be62cdac3d514
```

Intended immutable tag:

```text
v0.2.0-alpha.8
```

Canonical release note:

```text
docs/releases/v0.2.0-alpha.8.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.8.md
```

Release-reading body SHA-256:

```text
f720144f330e484bf43d2b97cf81f8b0810fe9ff5b8abb63cbbb83116ecd6f91
```

## Preparation Gates

- `npm ci`: passed; npm reported two moderate development-tool findings, no high or critical finding, and only a breaking automatic remediation path.
- Complete frontend suite: 779 tests passed across 142 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Rust suite: 132 tests passed; the explicitly generated real-Pi fixture remains opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- `npm run roadmap:check`: passed with `Mirror Desktop roadmap: READY`.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on the `x86_64` build host.
- Alpha updater preflight and clean candidate inspection: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.8`, and both governed Darwin target families.
- `git diff --check`: passed.

## Updater-Signed Local Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.8
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.8_x64.dmg` | 7,018,699 | `d7bbcd643b822e658c2074bd1b44a7bf403a4fe99f7eeeb928f8d2568f744749` |
| `Mirror Desktop.app.tar.gz` | 7,000,622 | `9c2f306e013a63a41947f95b7c9a7a05f56ca1e5dfac962e2c11c88dd3b8409b` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `65825233f5f3a363cfd25e11ed87f5e722b4cd33f785c8a3394e61889b266ae4` |

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization. Local inspection found zero valid code-signing identities. These are known distribution boundaries, not updater-signing failures.

## Publication Contract

Publication must retain the canonical alpha host `https://updates.mirrormind.sh`, exact release-reading content, byte-for-byte artifact and signature identity, versioned DMG, stable latest-DMG alias, governed Darwin manifests, immutable candidate attribution, and GitHub prerelease status.

The Navigator's explicit request to generate a new release authorizes the governed alpha publication actions needed for this candidate. It does not authorize stable-channel promotion, installation, Apple signing, notarization, app-store distribution, or public announcement beyond the governed release surfaces.

## Protected-State Boundary

The release may replace application bytes and write only the bounded channel-local What's New recognition receipt. It must not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated app data, or Nautilus Harness state.
