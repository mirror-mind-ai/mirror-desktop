# Delivery Story Plan - CV-005.DS-002

**Journey:** mirror-desktop
**Method:** ariad
**Navigator Flow Unit:** delivery_story

## Delivery Story

Portable User Runtime Binding

## Objective

Replace compiled personal Mirror coordinates with an explicit, validated and channel-local user runtime binding so a private macOS collaborator can connect Mirror Desktop to their own installation without weakening stable and development isolation or touching Nautilus predecessor state.

## Child Work Packages

- CV-005.DS-002.TS-1
- CV-005.DS-002.US-1
- CV-005.DS-002.US-2
- CV-005.DS-002.TS-2
- CV-005.DS-002.TS-3

## Scope

This Delivery Story will:

- define a versioned, non-secret user runtime binding containing channel, canonical Mirror root, canonical Mirror home, explicit Mirror user and confined database path;
- remove `alisson-vale`, `$HOME/mirror` and other personal stable-runtime coordinates from compiled Rust and source launch scripts;
- preserve `ai.mirrormind.desktop` and `ai.mirrormind.desktop.dev` as the separate app-data authorities for stable and development bindings;
- let an unbound application open normally and present a bounded configuration surface instead of panicking during native setup;
- present a coherent environment candidate only when the complete `MIRROR_HOME`, `MIRROR_USER` and `DB_PATH` triplet is available and internally consistent;
- offer explicit native directory selection for Mirror root and Mirror home without scanning arbitrary user directories;
- derive the default database candidate as `<mirror-home>/memory.db`, require an explicit bounded Mirror user slug and show every resolved coordinate before save;
- canonicalize and validate the complete binding before persistence, rejecting symlinks, missing directories, missing or non-regular databases, database escape, invalid users and mixed channel state;
- require a recognizable source-built Mirror root with `pyproject.toml` and the `src/memory` package;
- read the Mirror Core version from the selected root and enforce a product-owned compatibility range, initially `>=0.31.14,<0.32.0` for this private alpha;
- resolve `pi` and `uv` from the existing closed executable search set on every validation and expose their bounded paths and readiness without persisting executable bytes or shell state;
- atomically persist one `runtime-binding.v1.json` beneath the active channel's app-data root with restrictive local permissions and no credentials, tokens, conversation text or identity documents;
- reload and revalidate the persisted binding on restart before enabling Journey imports, mutations, Pi invocation or Mirror append;
- project only the validated binding into Pi and Mirror subprocesses, including controlled current directory, `MIRROR_HOME`, `MIRROR_USER`, `DB_PATH` and trusted `PATH`;
- update registry import and desktop validation launchers to consume the channel-local binding instead of embedding a developer profile;
- show readiness by coordinate in Settings with actionable unbound, invalid, incompatible and ready states;
- retain Nautilus legacy event, session and schema compatibility established by CV-005.DS-001.

## Binding And Authority Decisions

### Persistent contract

The canonical file is channel-local app state:

```text
<app-data-root>/runtime-binding.v1.json
```

Its bounded shape is:

```json
{
  "schemaVersion": "1.0.0",
  "channel": "user | development",
  "mirrorRoot": "/canonical/absolute/path",
  "mirrorHome": "/canonical/absolute/path",
  "mirrorUser": "bounded-user-slug",
  "dbPath": "/canonical/absolute/path/memory.db"
}
```

`bundleIdentifier`, app-data root, compatibility range and executable search policy remain application-owned facts and are not writable binding fields. Unknown fields fail closed. The database must be the canonical `memory.db` file directly beneath the canonical Mirror home for this alpha. Existing state is never copied into another channel.

### Discovery boundary

Discovery proposes, but never authorizes. Mirror Desktop may offer `$HOME/mirror` as a root candidate when it validates and may offer the complete inherited Mirror environment as one candidate when all three variables agree. It must not enumerate `.mirror-minds`, infer a user from directory names, read shell profiles, search the filesystem or silently choose among multiple homes.

### Startup and readiness

Native setup validates only immutable application identity and initializes a binding service. Missing or invalid user binding is recoverable application state. Commands that require Mirror return a typed readiness failure until a valid binding exists. File selection, binding inspection and binding save remain available while unbound.

### Compatibility authority

Mirror Desktop owns the accepted Core range. The initial private-alpha range is `>=0.31.14,<0.32.0`, matching the released stable and development runtimes used to establish the contract. A future range change is an explicit product compatibility decision, not a side effect of whichever checkout happens to be present.

## Non-Goals

This Delivery Story will not:

- install, update, repair or clone Mirror Core;
- initialize or seed a Mirror home or create a Mirror identity;
- authenticate Pi providers or persist provider credentials;
- copy, migrate, merge or inspect database contents;
- discover users by scanning `$HOME/.mirror-minds` or other arbitrary roots;
- support remote Mirror runtimes, multiple active bindings per channel or automatic profile switching;
- migrate Nautilus Harness state into Mirror Desktop;
- remove legacy Nautilus event, thread, generation, source-interface or projection compatibility;
- produce the collaborator-facing clone, build and first-Journey guide assigned to CV-005.DS-003;
- sign, notarize, publish, push, release or distribute a bundle;
- edit Mirror Core or the production `/Users/alissonvale/mirror` checkout.

## Implementation Sequence

### CV-005.DS-002.TS-1 - User Runtime Binding Contract

Create native and frontend representations for candidate, persisted and validated binding state. Establish strict schema, canonical path confinement, Mirror root markers, version parsing, supported range, user slug validation, channel match, executable resolution and redacted diagnostics. Characterize valid stable and development fixtures plus every rejection before replacing the current profile.

### CV-005.DS-002.US-1 - Bind My Mirror Installation

Extend Settings Runtime with an unbound setup surface. Let the user accept one coherent environment or conventional candidate, choose Mirror root and home through native folder pickers, enter the Mirror user, inspect the derived database and validation result, then save explicitly. Never write a partial or invalid binding.

### CV-005.DS-002.US-2 - Understand Runtime Readiness

Replace setup-time failure with typed readiness. Show status for application identity, Mirror root, Mirror home, user, database, Core compatibility, `pi` and `uv`; provide corrective copy without revealing secrets. Keep Mirror-dependent controls disabled while local settings and binding repair remain usable.

### CV-005.DS-002.TS-2 - Trusted Runtime Process Environment

Route every Mirror and Pi process through the currently validated binding. Set the complete environment and controlled current directory from that binding, preserve the trusted executable allowlist, strip unrelated turn authority from administrative calls and reject invocation when persisted bytes change or validation expires.

### CV-005.DS-002.TS-3 - Channel-Local Binding Persistence

Persist atomically beneath the active bundle's app-data root, reload on restart and reject channel mismatch, symlinks, malformed JSON, unknown fields and unsafe permissions. Update import and validation launch scripts to read the selected channel binding. Prove that stable and development files cannot overwrite or fall back to one another.

## Likely Affected Areas

- `src-tauri/src/runtime_channel.rs` and focused native binding modules split from it when useful;
- `src-tauri/src/main.rs` setup, managed state, binding commands and Mirror-dependent command guards;
- `src/app/runtimeChannelStorage.ts`, `src/app/App.tsx` and Settings Runtime presentation;
- a focused TypeScript binding/readiness domain module rather than embedding validation policy in JSX;
- `scripts/mirror_desktop_channel.mjs` and `scripts/export_mirror_bootstrap.py`;
- native, TypeScript and script characterization tests;
- `docs/development/environment-setup.md` and current product architecture documentation.

The inventory created by CV-005.DS-001 remains the authority for legacy coordinates. Any required Mirror Core capability or scope outside local binding must stop for a separate Journey decision.

## Acceptance Behavior

```text
Given two macOS users have separately configured Mirror installations
And Mirror Desktop has no compiled personal runtime identity
When each user opens a fresh source-built stable application
Then the application opens in an unbound but usable state
And each user can select and validate only their own Mirror root and home
And the complete resolved binding is visible before explicit save
And restart restores and revalidates that channel-local binding
And Journey import, Pi and Mirror subprocesses receive only its validated coordinates
And missing tools, invalid paths, database escape, incompatible Core or mixed-channel state remain blocked with corrective diagnosis
And no credential, database content, Nautilus state or other channel binding is copied
```

## Validation Route

Automated validation requires:

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
uv run python -m pytest scripts/tests
```

Focused tests must cover schema strictness, atomic persistence, channel mismatch, symlink rejection, canonical confinement, invalid user, missing coordinates, incompatible Core, executable lookup, unbound startup, command gating, environment projection and stable/development isolation.

Desktop E2E is required because native folder selection, fresh unbound startup, restart persistence and channel-separated application data cannot be established fully through unit tests. Use temporary fixture Mirror roots and homes for negative paths; do not alter production Mirror or its database. Batch one stable and development macOS session after automated checks. State duration and machine interaction before launching.

## Implementation Contract

- Use TDD for every contract and behavior change.
- Treat the five child stories as traceable work packages within this aggregate Delivery Story.
- Keep the application usable for binding diagnosis when Mirror is unavailable; block only Mirror-dependent actions.
- Never accept a partial environment as authority and never infer a missing coordinate from another profile.
- Canonicalize before comparison and reject symbolic links at the persisted file, selected roots and database boundary.
- Persist only the approved schema beneath the active app-data root through staged write, sync and atomic rename.
- Revalidate before process creation; persisted configuration alone is not runtime trust.
- Keep compatibility range and executable search policy application-owned and test-visible.
- Do not read SQLite directly or copy database bytes during discovery, validation or E2E.
- Do not edit `/Users/alissonvale/mirror`; a missing Core capability stops this Delivery Story for a `mirror-dev` handoff.
- Do not absorb installer, provider authentication, broad onboarding or distribution work from CV-005.DS-003.
- Stop at Navigator Validation after local implementation. Approval does not authorize Done, push, promotion, release or external distribution.

## Approval Boundary

Approval authorizes local implementation of the five child work packages under this aggregate Plan. It approves `runtime-binding.v1.json`, the strict direct-child `memory.db` rule and the initial Core compatibility range `>=0.31.14,<0.32.0`. It does not authorize database migration, production Mirror modification, promotion, push, release or distribution.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
