# Implementation — DS-011

## Status

implementation_complete_awaiting_navigator_validation

## Delivered Channels

```text
Nautilus Harness
  bundle       com.nautilus.harness
  Mirror code  $HOME/mirror
  Mirror home  $HOME/.mirror-minds/alisson-vale
  Mirror user  alisson-vale

Nautilus Harness Dev
  bundle       com.nautilus.harness.dev
  Mirror code  $HOME/Code/mirror-dev
  Mirror home  $HOME/.mirror-minds/mirror-dev
  Mirror user  mirror-dev
```

## Native Channel Authority

`src-tauri/src/runtime_channel.rs` defines a closed build-time channel profile. The Cargo `development-channel` feature selects development; the stable default selects user. Tauri setup verifies bundle identifier, application-data identity, safe Mirror checkout/home/database and inherited allowlisted variables before commands or windows become usable.

Every Mirror-sensitive Pi, `uv` and Python subprocess now receives the validated channel cwd plus `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH`. The prior hard-coded `/Users/alissonvale/mirror` and fallback to Harness root were removed. Missing or mixed coordinates fail before provider or mutation work.

Dedicated threads provisioned after DS-011 record `runtimeChannel` in the thread and activation receipt. Unmarked legacy records remain accepted only by the stable channel; development rejects them.

## Reproducible Builds and Promotion

- `src-tauri/tauri.conf.json` remains the stable baseline.
- `src-tauri/tauri.dev.conf.json` defines development product, bundle, window and icon.
- `scripts/nautilus_channel.mjs` pairs the correct Tauri config, Cargo feature and Mirror environment.
- `npm run tauri:dev` also materializes the development Journey registry from the Mirror Dev database before launching.
- `npm run tauri:build:dev` and `npm run tauri:build:user` produce explicit bundles without manual manifest edits.
- `npm run promote:production` is the explicit local promotion gate: it requires a clean worktree, reruns frontend and Rust validation, builds and verifies the stable native identity, refuses a running installed app and installs with rollback protection at `/Applications/Nautilus Harness.app`.
- Promotion never invokes `sudo`, migrates channel data, pushes Git, publishes a release or performs a remote deployment.

## Visible Development Identity

Development has a committed violet Nautilus icon with a `DEV` badge, distinct system product/title, persistent sidebar `DEV` text and a violet shell palette. Settings contains an allowlisted native Runtime Channel diagnostic with bundle, app-data and Mirror coordinates. The stable appearance remains unchanged.

## Python Boundaries

Conversation bridge scripts now require explicit Mirror root/home coordinates and never prepend `$HOME/mirror/src` silently. The registry bootstrap derives database and application-data output from the active channel environment and bundle identifier.

## Canonical Documentation

[Development Environment](../../../development/environment-setup.md) is the canonical human/agent setup guide. Root `README.md` and `AGENTS.md` link to it without duplicating procedures.

## Automated Evidence

```text
63 Vitest files / 328 tests passed
production TypeScript/Vite build passed
29 Rust tests passed in stable and development feature configurations
cargo check passed in stable and development feature configurations
2 Python script tests passed
stable and development Tauri debug no-bundle builds passed
stable and development macOS .app bundles passed
```

Bundle evidence:

```text
Nautilus Harness.app      com.nautilus.harness
Nautilus Harness Dev.app  com.nautilus.harness.dev
icons have distinct SHA-256 values
```

Desktop smoke evidence:

- both debug `.app` bundles remained running simultaneously;
- LaunchServices registered separate stable and development application identities;
- development binary remained running with Mirror Dev coordinates;
- the same binary exited before startup with a bounded error when given production Mirror coordinates;
- development registry was written only below `com.nautilus.harness.dev` from the Mirror Dev database.

## Remaining Gate

Navigator must inspect the real development window, icon, `DEV` presentation and Settings diagnostic, then exercise a disposable Mirror Dev Journey while the stable app remains intact. No push, release, production installation replacement or deployment is authorized.
