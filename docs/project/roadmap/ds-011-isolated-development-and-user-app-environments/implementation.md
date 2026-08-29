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
  Mirror code  $HOME/.mirror-journeys/mirror-mind/mirror-dev
  Mirror home  $HOME/.mirror-minds/mirror-dev
  Mirror user  mirror-dev
```

## Native Channel Authority

`src-tauri/src/runtime_channel.rs` defines a closed build-time channel profile. The Cargo `development-channel` feature selects development; the stable default selects user. Tauri setup verifies bundle identifier, application-data identity, safe Mirror checkout/home/database and inherited allowlisted variables before commands or windows become usable.

Every Mirror-sensitive Pi, `uv` and Python subprocess now receives the validated channel cwd plus `MIRROR_HOME`, `MIRROR_USER`, `DB_PATH` and a bounded executable search path. The native profile resolves only `pi` and `uv` from trusted standard coordinates, so an installed app launched by Finder does not depend on Finder's minimal `/usr/bin:/bin:/usr/sbin:/sbin` environment. The prior hard-coded `/Users/alissonvale/mirror` and fallback to Harness root were removed. Missing or mixed coordinates fail before provider or mutation work.

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

Development has a committed violet Nautilus icon with a `DEV` badge, distinct system product/title, persistent sidebar `DEV` text and a violet shell palette. The native development runtime reapplies that committed image to `NSApplication` after Tauri reaches `Ready`, so direct `tauri:dev` execution is also distinct in the macOS Dock instead of relying on bundle metadata or Dock caching. Settings contains an allowlisted native Runtime Channel diagnostic with bundle, app-data and Mirror coordinates. The stable appearance remains unchanged.

## Python Boundaries

Conversation bridge scripts now require explicit Mirror root/home coordinates and never prepend `$HOME/mirror/src` silently. The registry bootstrap derives database and application-data output from the active channel environment and bundle identifier.

## Canonical Documentation

[Development Environment](../../../development/environment-setup.md) is the canonical human/agent setup guide. Root `README.md` and `AGENTS.md` link to it without duplicating procedures.

## Automated Evidence

```text
63 Vitest files / 328 tests passed
production TypeScript/Vite build passed
30 Rust tests passed in stable and development feature configurations
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
- development registry was written only below `com.nautilus.harness.dev` from the Mirror Dev database;
- Navigator confirmed the development palette, in-app icon and Mirror Dev diagnostic;
- the promoted stable 0.1.0 app was installed and launched from `/Applications/Nautilus Harness.app` after explicit authorization;
- development runtime was relaunched after the Dock-icon correction without startup failure;
- Finder-launched production exposed a missing-Pi defect because macOS supplied a minimal `PATH`;
- the corrected bounded GUI runtime path provisioned an offline native Pi session successfully without provider invocation.

## Validation Finding: Journey Administration Across Isolated Channels

The real desktop exercise exposed a chain of boundary defects that unit-level channel identity alone did not reveal:

- Mirror Dev initially lacked the canonical `journey export-registry` and `journey mutate` capabilities expected by the Harness. The required Mirror commits were integrated while preserving unrelated local Mirror Dev work.
- Administrative subprocesses inherited a Journey turn correlation when launched from an agent-mediated environment. Global tree administration now detaches only that turn correlation while retaining the validated runtime channel.
- Passing `--mirror-home` caused Mirror to combine the explicit home with `MEMORY_ENV=development` from the checkout `.env`, deriving `memory_dev.db` even though the closed Harness profile declared `DB_PATH=.../memory.db`. Administrative commands now rely on the complete native environment projection and do not recalculate the database path.
- A valid refreshed registry may no longer contain the previously selected Journey. Explicit reload now publishes canonical data, reconciles to an available Journey and removes stale preferences instead of blocking publication.
- Native Tauri errors were strings rather than JavaScript `Error` objects. Reload and mutation diagnostics now preserve bounded native detail, while successful reload feedback is concise and transient.
- Mirror projected Journeys whose recorded parent no longer existed as roots, but mutation ordering still grouped them under the missing parent. Root creation therefore submitted the visible append position while the service validated against a smaller hidden group. Mirror Dev now uses the same effective-parent rule for projection and mutation ordering.

The governing lesson is that an isolated channel is not merely a set of correct values. Every subprocess must consume the same complete coordinate contract without deriving a competing database from partial inputs. Bootstrap, refresh and mutation must also share one registry schema and authority path; that remaining consolidation is tracked as prospective Refinement Work rather than hidden inside the completed fixes.

## Production Checkout Incident

Real use later exposed an isolation gap outside app/runtime coordinates: Harness agents had edited and committed experimental Nautilus patches directly in the production Mirror checkout on local `stable`. The divergent line was preserved as incident evidence, production was restored to published Mirror `0.31.12`, and the complete finding is recorded in [Production Mirror Checkout Drift](incident-production-mirror-checkout-drift.md).

`RS013 / CR029` owns the durable guardrails. DS-011 validation now includes authorship and promotion isolation: Harness work must leave the production Mirror Git checkout unchanged, and every required Mirror source capability must travel through Mirror Dev, repository gates, release notes, official release and runtime update.

## Remaining Gate

Navigator must confirm that the currently running development app now shows the violet `DEV` icon in the macOS Dock, exercise a disposable Mirror Dev Journey while stable app/runtime state remains intact, and verify that `$HOME/mirror` remains clean and exactly aligned with its published stable ref throughout the exercise. No push, remote release publication or deployment is authorized.
