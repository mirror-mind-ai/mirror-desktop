# Alpha 13 Release Preparation, 2026-09-20

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.13`  
**Status:** prepared locally; publication pending explicit Navigator authorization

## Scope

Alpha.13 delivers RS019 Post-Terminal Continuity. Only genuinely active native Pi execution may occupy a Journey. Once Pi reaches an exact terminal outcome, projection, journal, Segment, outbox, Mirror, acknowledgement and presentation work remain bounded run-scoped evidence or debt and cannot block an immediate same-Journey successor.

The candidate includes CR057–CR060: terminal occupancy release, journal-independent admission, successor-safe run-scoped settlement and a complete private-data-free 4 × 7 outcome/frontier certification matrix. CR053 and CR054 remain captured follow-up work.

## Source Authority

Version coordinates agree on `0.2.0-alpha.13` in:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Updater-signed candidate source revision:

```text
8aed6a375ec7e528effa0dfe509c37f148a4286b
```

Intended tag:

```text
v0.2.0-alpha.13
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

## Local Gates

- Release-reading validation: passed for `v0.2.0-alpha.13` with five bounded highlights.
- Candidate inspection: passed for version `0.2.0-alpha.13`, intended tag `v0.2.0-alpha.13`, source revision `8aed6a375ec7e528effa0dfe509c37f148a4286b`, clean worktree, version-file agreement and artifact `Mirror Desktop_0.2.0-alpha.13_x64.dmg`.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- `git diff --check`: passed.
- Complete frontend suite: 899 tests passed across 158 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64` using explicit local development runtime-binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.13`, and governed Darwin target families.
- Complete Rust suite: 157 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Signed alpha build: passed using `npm run alpha:build`.

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

## Boundaries

This preparation did not publish the alpha endpoint, push Git commits, create a Git tag, create a GitHub Release, submit notarization, install over stable, mutate production Mirror data, repair production Conversations or alter application data.
