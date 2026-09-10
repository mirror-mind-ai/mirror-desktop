# Alpha 3 Release Publication — 2026-09-10

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.3`  
**Status:** published alpha prerelease

## Scope

This preparation consolidates the completed RS009 alpha-usage refinements into the next `0.2.0` prerelease. It updates the package, Tauri, Cargo, and lockfile version authorities and adds the local narrative release note.

## Version Authority

The following files agree on `0.2.0-alpha.3`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Immutable release tag: `v0.2.0-alpha.3`.

## Prepared Release Note

- Local source: `docs/releases/v0.2.0-alpha.3.md`
- Expected alpha publication URL: `https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.3.md`
- Release index entry: `docs/releases/index.md`

The note passed the repository release-note structure validator.

## Preparation Gates

- 644 frontend tests passed across 117 files.
- 109 Rust tests passed.
- `cargo check --locked` passed.
- Frontend production build passed with only the pre-existing Vite chunk-size warning.
- Release-candidate inspection resolved version `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and host artifact name `Mirror Desktop_0.2.0-alpha.3_x64.dmg`; the pre-commit inspection correctly reported a dirty worktree.
- The isolated Dev bundle built as `Mirror Desktop Dev_0.2.0-alpha.3_x64.dmg`.
- Native metadata confirmed version `0.2.0-alpha.3` and identifier `ai.mirrormind.desktop.dev`.
- The restarted isolated Dev process loaded the rebuilt executable (`pid=86133`, inode `161469612`).

## Signed Alpha Artifacts

After separate Navigator authorization, `npm run alpha:build` passed its alpha-channel preflight and produced the local user-channel artifacts:

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.3_x64.dmg` | 6,781,868 | `1167311c664e3f148a75d195d24f62932ff2419ece084eacaac5baf8c9733945` |
| `Mirror Desktop.app.tar.gz` | 6,755,071 | `1914f10663e5a8bda333e926e4509f1fbdeabaac229918079aea21758465c28f` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `16a31190205d35ae0594dc11b3fea1fe2f66bf33d58f0c322dc6b5d4f9bf3df4` |

Native metadata confirms `Mirror Desktop`, `ai.mirrormind.desktop`, and `0.2.0-alpha.3`. Candidate provenance inspection resolved revision `c23fc8ce7b096f494a919986eb2b6160390861bf`, expected tag `v0.2.0-alpha.3`, the alpha release-note URL, and the DMG checksum from a clean worktree.

The updater archive has a non-empty Tauri updater signature. The application bundle has no Apple code signature, matching the known Developer ID/notarization blocker; updater signing does not claim Apple code signing or notarization.

## Alpha Endpoint Publication

The Navigator explicitly authorized release publication. The staged payload was checksum-matched before upload and published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated published paths:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.3.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin/0.2.0-alpha.2/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.2/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-aarch64/0.2.0-alpha.2/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.3.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.3_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
```

All three updater manifests report `0.2.0-alpha.3` with a non-empty signature. The release note and download manifest resolve, and downloaded updater bytes, versioned DMG bytes, and stable DMG alias match the local SHA-256 values above. The `updates.mirrormind.com.br` compatibility alias also reports `0.2.0-alpha.3`.

## Source and GitHub Publication

The linear release history was fast-forwarded to `origin/main`. Annotated tag `v0.2.0-alpha.3` points to publication-evidence revision:

```text
900b00c86fe673473cc06389dd27afd1ebc3868a
```

The signed binaries remain attributable to source revision `c23fc8ce7b096f494a919986eb2b6160390861bf`; intervening commits contain release evidence only.

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.3
```

Published assets and GitHub-reported digests matched the local bytes:

- `Mirror.Desktop_0.2.0-alpha.3_x64.dmg`
- `Mirror.Desktop.app.tar.gz`
- `Mirror.Desktop.app.tar.gz.sig`

GitHub Actions inspection after the push returned no workflow runs for `main`.

## Explicit Boundary

This preparation did not:

- mutate updater endpoint configuration outside the authorized alpha publication payload;
- install or promote the user-channel app;
- touch Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, app data, or Nautilus Harness state;
- claim Apple notarization.

Stable-channel promotion, Apple notarization, installation, and public announcement remain outside scope. Installed-app self-update from `0.2.0-alpha.2` remains a separate explicit rehearsal rather than an implicit publication side effect.
