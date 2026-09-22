# Alpha.15 Release Preparation — 2026-09-22

## Candidate

- Version: `0.2.0-alpha.15`
- Tag to create after publication authorization: `v0.2.0-alpha.15`
- Candidate source revision: `185d19cf1a634bd937ee75d96ef0bf9e6aaaf5b8`
- Release notes: [v0.2.0-alpha.15](../releases/v0.2.0-alpha.15.md)
- Promotion decision: pending
- Rollback target: `0.2.0-alpha.14`

## Runtime Preflight

Command:

```bash
npm run alpha:preflight -- \
  --mirror-root /Users/alissonvale/mirror \
  --mirror-home /Users/alissonvale/.mirror-minds/alisson-vale \
  --mirror-user alisson-vale \
  --json
```

Result: `ready`

- Worktree clean at preflight: `true`
- Repository: `mirror-mind-ai/mirror-desktop`
- Host architecture: `x86_64`
- macOS: `26.6.2`
- Node: `v24.6.0`
- npm: `11.5.1`
- Rust: `rustc 1.95.0`
- Cargo: `cargo 1.95.0`
- uv: `0.11.12`
- Pi: `0.87.0`
- Mirror Core: `0.31.14`, compatible with `>=0.31.14,<0.32.0`

## Gates

- `npm ci` — passed (npm reported 2 moderate audit findings; no dependency mutation performed)
- `npm test -- --run` — 163 files / 938 tests passed
- `npm run build` — passed
- `cd src-tauri && cargo test` — 172 passed / 1 ignored
- `cd src-tauri && cargo check --locked` — passed
- `uv run python -m unittest discover -s scripts/tests -p 'test_*.py'` — 5 passed
- `npm run alpha:preflight ...` — ready
- `npm run tauri:build:user -- -- --locked` — passed
- `npm run release:candidate` — READY

## Artifacts

- Bundle: `src-tauri/target/release/bundle/macos/Mirror Desktop.app`
  - `CFBundleName`: `Mirror Desktop`
  - `CFBundleIdentifier`: `ai.mirrormind.desktop`
  - `CFBundleShortVersionString`: `0.2.0-alpha.15`
  - Executable: Mach-O 64-bit x86_64
- DMG: `src-tauri/target/release/bundle/dmg/Mirror Desktop_0.2.0-alpha.15_x64.dmg`
  - SHA-256: `9bd9beb0c4e5c58c92a4a09dba2102c495185c3bea3387c56356aa014ecdc160`
- Updater tarball: `src-tauri/target/release/bundle/macos/Mirror Desktop.app.tar.gz`
  - SHA-256: `9b4cedb47f79120d965dcc8e304f658b3de162e0bde67655a4e3b8d4b161c1c0`
  - Signature file present: `Mirror Desktop.app.tar.gz.sig` (`416` bytes)

## Scope Summary

Alpha.15 closes the provider/model truth line after Alpha.14:

- CR070 pre-agent rejection visibility;
- CR072 explicit global Pi extension loading;
- CR071 unavailable-model prevention;
- CR054 durable provider terminal error surface;
- CR053 effective model Settings clarity;
- CR073 dismissed after retest as resilient waiting, not a hang.

## Publication Boundary

Prepared only. No push, tag, GitHub release, endpoint publication, installation or production mutation has been performed by this preparation record.
