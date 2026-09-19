# Alpha 12 Release Preparation, 2026-09-19

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.12`  
**Status:** prepared locally; publication pending explicit Navigator authorization

## Scope

Alpha.12 is a narrow corrective candidate for CR055. It releases the Composer after a terminal provider failure has settled as an interrupted attempt, while preserving the interrupted native evidence and without adding retry, fallback-provider or provider-error rendering behavior.

CR053 and CR054 remain captured, unimplemented follow-up work.

## Source Authority

Version coordinates agree on `0.2.0-alpha.12` in:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Updater-signed candidate source revision:

```text
04e06c2f9022e74aa927dac5edbf069d425d52fd
```

Intended tag:

```text
v0.2.0-alpha.12
```

Release note:

```text
docs/releases/v0.2.0-alpha.12.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.12.md
```

Release-reading body SHA-256:

```text
e1eddfbc36ede34260d136d01bb1571c395ed3011188f4f7be2c4ff1bfa58312
```

## Local Gates

- Release-reading validation: passed for `v0.2.0-alpha.12`.
- Candidate inspection: passed for version `0.2.0-alpha.12`, intended tag `v0.2.0-alpha.12`, source revision `04e06c2f9022e74aa927dac5edbf069d425d52fd`, clean worktree, version-file agreement, and artifact `Mirror Desktop_0.2.0-alpha.12_x64.dmg`.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- `git diff --check`: passed.
- Complete frontend suite: 847 tests passed across 155 files.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Alpha maintainer preflight: passed against Mirror Core `0.31.14` on macOS `26.6.2` `x86_64` using explicit local runtime binding coordinates.
- Alpha updater preflight: passed for `ai.mirrormind.desktop`, version `0.2.0-alpha.12`, and governed Darwin target families.
- Complete Rust suite: 154 tests passed; one real-Pi compaction fixture remained opt-in and ignored by default.
- `cargo check --locked`: passed.
- Python release-script suite: 5 tests passed.
- Signed alpha build: passed using `npm run alpha:build`.

## Signed Alpha Candidate

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.12_x64.dmg` | 7,078,496 | `b97e689f7ad7e52322b70d82dd155f1e40178b33d444ed6aacc2b634f75b8f90` |
| `Mirror Desktop.app.tar.gz` | 7,053,350 | `c7e105adb2c7128c65985da727414007677b02425a645415c4d5810cfeb7463e` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `14b4965e9966065a59198e51f139c54ec6dcaf12fd142b13351be2102141fbaf` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.12
Executable: Mach-O 64-bit executable x86_64
```

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization.

## Boundaries

This preparation did not publish the alpha endpoint, push Git commits, create a Git tag, create a GitHub Release, submit notarization, install over stable, mutate production Mirror data, repair production Conversations or alter unrelated application data.
