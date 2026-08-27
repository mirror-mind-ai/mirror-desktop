[< Story](index.md)

# Test Guide — DS-010

## Aggregate Validation Principle

Validate the Delivery Story as one Journey-administration capability across Mirror authority, native desktop confinement and Harness interaction. Success requires exact canonical read-back and a verified replacement registry; an optimistic UI update is not evidence.

All automated mutation tests use disposable Mirror homes and temporary databases. Production Mirror, native Pi sessions, dedicated Journey threads and repositories are protected fixtures, never test targets.

## DS-010.TS-1 — Contract Fixtures

Cover valid requests and receipts for:

- root Journey creation;
- nested creation with an exact parent ID and sibling position;
- optional project path during creation;
- assign, replace and clear project path;
- reparent before, after and inside another Journey;
- reorder within one parent and among roots;
- idempotent retry with the same request digest.

Reject:

- missing or stale source version;
- reused idempotency key with a different digest;
- duplicate or malformed slug;
- unknown parent/target ID;
- self-parent and descendant cycle;
- negative, non-integer, duplicate or out-of-range order;
- file, missing directory, malformed or escaping symlink path;
- unauthorized semantic, pin, conversation, thread or generation fields;
- malformed, oversized or unsupported contract versions.

Assert receipts contain no description, private path, conversation content or model material.

## DS-010.TS-2 — Mirror Gateway and Native Publication

Use isolated SQLite databases to prove:

1. exact expected source version commits once;
2. stale version fails before write;
3. transaction failure rolls back every Journey row and receipt;
4. read-back contradiction rolls back before commit;
5. retry after success returns the same canonical result without a second mutation;
6. retry with a conflicting payload fails closed;
7. exporter failure after commit leaves the prior Harness registry untouched and permits model-free retry;
8. malformed replacement registry never reaches the published path;
9. staging/target symlinks and unsafe file types fail closed;
10. atomic rename exposes either the prior complete registry or the new complete registry;
11. active Journey authority remains present after non-deletion mutations, and active-leaf deletion binds publication to an explicit verified replacement;
12. no provider, Pi, conversation logger or dedicated-thread command is invoked.

Characterize the existing `refresh_journey_registry` path before extracting shared export/validation/publication helpers.

## DS-010.US-1 — Create Journey

### Root creation

- Open the Tree control context menu with pointer and keyboard.
- Choose **Create Journey…**.
- Verify parent defaults to Root.
- Enter name and description; verify deterministic editable slug suggestion.
- Choose sibling position and optional path.
- Confirm the summary and create.
- Verify exact Mirror identity, requested root position and replacement registry.

### Item-scoped child creation

- Right-click a Journey item, including its label and row chrome.
- Repeat through `Shift+F10` and the Context Menu key.
- Choose **Create Journey…**.
- Verify the clicked Journey's exact native ID initializes the parent field.
- Verify the parent and sibling position remain editable.
- Cancel and prove no mutation occurred.
- Reopen, confirm and verify the child appears at the requested position.

### Creation failures and side effects

Exercise duplicate slug, invalid slug, stale parent placement, unknown parent, invalid optional path, gateway failure and registry-publication failure. In every case show an honest recoverable state and preserve the prior projection when verification is incomplete.

After successful creation prove that no repository, directory, files, Pi session, Mirror conversation, Nautilus thread or generation was created. Selecting the new Journey must show the existing unstarted Journey surface until **Start this Journey** is explicitly invoked.

## DS-010.US-3 — Project Path

Validate assign, replace, clear and picker cancellation. Exercise:

- existing accessible directory;
- missing path;
- regular file instead of directory;
- symlink resolution outside the permitted selection authority;
- stale source version;
- gateway and publication failures.

Compare protected fields before and after: only the intended Journey's canonical `project_path`, update evidence and registry source version may change. Project files and directories remain byte-for-byte untouched.

## DS-010.US-2 — Reorganize Tree

With pointer and keyboard, move:

- a root before and after another root;
- a nested Journey among siblings;
- a Journey into another valid parent;
- a nested Journey back to root;
- a subtree across representative depths.

Verify drop indicators, cancellation and bounded auto-scroll. Reload and restart the Harness to prove stable order is canonical rather than local presentation state.

Reject cycle, self-drop, descendant target, stale source, unknown target and interrupted publication. Verify native Journey ID, slug, semantic content, project path, pins, memories, attachments, threads, generations and conversations remain unchanged.

## DS-010.US-4 — Delete Empty Journey

- Verify **Delete Journey…** is disabled for every node with children using pointer and keyboard context menus.
- Verify a leaf opens a destructive confirmation with its exact display name and no mutation before confirmation.
- Cancel and prove source version and registry bytes remain unchanged.
- Delete one empty leaf and verify only its Journey identity disappears.
- Exercise each protected association class: conversations, memories, tasks, attachments, runtime sessions, Explorer/Builder state, dedicated thread and generation.
- Exercise stale source, idempotent retry, transaction failure and desktop publication failure.
- Snapshot project paths, repositories, Pi sessions, Mirror conversations, memories, threads and generation projections before/after to prove no cascade or filesystem deletion.
- Prove no provider invocation participates in eligibility, confirmation, deletion or recovery.

## Cross-Cutting Harness Regression

- Tree collapse remains local presentation state.
- Recent and Pinned views retain their existing behavior.
- Search composes with the verified replacement registry.
- Registry reload and Tree context menu retain native WebView suppression.
- Active Journey selection and conversation authority converge before commands are enabled.
- Existing dedicated-thread start/restart/send eligibility remains unchanged.
- Settings remains globally accessible.
- No administration action is available while a conflicting operation is unsettled.

## Required Automated Commands

Run the final commands appropriate to the changed repositories, including at minimum:

```text
Harness:
  npm test -- --run
  npm run build
  cargo test --manifest-path src-tauri/Cargo.toml
  cargo check --manifest-path src-tauri/Cargo.toml
  uv run python -m unittest discover -s scripts/tests -p 'test_*.py'

Mirror:
  uv run pytest <Journey contract/service/storage/CLI slices>
  uv run pytest <architecture/import-boundary slices>
```

Record exact test counts in Validation rather than predicting them here.

## Navigator Desktop Validation

Use a disposable isolated Mirror home and a desktop build. The Navigator must observe:

1. root creation from the Tree control menu;
2. child creation from an item menu with the parent already positioned;
3. editable parent/position before confirmation;
4. cancellation without mutation;
5. successful verified reload and unstarted Journey state;
6. assign/replace/clear project path;
7. pointer and keyboard tree moves;
8. stale/failure recovery preserving the prior visible tree;
9. no provider activity or conversation/thread side effect.

**Pass:** every accepted operation matches exact Mirror read-back and every rejected/interrupted operation remains recoverable without partial desktop publication.  
**Fail:** any inferred authority, partial tree, silent retry, provider call, unintended file/conversation/thread mutation, inaccessible context action or unstable order.

## Validation Evidence

Pending implementation and aggregate Validation.
