[< Story](index.md)

# Test Guide - CV-005.DS-001

## Aggregate Validation

Validate that Mirror Desktop has a coherent external product identity, parallel native coordinates and explicit compatibility behavior while the installed Nautilus Harness application and its state remain untouched.

## Child Work Packages

- CV-005.DS-001.TS-1
- CV-005.DS-001.US-1
- CV-005.DS-001.TS-2
- CV-005.DS-001.TS-3

## Automated Checks

Run from the repository root:

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
```

Focused evidence must prove:

- the namespace inventory covers all case-insensitive Nautilus and Harness occurrences in production source, scripts, configuration and current-product documentation;
- Tauri, JavaScript and Rust package metadata use the approved Mirror Desktop identity;
- user and development builds resolve distinct Mirror Desktop product names, bundle identifiers and app-data roots;
- guarded promotion targets Mirror Desktop only and cannot overwrite Nautilus Harness;
- visible application and conversation copy no longer uses Nautilus as product identity;
- Nautilus method projections and synthesis intents retain their method-owned names;
- every changed persisted coordinate has explicit new-write and required legacy-read tests;
- environment and channel isolation tests continue to fail closed.

## Static Review

Review the final case-insensitive search against `namespace-and-durable-state-inventory.md`. Every remaining occurrence must point to a recorded method, historical or compatibility disposition. Unclassified production occurrences fail validation.

Inspect generated native bundle metadata and confirm the approved product name and bundle identifier. Inspect paths and bounded metadata only. Do not expose database contents, credentials or conversation text.

## Navigator Validation

Desktop E2E is required and should be batched into one macOS session after automated checks pass. Before beginning, report the expected duration and whether app launches or visual inspection will occupy the Navigator's machine.

The Navigator route is:

1. Keep the installed Nautilus Harness application closed but present as rollback evidence.
2. Launch Mirror Desktop and Mirror Desktop Dev from approved local builds.
3. Confirm Finder, Dock, application switcher, window title, sidebar, conversation state, Settings and runtime diagnostics use Mirror Desktop product identity.
4. Confirm the user and development applications have distinct approved bundle identifiers and app-data roots.
5. Confirm a Nautilus method reading, when intentionally opened, still names Nautilus correctly.
6. Exercise one disposable development Journey through launch, selection and one reversible local state change.
7. Close and reopen both Mirror Desktop channels and confirm their state remains isolated.
8. Confirm Nautilus Harness bundle metadata and bounded app-data metadata did not change.

## Expected Observation

Mirror Desktop appears as a new application rather than a renamed process using predecessor coordinates. Mirror Desktop Dev is unmistakably separate. No ordinary product surface calls the application or its conversation Nautilus. Method-specific Nautilus language remains available only where it carries method meaning. Existing Nautilus Harness installation and state remain untouched.

## Pass Condition

All automated checks pass, the inventory has no unclassified production occurrence, native bundle and app-data coordinates match the approved Plan, the complete Navigator route is accepted, required legacy fixtures remain readable and no predecessor state changes are observed.

## Fail Condition

Validation fails if any ordinary external surface still presents Nautilus as the product identity, a new build uses predecessor bundle or app-data coordinates, development and user channels collide, promotion can target Nautilus Harness, a method-owned name is erased, a required legacy record becomes unreadable, an unclassified occurrence remains, or predecessor state changes during the route.

## Implementation Evidence

Automated implementation checks completed on 2026-09-04:

- `npm test`: 100 files passed, 565 tests passed.
- `npm run build`: passed; Vite reported only the existing large-chunk advisory.
- `cd src-tauri && cargo test`: 92 tests passed.
- `cd src-tauri && cargo check`: passed.
- `python3 -m pytest scripts/tests`: 5 tests passed.
- `npm run tauri:build:dev`: passed and produced `Mirror Desktop Dev.app` plus a host-architecture DMG.
- `npm run tauri:build:user`: passed and produced `Mirror Desktop.app` plus a host-architecture DMG.
- Native metadata inspection: `Mirror Desktop` resolved to `ai.mirrormind.desktop`; `Mirror Desktop Dev` resolved to `ai.mirrormind.desktop.dev`.
- `npm run promote:production -- --plan`: resolved source `Mirror Desktop.app` and destination `/Applications/Mirror Desktop.app` without installation.

Validation-discovered debt is paid by the explicit `npm run import:mirror:dev` path, channel-correct empty-state guidance and `npm run validate:desktop:launch`. The validation launcher refreshes each registry through its own Mirror profile and removes inherited stable or development Mirror coordinates before opening both source-built bundles.

`cargo fmt -- --check` remains a pre-existing repository-wide formatting gap and proposes broad unrelated changes across legacy Rust code. It was not applied because this Delivery Story must not absorb unrelated formatting churn.

The inherited spiral icon was replaced by the Navigator-approved, source-controlled Mirror Desktop mirror artwork with stable and `DEV` variants. Both SVG sources render to distinct 512 by 512 PNG bundle assets with alpha. The artwork gate is resolved; aggregate desktop validation remains pending.

## Validation Evidence

After the artwork decision, record exact check commands and status, source revision, native bundle metadata, bounded app-data path metadata, the final inventory review result and the Navigator's accepted or rejected observation. Do not record credentials, database contents, private conversation text or user identity documents.
