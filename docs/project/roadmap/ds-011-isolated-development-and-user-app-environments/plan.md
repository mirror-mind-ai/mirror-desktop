# Delivery Story Plan — DS-011

**Journey:** nautilus-harness
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Isolated Development and User App Environments

## Objective

Deliver two fail-closed Nautilus desktop channels: a stable user app and an unmistakable development app whose Tauri identity, Harness data root, Pi sessions and every Mirror operation are bound to the isolated checkout associated with Journey `mirror-dev`, with reproducible commands, visible diagnostics and one canonical setup guide for humans and coding agents.

## Child Work Packages

- DS-011.TS-1 — Desktop Channel Identity Contract
- DS-011.TS-2 — Channel-Specific Harness and Mirror Runtime Roots
- DS-011.US-1 — Run Stable and Development Apps Side by Side
- DS-011.US-2 — Recognize Development Mode at a Glance
- DS-011.TS-3 — Reproducible Development Launch and Build
- DS-011.TS-4 — Channel Isolation Guardrails
- DS-011.US-3 — Inspect Active Runtime Channel
- DS-011.US-4 — Build a Development Environment from One Guide

## Current Terrain

The current app has one Tauri identity:

```text
productName  Nautilus Harness
identifier   com.nautilus.harness
window title Nautilus Harness
icon         src-tauri/icons/icon.png
```

Tauri derives most Harness persistence from `app.path().app_data_dir()`, so a distinct bundle identifier will naturally separate settings, registry, preferences, dedicated threads, generation projections and Harness-owned Pi session files. The remaining risk is the process boundary: `src-tauri/src/main.rs` currently hard-codes `/Users/alissonvale/mirror`, falls back to the Harness root when that path is missing and resolves Mirror home independently. Several `uv`, `pi` and Python bridge calls use those helpers, while `scripts/provision_mirror_conversation.py`, `scripts/log_mirror_conversation.py` and `scripts/export_mirror_bootstrap.py` still contain stable-user defaults. Visual identity is also static: React imports the stable SVG directly and the root shell has one palette.

Tauri 2 supports ordered configuration overlays through `tauri dev/build --config`, and Cargo features can give Rust a compile-time channel identity. These existing mechanisms should define the channels; ad hoc runtime heuristics should not.

## Channel Contract

### Stable user channel

```text
channel       user
product       Nautilus Harness
bundle id     com.nautilus.harness
Mirror code   $HOME/mirror
Mirror home   $HOME/.mirror-minds/alisson-vale
Mirror user   alisson-vale
Mirror DB     $HOME/.mirror-minds/alisson-vale/memory.db
```

### Development channel

```text
channel       development
product       Nautilus Harness Dev
bundle id     com.nautilus.harness.dev
Mirror code   $HOME/.mirror-journeys/mirror-mind/mirror-dev
Mirror home   $HOME/.mirror-minds/mirror-dev
Mirror user   mirror-dev
Mirror DB     $HOME/.mirror-minds/mirror-dev/memory.db
```

The development coordinates bind code to the checkout associated with Journey `mirror-dev` and runtime state to its isolated Mirror home. Harness materializes them through a versioned native profile and never delegates this authority to a machine-local launcher.

## Scope

### 1. Establish one native runtime-channel authority

Add a small Rust module, for example `src-tauri/src/runtime_channel.rs`, containing:

- a closed `user | development` channel enum;
- the expected product/bundle identity;
- `$HOME`-resolved Mirror root, home, user and database coordinates;
- the expected Tauri application-data identity;
- a sanitized diagnostic transport with no credentials;
- pure validation that canonicalizes existing roots and fails on missing, aliased or cross-channel coordinates.

Select `development` through an explicit Cargo feature such as `development-channel`; absence of that feature means `user`. Do not infer authority from debug mode, window color, process ancestry or the selected Journey. A debug launch that resolves to the stable channel through the normal development command must be rejected rather than silently touching user state.

During Tauri setup, compare the compiled channel with the merged Tauri identifier and resolved app-data directory before exposing the main window or any command. The native channel profile is authoritative; frontend channel data is presentation only.

### 2. Create deterministic Tauri channel configurations

Keep `src-tauri/tauri.conf.json` as the stable user baseline. Add a committed development overlay, for example `src-tauri/tauri.dev.conf.json`, overriding at least:

- `productName`;
- `identifier`;
- window title;
- bundle icon paths.

Add explicit package commands for the supported paths, such as:

```text
npm run tauri:dev
npm run tauri:build:dev
npm run tauri:build:user
```

The development commands must pass both the Tauri overlay and the Rust development feature. The ordinary repository development path must therefore create `com.nautilus.harness.dev`; it must not require temporary edits to the stable manifest or manual shell exports. Preserve the existing frontend build/test commands.

### 3. Route every Mirror/Pi boundary through the native profile

Replace `mirror_runtime_root()` and `production_mirror_home()` with a single validated runtime-channel profile. Remove the fallback from a missing stable Mirror checkout to the Harness root.

Create one bounded command-construction helper that applies the active profile consistently:

```text
current_dir  Mirror code root
MIRROR_HOME  channel Mirror home
MIRROR_USER  channel Mirror user
DB_PATH      channel Mirror database
```

Use it for every Mirror-sensitive `uv`, Python and `pi` process, including:

- Journey registry refresh and mutation;
- dedicated Mirror conversation provisioning;
- projection inspection;
- Mirror logger/reconciliation commands;
- Pi provisioning and live Mirror-mediated Pi turns;
- Pi-session/commit/context inspection whose directory depends on Mirror cwd.

Pi remains the executable selected by provider configuration, but its cwd and Mirror environment are channel-owned. Local model-catalog inspection remains model-free and must not weaken channel validation.

Update Python bridges so they do not prepend `$HOME/mirror/src` or default silently to the production database. They must receive or derive the validated Mirror root/home/database explicitly. `export_mirror_bootstrap.py` must accept channel-appropriate database/output coordinates instead of fixing `com.nautilus.harness` and the production DB.

### 4. Bind dedicated thread authority to the channel

New dedicated thread/generation receipts must record the runtime channel used for provisioning. Extend the TypeScript/Rust persistence contract deliberately rather than adding unchecked fields.

Preserve existing stable user history:

- existing stable records without a channel marker may be recognized only from the stable bundle/app-data root and upgraded model-free;
- a legacy unmarked record must never be adopted by the development channel;
- new records must match the active channel before `ready`, send, restart, recovery or commit;
- native Pi/Mirror IDs remain conversation authority; channel identity is an additional deployment boundary, not a replacement for those IDs.

Characterize the current `1.0.0` thread and activation-receipt schemas before changing them.

### 5. Give development an unmistakable system and in-app identity

Create a distinct development icon set derived as a separate committed asset, not a runtime color filter. It must remain recognizable as Nautilus while being clearly different in Finder, Dock, app switching and the window.

Expose a typed native `inspect_runtime_channel` command. Parse its strict allowlisted response in TypeScript and use it to:

- add a channel class/data attribute to the root shell;
- render a persistent `DEV` indicator near the Nautilus brand;
- select the development in-app icon;
- apply a coherent development accent palette across the shell;
- retain a textual distinction so recognition does not depend only on color.

The stable user appearance should remain unchanged except for any minimal structural seam needed to support channel rendering.

### 6. Add a discoverable runtime diagnostic

Make the active channel inspectable from the `DEV` indicator or Settings. Show only:

- channel;
- product/bundle identifier;
- app-data root;
- Mirror code root;
- Mirror home;
- Mirror user;
- Mirror database path;
- validation status.

Do not display environment dumps, provider secrets, tokens or arbitrary inherited variables. The diagnostic must come from the native validated profile, not from Vite values.

### 7. Write one canonical environment guide

Create one canonical guide, preferably `docs/development/environment-setup.md`, containing:

- supported platform and toolchain prerequisites;
- the repository/runtime directory layout;
- Mirror Dev checkout and home preparation;
- the Journey-associated Mirror Dev code and isolated-state contract;
- copy-pastable test, launch and build commands;
- first-run Journey initialization without production copying;
- a verification checklist for app and Mirror identities;
- safe troubleshooting and explicit destructive-reset warnings.

Create a small root `README.md` if needed and link to the guide from `README.md` and `AGENTS.md`. Keep those files as pointers; do not duplicate commands that can drift. The guide must be sufficient for both a human and a coding agent with no historical conversation context.

### 8. Preserve stable behavior and prove side-by-side operation

Do not migrate or copy user settings, Journeys, conversations, credentials, memories or dedicated generations into development. The development registry comes from Mirror Dev. Source Journey repositories and deliberately selected attachment files may remain shared because they are outside Harness/Mirror runtime state.

The stable installed app must continue using its current app-data directory and existing dedicated histories. A reset or failed experiment in development must not alter stable Harness files or production Mirror rows.

## Package Delivery Order

```text
TS-1  characterize and establish runtime-channel identity
  ↓
TS-2  route Harness, Mirror, Pi and persistence roots by channel
  ↓
TS-3  add reproducible Tauri overlays and commands
  ↓
US-1  prove simultaneous stable/development operation
  ↓
US-2  add distinct icon, palette and persistent DEV identity
  ↓
US-3  expose native runtime diagnostics
  ↓
US-4  publish and exercise the canonical setup guide
  ↓
TS-4  close cross-channel fallback paths and aggregate guardrails
```

TDD remains package-local, but Navigator validation is aggregate at the Delivery Story boundary.

## Non-Goals

- Implementing DS-009 concurrent Journey runs.
- Copying or synchronizing production Mirror data into Mirror Dev.
- Sharing dedicated generations between channels.
- Managing provider credentials or installing provider accounts.
- Building a universal multi-platform installer or release/update channel.
- Governing machine-local Pi launchers outside the Harness.
- Containerizing Mirror, Pi or Harness.
- Redesigning the stable Nautilus visual language.
- Treating color, file paths, names or hashes as Journey/conversation authority.

## Aggregate Acceptance Behavior

```text
Given the stable Nautilus app has existing settings and dedicated Journey history
And Mirror production contains existing conversations and memories
When Nautilus Dev is launched through the documented command
Then macOS treats it as a separate application with a distinct name, bundle identifier and icon
And its window shows an unmistakable DEV identity
And its Harness state resolves only below the development app-data root
And every Pi/Mirror operation uses ~/.mirror-journeys/mirror-mind/mirror-dev and ~/.mirror-minds/mirror-dev
And production Harness files and Mirror database rows remain unchanged
```

```text
Given a development launch has a stable bundle identifier, stable app-data root, production Mirror root/home/database or mismatched runtime variables
When native startup or command preflight validates the channel
Then the app fails closed before Journey mutation, conversation provisioning or provider invocation
And the diagnostic names the bounded identity mismatch without exposing secrets
```

```text
Given an existing stable dedicated thread predates channel metadata
When the stable user app loads it
Then compatibility preserves its exact native Pi/Mirror authority and upgrades it model-free when required
But the development app cannot adopt that record or its app-data root
```

```text
Given a human or coding agent has only the repository instructions
When it follows the canonical environment guide
Then it can construct and verify Mirror Dev plus Nautilus Dev without consulting prior chat history
And no documented setup step copies or mutates production state
```

## Validation Route

1. TDD for pure Rust channel profiles, path resolution, app identity matching, subprocess environment projection and legacy stable compatibility.
2. TDD for strict TypeScript runtime diagnostics, shell channel projection, DEV indicator and stable appearance.
3. Characterization tests over every existing Mirror/Pi command seam and Python bridge before replacing hard-coded roots.
4. Static/config tests for unique Tauri identifiers, names, windows, icon sets, Cargo features and package commands.
5. Python tests for explicit Mirror root/home/database and channel-specific bootstrap output.
6. Full `npm test`, `npm run build`, `cargo test` and `cargo check`.
7. Build/check both channel configurations; inspect resulting macOS bundle metadata and icon assets.
8. Real Tauri validation with stable and development apps open simultaneously.
9. Database/file evidence captured before and after a development Journey start and turn, proving only development roots changed.
10. Human and agent walkthroughs of the canonical setup guide.

Detailed cases are maintained in [test-guide.md](test-guide.md).

## Implementation Contract

- TDD for every behavior change; characterize thread schema, activation receipts and subprocess routing before edits.
- Use `uv run` for project Python commands and the Mirror checkout selected by the channel.
- Keep runtime-channel authority native and closed; frontend/Vite state is presentation only.
- Apply only allowlisted Mirror variables to child processes. Never persist credentials or arbitrary environment dumps.
- No fallback from missing Mirror Dev coordinates to stable Mirror or Harness roots.
- Preserve stable bundle identity, app-data location and existing dedicated conversation history.
- Keep the authored parent and package guidance more specific than generated scaffolds.
- Update architecture documentation when process and persistence boundaries change.
- Do not absorb DS-009 or unrelated UI redesign.
- No push, release, installation replacement or deployment without separate explicit Navigator authorization.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
