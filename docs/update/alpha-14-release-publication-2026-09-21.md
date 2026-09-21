# Alpha 14 Release Publication, 2026-09-21

**Journey:** `mirror-desktop`  
**Release:** `v0.2.0-alpha.14`  
**Status:** published and available for user update

## Scope And Authorization

This release publishes RS020 Convergent Turn Synchronization and CR069 for Mirror Desktop. The essential product journey, a multi-turn conversation between Navigator and agent, is frictionless: synchronization is internal unless automatic repair genuinely fails.

The Navigator explicitly authorized every runbook gate, including the rebuild, Git merge, push, immutable tag, GitHub prerelease and endpoint publication for user update delivery.

### Channel Note

The Navigator requested delivery on the "stable production channel". Mirror Desktop has no separate stable updater channel: per `alpha-channel-governance.md`, a production/stable channel "must receive its own separate key-custody decision before it exists". The installed user application (`Mirror Desktop.app`, identifier `ai.mirrormind.desktop`) is built with `src-tauri/tauri.alpha-update.conf.json` and polls the `/mirror-desktop/alpha` prefix. Publishing to that prefix is therefore the production delivery path for installed users, and it is what this publication performed.

This authority did not include Apple Developer ID signing, notarization, app-store distribution, a new stable-channel key custody decision, production Mirror data mutation or local installation over the user's Stable application.

## Version And Source Authority

Release coordinates agree on `0.2.0-alpha.14` in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`.

Published Git tag:

```text
v0.2.0-alpha.14
```

Tag object:

```text
c93650c9f0de4290dea870b64e584b17b7913eb0
```

Tag target commit, also `origin/main` head:

```text
6b1c028c4d923c9d2d49b8b755095efa11604a56
```

Release note and release-reading body SHA-256:

```text
docs/releases/v0.2.0-alpha.14.md
b14eca6739a7b8ed947decd1635777f957e7797d83c0bc149d7afd5808d5a7ce
```

GitHub prerelease:

```text
https://github.com/mirror-mind-ai/mirror-desktop/releases/tag/v0.2.0-alpha.14
```

## Release Gates

All gates were re-run on the merged `main` before publication:

- Complete frontend suite: 920 tests across 162 files, including the twelve-scenario convergent turn contract.
- Complete Rust suite: 162 passed plus 1 ignored under the Stable feature set and under `evaluation-channel`.
- `cargo check --locked`: passed.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Candidate inspection: `READY` at revision `6b1c028c4d923c9d2d49b8b755095efa11604a56`, clean worktree, version-file agreement.
- Alpha updater preflight: `READY` for `ai.mirrormind.desktop`, version `0.2.0-alpha.14`, governed Darwin target families.
- Release-reading validation: `ready` with six bounded highlights.
- Roadmap consistency and whitespace validation: passed.
- `gh run list --branch main` returned no runs; this repository has no committed GitHub Actions workflow to await.

## Signed Candidate

Rebuilt from the merged `main` revision with `npm run alpha:build` using `src-tauri/tauri.alpha-update.conf.json` and the alpha key at `~/.mirror-desktop-updater/alpha/updater.key`. Host: macOS `26.6.2`, `x86_64`.

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| `Mirror Desktop_0.2.0-alpha.14_x64.dmg` | 7,110,292 | `b289b92bcbab3f68e420f3f3cab2d9429cf0787bd061db8453a9eed35c0a23b2` |
| `Mirror Desktop.app.tar.gz` | 7,089,474 | `390ad40cb865c5a59386090a631fd1f86c5dbfc0763666351345f34e42de6daa` |
| `Mirror Desktop.app.tar.gz.sig` | 416 | `620987e3f2bf6e2f33aab45e21a669288719d9eb2f1fc8c08a3e47d023eaab93` |

Bundle identity verification:

```text
CFBundleName: Mirror Desktop
CFBundleIdentifier: ai.mirrormind.desktop
CFBundleShortVersionString: 0.2.0-alpha.14
Executable: Mach-O 64-bit executable x86_64
```

The updater signature is non-empty. The application remains an `x86_64` Mach-O without Apple Developer ID signing or notarization.

## Endpoint Publication

The payload was published only under:

```text
https://updates.mirrormind.sh/mirror-desktop/alpha
```

Remote byte verification confirmed the published endpoint matches the local candidate exactly:

| Remote payload | Bytes | SHA-256 |
|----------------|------:|---------|
| updater artifact | 7,089,474 | `390ad40cb865c5a59386090a631fd1f86c5dbfc0763666351345f34e42de6daa` |
| updater signature | 416 | `620987e3f2bf6e2f33aab45e21a669288719d9eb2f1fc8c08a3e47d023eaab93` |
| versioned DMG | 7,110,292 | `b289b92bcbab3f68e420f3f3cab2d9429cf0787bd061db8453a9eed35c0a23b2` |
| latest DMG alias | 7,110,292 | `b289b92bcbab3f68e420f3f3cab2d9429cf0787bd061db8453a9eed35c0a23b2` |
| release note | 5,630 | `b14eca6739a7b8ed947decd1635777f957e7797d83c0bc149d7afd5808d5a7ce` |
| release index | 4,786 | `f3f892abb4f615cd5c075fb922c03b41cf317119efe951b61f23246232d5e934` |
| macOS download manifest | 357 | `fee2ed901a06bbbf87d8c2d997790123d8ab16727e8dbb7816aa2b4b12de079e` |

All six retained Darwin updater manifest paths for current versions Alpha.13 and Alpha.14 report version `0.2.0-alpha.14`, the exact Alpha.14 updater artifact URL and release-reading version `0.2.0-alpha.14`:

```text
darwin/0.2.0-alpha.13/latest.json          darwin/0.2.0-alpha.14/latest.json
darwin-x86_64/0.2.0-alpha.13/latest.json   darwin-x86_64/0.2.0-alpha.14/latest.json
darwin-aarch64/0.2.0-alpha.13/latest.json  darwin-aarch64/0.2.0-alpha.14/latest.json
```

## User Update Availability

The installed user application at `/Applications/Mirror Desktop.app` reports `0.2.0-alpha.13` and polls `darwin-x86_64/0.2.0-alpha.13/latest.json`, which now serves `0.2.0-alpha.14` with a valid signature and release reading. The update is therefore available to the user.

Installing it remains the Navigator's own in-application action. No local installation over the Stable application was performed by this publication, and the Stable application was not launched.

## Git Publication

`origin/main` was advanced to `6b1c028c4d923c9d2d49b8b755095efa11604a56`, a `--no-ff` merge integrating the complete RS020 line plus CR069 and the Alpha.14 preparation. Thirteen fully merged local refinement branches were deleted after verification; the superseded pre-amend commit `ad5ffc87cc01838dbbea917b235f026c2bd3d124` was recorded before its branch was removed and remains recoverable through the reflog.

The annotated tag `v0.2.0-alpha.14` was pushed and targets that same commit. The GitHub prerelease is published, non-draft, targets that commit and carries the macOS x64 DMG asset.

## Boundaries Preserved

No Apple Developer ID signing, notarization, app-store delivery, Windows/Linux packaging, new stable-channel key custody, production Mirror data mutation, production Conversation repair, local installation over the Stable application, implicit provider retry, fallback-provider selection or unrelated app-data mutation was performed.
