# Alpha 14 Release Preparation, 2026-09-21

**Journey:** `mirror-desktop`  
**Candidate:** `v0.2.0-alpha.14`  
**Status:** prepared locally; integration and publication pending explicit Navigator authorization

## Scope

Alpha.14 delivers RS020 Convergent Turn Synchronization and CR069. The essential product journey, a multi-turn conversation between Navigator and agent, is frictionless: turn finalization runs in a serialized renderer-independent coordinator, synchronization status derives only from durable evidence and stays internal unless automatic repair genuinely fails, and one idempotent convergence routine replaces five overlapping repair paths.

The candidate includes CR064–CR069. CR063 is promoted into RS020. CR053 and CR054 remain captured follow-up work.

## Source Authority

Version coordinates agree on `0.2.0-alpha.14` in:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`

Candidate source revision:

```text
5df11f20ae1857d4010fb351606b127b02492da5
```

Intended tag:

```text
v0.2.0-alpha.14
```

Release note:

```text
docs/releases/v0.2.0-alpha.14.md
https://updates.mirrormind.sh/mirror-desktop/alpha/releases/v0.2.0-alpha.14.md
```

Release-reading body SHA-256:

```text
b14eca6739a7b8ed947decd1635777f957e7797d83c0bc149d7afd5808d5a7ce
```

## Integration Boundary

The candidate was prepared on `refinement/rs016-cr069-non-fatal-provider-warnings`, which carries the complete RS020 line plus CR069. It is not yet merged into `main`, and `main` is not yet pushed. Merge, push and tag remain separate explicit Navigator decisions, as does every publication step.

## Local Gates

- Release-reading validation: `ready` for `v0.2.0-alpha.14` with six bounded highlights and a 5,630-byte body.
- Candidate inspection: `READY` for version `0.2.0-alpha.14`, intended tag `v0.2.0-alpha.14`, source revision `5df11f20ae1857d4010fb351606b127b02492da5`, clean worktree, version-file agreement and artifact `Mirror Desktop_0.2.0-alpha.14_x64.dmg`.
- Alpha updater preflight: `READY` for `ai.mirrormind.desktop`, version `0.2.0-alpha.14`, targets `darwin-x86_64` and `darwin-aarch64`.
- Complete frontend suite: 920 tests passed across 162 files, including the twelve-scenario convergent turn contract.
- Complete Rust suite: 162 passed plus 1 ignored under the Stable feature set and under `evaluation-channel`.
- `cargo check --locked`: passed after the version bump.
- Frontend production build and TypeScript: passed with the existing Vite chunk-size advisory.
- Roadmap consistency: `Mirror Desktop roadmap: READY`.
- `git diff --check`: passed.

## Signed Build

Built with the centralized signed alpha command `npm run alpha:build` using `src-tauri/tauri.alpha-update.conf.json` and the alpha key at `~/.mirror-desktop-updater/alpha/updater.key`.

Host: macOS `26.6.2`, `x86_64`.

| Artifact | SHA-256 |
| --- | --- |
| `Mirror Desktop_0.2.0-alpha.14_x64.dmg` (6.8 MB) | `fda9b0b83c43f2fdad9a08121ff5388d0d7f1fb41434c74c0397ef7cae64ecda` |
| `Mirror Desktop.app.tar.gz` (updater) | `5f5683594ec2328b2fe1cc839572ec5dff0de2501636bdbe8327f0b483c6f4b7` |
| `Mirror Desktop.app/Contents/MacOS/mirror-desktop` | `f01ce4baebe5dde395f0d5d72f4ba082de2f58d3cb24a2a2e53e6ef603996851` |

Updater signature present at `Mirror Desktop.app.tar.gz.sig` (416 bytes).

## Prior Product Validation

Alpha.14's behavior was homologated by the Navigator in the Eval channel on production data before this preparation, across five rounds. The accepted evaluation executable was `3315126c2280d179153ca3638888219c634c631b5c0888f7e488d94333e86e5f`, followed by CR069's `a33a0f112b13a41a747adbb17b1f35d29113b047e331ce38cb9586ffc1010027`. Durable evidence for every homologated run is recorded in the CR068 document.

## Explicit Non-Actions

No Git push, merge, tag, GitHub Release, endpoint upload, manifest staging, download-alias update, notarization submission, installation, stable promotion or public announcement was performed. No production Mirror data, app data or Journey content was mutated by this preparation.

## Suggested Next Steps

Each requires separate explicit authorization:

1. merge the RS020 + CR069 line into `main` and push;
2. create the `v0.2.0-alpha.14` tag;
3. stage manifests, release notes and download aliases;
4. publish to the alpha prefix;
5. validate endpoint reachability and an installed-app update from Alpha.13;
6. record publication evidence under `docs/update/`.
