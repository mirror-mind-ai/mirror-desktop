[< Refinement Workbench](../index.md)

# CR015 — Add artifact tree reload and investigate missing folders

## Problem

During Mirror Desktop alpha usage, the artifact tree needs an explicit reload button so the Navigator can refresh the visible workspace tree without relying on implicit updates or app restart. Also investigate why some folders do not appear in the artifact tree, for example 'mirror-mind-ai/mirror-desktop/src-tauri/target/'.

## Expected Behavior

the artifact tree should offer a clear manual refresh action and its folder visibility rules should be understandable, intentional and documented or corrected when valid workspace folders are omitted.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Assessment

The example `src-tauri/target/` is not missing because of stale frontend state. The native workspace walker intentionally omits every directory named `target`, at any depth. The same exact-name policy omits `node_modules`, `dist`, `build`, `venv`, `__pycache__`, and `coverage`; every dot-prefixed entry is also omitted. This is appropriate for `target`: generated Rust build output can be very large, is not an authored Journey artifact, and could exhaust the bounded traversal before useful files are returned.

Other restrictions that can prevent a folder or file from appearing are:

- the selected Journey must resolve, by exact ID, to a non-empty `projectPath` in the channel-local Journey registry;
- the configured root must exist, canonicalize successfully, and be a directory;
- symbolic links are skipped, including links that point back inside the workspace;
- only regular files and directories are projected;
- every projected path must canonicalize beneath the registered workspace root;
- unreadable directories, entries, or metadata currently fail the whole tree rather than returning a partial tree;
- traversal is bounded to 16 levels and 10,000 encountered entries; exceeding either bound fails the whole tree;
- all regular files can appear, but only Markdown and UTF-8 text receive inline previews; unsupported, oversized, or invalid UTF-8 files remain visible with preview unavailable.

The frontend loads the tree only when `journeyId` or `journeyName` changes. It has stale-request protection but no manual refresh, watcher, polling, or reload event, so valid files created after the initial load remain absent until the component remounts or the app restarts.

## Proposed Plan

This plan is proposed for Navigator approval; CR015 remains `captured` and unassigned until an explicit execution decision.

1. Add a compact `Reload workspace` icon button beside the `Workspace structure` label, with an accessible name, tooltip, visible focus treatment, and a disabled/busy state while its request is active.
2. Extract the existing tree request into one reusable loader for initial load and manual reload. Continue passing the exact selected `journeyId` to the existing bounded native command; do not add filesystem mutation, polling, or watchers.
3. Keep the current tree visible while reloading to avoid layout flicker. Use the existing monotonically increasing request authority so an older response cannot overwrite a newer Journey or reload.
4. On success, preserve expanded folders that still exist. Re-resolve the selected item by relative path; refresh its preview if it still exists, otherwise clear the selection and explain that the item is no longer present.
5. On reload failure, retain the last successful tree and show a local actionable error beside the reload control. Initial-load failure may continue using the full `Workspace unavailable` state.
6. Add concise UI help stating that private and generated directories are intentionally hidden. Keep `target` and the existing generated-directory exclusions; do not offer a `Show generated files` toggle in this CR.
7. Add component tests for reload invocation, busy semantics, stale-response protection, preserved expansion/selection, removed selection, and non-destructive failure. Extend native tests to document every omission and traversal bound explicitly.

## Proposed Acceptance

- The Artifacts workspace offers a keyboard-accessible manual reload action.
- Reload reads only the exact selected Journey workspace and cannot project another Journey's result.
- A successful reload shows newly created eligible files and folders without remounting the app.
- Expanded folders and a still-existing selection survive reload; a removed selection is cleared honestly.
- Reload failure preserves the last successful tree and exposes a retryable local error.
- Repeated reload clicks cannot let stale responses overwrite newer state.
- The UI makes intentional private/generated exclusions understandable.
- `src-tauri/target/` remains hidden by documented policy, and actionable authored content remains unaffected.

## Evidence

Assessment traced the workspace projection through:

- `src-tauri/src/main.rs`: registered Journey root resolution, `omitted_workspace_component`, recursive traversal, canonical containment, symlink handling, and depth/entry bounds;
- `src/app/journeyDocumentationStorage.ts`: the exact Journey-scoped native list command;
- `src/app/JourneyDocumentationBrowser.tsx`: mount-only tree loading and stale-request refs;
- `src/domain/journeyDocumentation.ts`: transport validation, sorting, lookup, and expansion state;
- `src/tests/journeyDocumentationBrowser.test.tsx` and native `main.rs` tests: current browser and bounded-workspace contracts.

## Outcome

No terminal outcome has been recorded.

## Migration Provenance

- Legacy record: `25e5088f`.
- Created: `2026-09-09T13:54:13.777791Z`.
- Last updated: `2026-09-09T13:54:13.777791Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
