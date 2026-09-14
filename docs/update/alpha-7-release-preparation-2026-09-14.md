# Alpha 7 Release Preparation — 2026-09-14

**Journey:** `mirror-desktop`
**Candidate:** `v0.2.0-alpha.7`
**Status:** prepared locally; not published

## Scope

This candidate delivers CV-008.DS-002 Expanded Concurrent Journey Turns. Mirror Desktop now admits exactly four independent Journey leases while preserving exact process and turn authority, one lease per Journey, finalizing occupancy, owner-specific Steering, targeted cancellation, independent settlement, and restart truth. Ordinary occupancy remains quiet: no global process or turn counter is shown. At known full capacity, the affected fifth Journey remains draft-editable while Send and Enter submission stay disabled until a slot is available.

## Authorization And Boundary

The Navigator authorized Delivery Story closure and preparation for release publication. Preparation includes local version materialization, release-note authorship, complete release gates, updater-signed local alpha artifacts, checksums, and this reviewable receipt. It does not authorize merge, push, Git tag creation, GitHub Release, updater endpoint mutation, installation, stable-channel promotion, Apple signing, notarization, or public announcement.

## Version And Source Authority

The following coordinates agree on `0.2.0-alpha.7`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Candidate source revision:

```text
1d442cb042f279cf3f5db302ae80ba2c03be3103
```

Intended immutable release tag, if separately authorized: `v0.2.0-alpha.7`.

Canonical release note:

```text
docs/releases/v0.2.0-alpha.7.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.7.md
```

Release-reading body SHA-256:

```text
eeeaaac4bfa9d7ab6ecee6a8d877b576076b4acfe8d03f9bbb07e793b79b3c83
```

## Preparation Gates

- `npm ci`: passed; npm reported two moderate development-tool findings and no high or critical finding. The available automatic remediation requires breaking dependency changes.
- Complete frontend suite: 717 tests passed across 131 files.
- Frontend production build: passed with the existing Vite chunk-size advisory.
- Rust suite: 117 tests passed.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Release-note, candidate, alpha-build, channel-governance, and publication tooling: 21 focused tests passed.
- `npm run roadmap:check`: passed with `Mirror Desktop roadmap: READY`.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.7`, and both Darwin manifest targets.
- Candidate inspection: passed from clean source revision `1d442cb042f279cf3f5db302ae80ba2c03be3103` with exact version, tag, artifact, architecture, release-note, and checksum agreement.
- `git diff --check`: passed.

## Updater-Signed Local Alpha Candidate

`npm run alpha:build` produced the updater-signed user-channel bundle with native identity:

```text
Product: Mirror Desktop
Bundle identifier: ai.mirrormind.desktop
Version: 0.2.0-alpha.7
Architecture: x86_64
```

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.7_x64.dmg` | 6,829,474 | `47f6139ac5bada76273dbf25a7b2090ee846bd1eafbe19cd642b41282ab52faf` |
| `Mirror Desktop.app.tar.gz` | 6,806,186 | `620bec7b70f84722673df26bc87b524ca1bb7f625b79853353beacce9a3a0c43` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `3b5891b965c26fe6942463bd60728888474633756c7d4308883a5314e9c159de` |

The updater signature is non-empty. `codesign --verify --deep --strict` reports that the app is not Apple-signed in architecture `x86_64`; `security find-identity -v -p codesigning` reports zero valid identities; and `xcrun notarytool history --keychain-profile MirrorDesktop` reports no stored profile. These are the known Developer ID and notarization boundaries, not updater-signing failures.

## Publication Readiness

The local candidate is ready for a separate publication decision. Publication must retain the canonical alpha host `https://updates.mirrormind.sh`, exact release-reading content, byte-for-byte artifact and signature identity, versioned DMG, stable latest-DMG alias, Darwin manifests, compatibility alias verification, immutable source attribution, and prerelease status.

No candidate bytes have been uploaded, no endpoint has been mutated, no Git tag has been created, no branch has been merged or pushed, and no GitHub Release has been created.

## Protected-State Boundary

Preparation did not mutate Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, attachments, unrelated application data, or the installed user-channel application. The local updater-signed candidate is not Apple Developer ID signed or notarized and must not be represented as such.
