[< Refinement Workbench](../index.md)

# CR015 — Add artifact tree reload and investigate missing folders

## Problem

During Mirror Desktop alpha usage, the artifact tree needs an explicit reload button so the Navigator can refresh the visible workspace tree without relying on implicit updates or app restart. Also investigate why some folders do not appear in the artifact tree, for example 'mirror-mind-ai/mirror-desktop/src-tauri/target/'.

## Expected Behavior

The artifact tree should offer a clear manual refresh action and its folder visibility rules should be understandable and intentional. Generated release output is valid operational material: the Navigator must be able to reach `src-tauri/target/release/bundle/` and reveal a built app, DMG, or other bundle in the operating-system file manager without restarting Mirror Desktop.

## Impact

Captured as `manual` refinement work for `mirror-desktop`. Provenance:
not separately recorded.

## Assessment

The example `src-tauri/target/` is not missing because of stale frontend state. The native workspace walker intentionally omits every directory named `target`, at any depth. The same exact-name policy omits `node_modules`, `dist`, `build`, `venv`, `__pycache__`, and `coverage`; every dot-prefixed entry is also omitted.

The blanket `target` exclusion protects the current eager recursive walker from a very large Cargo tree, but it conflicts with a validated Navigator need: release bundles are operational artifacts that must be reachable from the Journey. Merely deleting `target` from the omission list is unsafe because the existing walker would recursively enumerate Cargo dependencies, incremental outputs, and build intermediates before returning anything, potentially exceeding the 10,000-entry bound and making the entire tree unavailable. The visibility model therefore needs controlled traversal rather than a binary choice between hiding all of `target` and scanning all of it.

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

The Navigator approved this plan and authorized implementation. Driver is `@alissonvale`; Delivery is `refinement/rs009-cr010-shift-enter-line-breaks`.

1. Replace eager whole-workspace recursion with bounded, Journey-scoped directory loading: load the root first and load a folder's direct children when the Navigator expands it. Each request must carry the exact `journeyId` and safe relative folder path, canonicalize beneath the registered workspace root, reject symlinks, and enforce a per-directory entry bound.
2. Remove `target` from the blanket omission policy while retaining private and high-volume generated exclusions such as dot-prefixed entries, `node_modules`, Cargo `deps`, `incremental`, `.fingerprint`, and build-intermediate directories. Lazy loading must make `src-tauri/target/release/bundle/` reachable without scanning unrelated Cargo output.
3. Preserve the existing folder context menu so `target/release/bundle`, `.app` directories, DMGs, and other generated artifacts can be revealed in Finder or the platform file manager. Do not launch applications, mount images, or execute generated output from Mirror Desktop in this CR.
4. Add a compact `Reload workspace` icon button beside the `Workspace structure` label, with an accessible name, tooltip, visible focus treatment, and a disabled/busy state while its request is active.
5. Reuse one request coordinator for initial root load, child expansion, and manual reload. Keep monotonically increasing request authority so stale responses cannot overwrite a newer Journey, folder request, or reload.
6. Keep the current tree visible while reloading to avoid layout flicker. Reload the root and every currently expanded path, preserving expansion and selection when those paths still exist. Refresh the selected file's preview; if it disappeared, clear the selection and explain why.
7. On reload or child-load failure, retain already loaded nodes and show a local actionable error at the affected tree scope. Initial root-load failure may continue using the full `Workspace unavailable` state.
8. Add concise UI help stating which private and high-volume generated directories remain hidden while release bundles are visible. Do not add polling, filesystem watchers, mutation, execution, or a broad `Show all generated files` toggle.
9. Add domain, storage, component, race, accessibility, and native tests for safe relative folder requests, lazy expansion, bundle reachability, reload busy semantics, stale-response protection, preserved expansion/selection, removed selection, partial failure, symlink rejection, and per-directory bounds.

## Proposed Acceptance

- The Artifacts workspace offers a keyboard-accessible manual reload action.
- Reload reads only the exact selected Journey workspace and cannot project another Journey's result.
- A successful reload shows newly created eligible files and folders without remounting the app.
- Expanded folders and a still-existing selection survive reload; a removed selection is cleared honestly.
- Reload failure preserves the last successful tree and exposes a retryable local error.
- Repeated reload clicks cannot let stale responses overwrite newer state.
- The UI makes intentional private/generated exclusions understandable.
- `src-tauri/target/` is visible when present, and `src-tauri/target/release/bundle/` can be reached without eagerly traversing unrelated Cargo output.
- A bundle folder or file can be revealed in the platform file manager through the existing safe artifact action; Mirror Desktop does not execute or mount it.
- Hidden private paths, canonical containment, symlink rejection, and bounded traversal remain enforced.

## Implementation

Implemented the approved lazy Artifacts workspace:

- the native boundary now lists one exact Journey directory per request instead of recursively materializing the whole workspace;
- folder requests accept only bounded relative paths, canonicalize beneath the registered Journey root, reject symlink components, and enforce the depth and per-directory entry limits;
- `target` is visible while dot-prefixed paths and high-volume generated internals such as `deps`, `incremental`, `build`, `node_modules`, and coverage/cache directories remain hidden;
- folders carry explicit child-load state and merge children into the existing tree without replacing sibling branches;
- expanding a folder loads its direct children, and linked Artifact navigation progressively materializes required ancestors;
- manual reload preserves the visible tree while loading, rebuilds expanded branches, refreshes a surviving selection, and reports a removed selection or reload failure locally;
- the tree toolbar exposes an accessible `Reload workspace` button, loading feedback, and concise visibility guidance;
- existing folder/file reveal actions remain the safe boundary for opening bundle locations in the platform file manager.

## Evidence

Assessment traced the workspace projection through:

- `src-tauri/src/main.rs`: registered Journey root resolution, `omitted_workspace_component`, recursive traversal, canonical containment, symlink handling, and depth/entry bounds;
- `src/app/journeyDocumentationStorage.ts`: the exact Journey-scoped native list command;
- `src/app/JourneyDocumentationBrowser.tsx`: mount-only tree loading and stale-request refs;
- `src/domain/journeyDocumentation.ts`: transport validation, sorting, lookup, and expansion state;
- `src/tests/journeyDocumentationBrowser.test.tsx` and native `main.rs` tests: current browser and bounded-workspace contracts.

Implementation checks:

- all 639 frontend tests passed across 115 files;
- all 109 Rust tests passed;
- focused domain, browser, linked-navigation, native lazy-directory, bundle-reachability, depth, and symlink tests passed;
- `npm run build` passed;
- `npm run tauri:build:dev` rebuilt the isolated Dev app and DMG;
- the restarted Dev process loaded the new executable (`pid=66047`, inode `161454024`);
- `git diff --check` passed.

## Navigator Validation

The Navigator validated the isolated Dev bundle with lazy folder expansion, access through `src-tauri/target/release/bundle/`, and manual workspace reload.

Proportionality review found the implementation appropriately bounded: it replaces unsafe eager traversal rather than special-casing one absolute machine path, retains exact Journey authority and canonical containment, and reuses the existing reveal boundary. Private paths, symlinks, high-volume Cargo intermediates, mutation, polling, and execution remain outside the tree contract. No follow-up technical debt was accepted.

Large generated folders are now bounded per expanded directory rather than by an eager whole-workspace scan. This is intentional and covered by native and frontend tests.

## Outcome

CR015 was closed as `done` by explicit Navigator decision after successful isolated Dev validation. No follow-up debt was accepted within this change request.

## Migration Provenance

- Legacy record: `25e5088f`.
- Created: `2026-09-09T13:54:13.777791Z`.
- Last updated: `2026-09-09T13:54:13.777791Z`.
- Canonical status, Driver, and Delivery are owned by the root Workbench index.
