# Alpha 3 Release Preparation — 2026-09-10

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.3`  
**Status:** locally prepared; unsigned and unpublished

## Scope

This preparation consolidates the completed RS009 alpha-usage refinements into the next `0.2.0` prerelease. It updates the package, Tauri, Cargo, and lockfile version authorities and adds the local narrative release note.

## Version Authority

The following files agree on `0.2.0-alpha.3`:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Expected immutable tag, if separately authorized later: `v0.2.0-alpha.3`.

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

## Explicit Boundary

This preparation did not:

- run the signed `alpha:build` command;
- create a Git tag or GitHub Release;
- push commits;
- publish release notes, updater artifacts, DMG files, manifests, or download aliases;
- mutate updater endpoints;
- install or promote the user-channel app;
- touch Mirror homes, `memory.db`, identity, credentials, Journey content, conversations, app data, or Nautilus Harness state;
- claim Apple notarization.

The next phase requires a clean candidate inspection followed by separate authorization before signing or publication.
