# Alpha 13 Release Publication, 2026-09-20

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.13`  
**Status:** published alpha prerelease

## Scope And Authorization

This release publishes RS019 Post-Terminal Continuity for Mirror Desktop. Only exact active native Pi execution may occupy a Journey; every secondary failure after terminalization remains bounded run-scoped evidence or debt and cannot block an immediate successor.

The Navigator explicitly authorized the governed publication route, including Git push, immutable tag, GitHub prerelease, alpha endpoint publication and all required verification steps.

This authority did not include stable-channel promotion, Apple Developer ID signing, notarization, app-store distribution, production Mirror data mutation, production Conversation repair, installation over stable or unrelated app-data mutation.

## Version And Source Authority

The release coordinates agree on `0.2.0-alpha.13` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`.

Updater-signed candidate source revision:

```text
8aed6a375ec7e528effa0dfe509c37f148a4286b
```

Published Git tag:

```text
v0.2.0-alpha.13
```

Tag object:

```text
1063a5507f568de69695675f5ee4ed81c34f7ac0
```

Tag target commit:

```text
b0f7dba560716a5c380775a7906d4cd7f5c4a508
```

Release note:

```text
docs/releases/v0.2.0-alpha.13.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.13.md
```

Release-reading body SHA-256:

```text
0ace631b33888b7483244ada5bac5cd37ef4fd70fff20b907d016e9faf313796
```

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.13
```

## Release Gates

- Release-reading validation: passed for `v0.2.0-alpha.13`.
- Candidate inspection: passed for version `0.2.0-alpha.13`, tag `v0.2.0-alpha.13`, source revision `8aed6a375ec7e528effa0dfe509c37f148a4286b`, clean worktree, version-file agreement and artifact `Mirror Desktop_0.2.0-alpha.13_x64.dmg`.
- Roadmap consistency and whitespace validation: passed.
- Complete frontend suite: 899 tests passed across 158 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64`.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.13`, and governed Darwin target families.
- Complete Rust suite: 157 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Signed alpha build, staging, endpoint publication and remote byte verification: passed.
- `gh run list --branch main` returned no runs; this repository currently has no committed GitHub Actions workflow to await.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.13_x64.dmg` | 7,072,013 | `bec96feb8ee6aa3129b31f5950f3a15b487cca1ec662d2755847aea43a7da87f` |
| `Mirror Desktop.app.tar.gz` | 7,045,865 | `2aa07fd4590b4bb4d803ab2c2bcb9bcbe8aa0743f520fd78b7cd6cc0860d54f5` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `d95c22d496399f262e6d51387cc7157bb3fddeb89d2356388847db38d05e53ad` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.13
Executable: Mach-O 64-bit executable x86_64
```

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization.

## Alpha Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Validated paths include:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.13.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/index.md
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.13.app.tar.gz
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.13.app.tar.gz.sig
https://updates.mirrormind.sh/mirror-desktop/alpha/artifacts/Mirror%20Desktop_0.2.0-alpha.13_x64.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/mirror-desktop-latest.dmg
https://updates.mirrormind.sh/mirror-desktop/alpha/downloads/macos/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.12/latest.json
https://updates.mirrormind.sh/mirror-desktop/alpha/darwin-x86_64/0.2.0-alpha.13/latest.json
```

Remote byte verification confirmed the published endpoint matches local candidate bytes:

| Remote payload | Bytes | SHA-256 |
|----------------|------:|---------|
| updater artifact | 7,045,865 | `2aa07fd4590b4bb4d803ab2c2bcb9bcbe8aa0743f520fd78b7cd6cc0860d54f5` |
| updater signature | 416 | `d95c22d496399f262e6d51387cc7157bb3fddeb89d2356388847db38d05e53ad` |
| versioned DMG | 7,072,013 | `bec96feb8ee6aa3129b31f5950f3a15b487cca1ec662d2755847aea43a7da87f` |
| latest DMG alias | 7,072,013 | `bec96feb8ee6aa3129b31f5950f3a15b487cca1ec662d2755847aea43a7da87f` |
| release note | 5,022 | `0ace631b33888b7483244ada5bac5cd37ef4fd70fff20b907d016e9faf313796` |
| release index | 4,474 | `5a30e589da969076e2300dc33a30f8dccef727105a5bec9c1d0062e0013d1ab1` |
| macOS download manifest | 357 | `5df5d657cce1a1e8b3a0c0693f022db248f65c15eed13b4986fefa0a6f267c56` |
| updater manifest | 7,167 | `ffd82bdc6f1e1b0abb5473e110a1cdfb4517c1ad7801ad15d2a364eb1c020d13` |

All six retained Darwin updater paths for current versions Alpha.12 and Alpha.13 report version `0.2.0-alpha.13`, the exact updater artifact URL, the Alpha.13 release-note URL and release-reading body SHA `0ace631b33888b7483244ada5bac5cd37ef4fd70fff20b907d016e9faf313796`.

## Git Publication

`origin/main` and `origin/refinement/rs019-cr060-post-terminal-rehearsal` were advanced to the tagged release-preparation commit `b0f7dba560716a5c380775a7906d4cd7f5c4a508`. The annotated tag `v0.2.0-alpha.13` was pushed and targets that same commit.

The GitHub prerelease is published, non-draft and explicitly targets `b0f7dba560716a5c380775a7906d4cd7f5c4a508`.

## Boundaries Preserved

No stable-channel promotion, notarization, app-store delivery, Windows/Linux packaging, production Mirror data mutation, production Conversation repair, local stable installation, implicit provider retry, fallback-provider selection or unrelated app-data mutation was performed.
