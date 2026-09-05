[< Story](index.md)

# Test Guide - CV-005.DS-002

## Aggregate Validation

Validate that a fresh source-built Mirror Desktop opens without a compiled personal profile, lets the user establish one complete local Mirror binding, explains every readiness failure, restores the binding only within the owning channel and projects only revalidated coordinates into Mirror and Pi processes.

## Child Work Packages

- CV-005.DS-002.TS-1
- CV-005.DS-002.US-1
- CV-005.DS-002.US-2
- CV-005.DS-002.TS-2
- CV-005.DS-002.TS-3

## Automated Checks

Run from the repository root:

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
cd .. && uv run python -m pytest scripts/tests
```

Focused evidence must prove:

- compiled production code and source launchers contain no `alisson-vale` user, home or database coordinate;
- a missing binding is a recoverable `unbound` state and does not terminate the application;
- immutable bundle identity remains validated before channel-local binding access;
- `runtime-binding.v1.json` accepts only its exact versioned schema and owning channel;
- Mirror root and home are canonical existing directories and not symbolic links;
- the database is a canonical regular `memory.db` file directly beneath the selected Mirror home;
- Mirror user syntax is bounded and no user is inferred from a directory name;
- a complete coherent inherited environment may be proposed while partial or contradictory environments are rejected as candidates;
- conventional discovery never enumerates arbitrary Mirror homes;
- Core `0.31.14` and later `0.31.x` versions are accepted while versions below `0.31.14`, `0.32.0` and malformed versions are rejected;
- `pi` and `uv` resolve only from the closed executable search set;
- persistence stages, syncs and atomically renames a non-secret file with restrictive permissions;
- malformed, unknown-field, symlinked and cross-channel persisted bindings fail closed without deleting the previous valid file;
- every Mirror and Pi subprocess receives the validated current directory, `MIRROR_HOME`, `MIRROR_USER`, `DB_PATH` and trusted `PATH`;
- administrative commands remove unrelated turn correlation authority;
- stable and development app-data roots cannot read, overwrite or fall back to each other's binding;
- registry import and desktop validation launchers consume channel-local binding rather than developer constants;
- diagnostics expose bounded paths, versions and statuses but no credentials or database contents.

## Static Review

Search tracked production code, scripts and current setup documentation for:

```text
alisson-vale
/Users/
$HOME/mirror
.mirror-minds/alisson-vale
```

Every remaining occurrence must be historical evidence, a negative test fixture or an explicitly documented local example outside runtime authority. A personal production fallback or source launcher constant fails validation.

Inspect the persisted binding using paths and metadata only. Do not print the database, credentials, identity documents, conversation text or environment outside the three approved Mirror coordinate names.

## Desktop E2E

Desktop E2E is required and should take approximately 15 minutes. It opens stable and development applications, invokes native folder pickers and restarts both channels. Notify the Navigator before beginning because windows and keyboard focus will be used.

Use two temporary fixture profiles for negative and isolation checks. A fixture may contain only safe marker directories, a minimal version fixture and an empty regular `memory.db`; it must never substitute for a positive real-Mirror test and must be deleted only after its exact temporary path is verified. Production Mirror and its database remain read-only.

The Navigator route is:

1. Back up bounded metadata for existing stable and development binding files when present, then move them to a validation staging location within their own app-data roots. Do not delete them.
2. Launch the stable source-built application with no binding and confirm the window remains open with an `Unbound` Runtime surface.
3. Confirm Journey import and agent actions are unavailable while folder selection and binding diagnosis remain available.
4. Present a coherent candidate or select the real stable Mirror root and home explicitly. Enter the Mirror user and inspect all derived coordinates before saving.
5. Confirm the current released Core version is accepted, `pi` and `uv` are ready and the binding becomes `Validated` only after explicit save.
6. Restart stable Mirror Desktop and confirm the same binding is restored and revalidated from `ai.mirrormind.desktop/runtime-binding.v1.json`.
7. Launch Mirror Desktop Dev without a binding and confirm it remains unbound even though stable is configured.
8. Bind Dev to Mirror Dev and confirm the `DEV` channel retains `ai.mirrormind.desktop.dev`, the development Mirror root, development home and its own database.
9. Exercise one registry refresh in each channel and inspect bounded diagnostics to confirm subprocess coordinates match only the active binding.
10. Use fixture candidates to demonstrate missing database, database escape, symlink, invalid user, incompatible Core and partial environment failures. Confirm each offers a corrective route without application termination.
11. Restart both channels together and confirm each restores only its own binding.
12. Restore any staged pre-validation bindings through the same atomic persistence boundary and verify predecessor Nautilus Harness metadata remains untouched.

## Expected Observation

Mirror Desktop behaves like an installable application that can meet an already configured Mirror installation rather than a bundle compiled for one developer. An unbound app remains usable for repair. A validated app clearly names its root, home, user, database, Core version and tool readiness. Stable and development channels can bind independently, and neither silently discovers, copies or falls back to another profile.

## Pass Condition

All automated checks pass; no personal runtime coordinate remains in production authority; fresh unbound startup succeeds; explicit binding, validation, persistence and restart succeed in both channels; negative fixtures fail visibly; subprocess diagnostics match only the current validated binding; the complete Navigator route is accepted; and production Mirror, its database and Nautilus predecessor state remain unchanged.

## Fail Condition

Validation fails if the application terminates because no binding exists, silently selects a profile, scans arbitrary homes, accepts a partial or mixed environment, permits database escape or symlinks, accepts an incompatible Core, persists unknown or secret fields, enables Mirror-dependent actions while invalid, launches a process from stale coordinates, allows channel fallback, retains a compiled personal runtime path or modifies production Mirror or predecessor state.

## Validation Evidence

Record source revision, exact automated commands, accepted compatibility range, bounded fixture descriptions, binding file metadata, channel diagnostics and the Navigator's accepted or rejected observations. Do not record credentials, database contents, private conversation text or identity documents.
