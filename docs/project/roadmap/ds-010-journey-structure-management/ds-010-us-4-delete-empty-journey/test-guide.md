[< Story](index.md)

# Test Guide — DS-010.US-4

## Mirror Contract and Transaction Tests

### Successful empty-leaf deletion

- Create an isolated root and an empty leaf.
- Submit exact schema, idempotency key, source version and leaf Journey ID.
- Assert one Journey identity row is deleted.
- Assert result source version changes and the leaf is absent from read-back.
- Retry the exact request and assert no second mutation.

### Eligibility rejection

Reject without source-version change:

- unknown Journey ID;
- malformed or stale source version;
- deletion of the only remaining Journey without a replacement;
- Journey with one or more children;
- request with unauthorized fields;
- conflicting payload under an existing idempotency key;
- malformed hierarchy or association state.

### Protected association matrix

Create one isolated leaf for each association and prove deletion is blocked without cascade:

- `journey_path` identity;
- conversation and messages;
- memory;
- task;
- attachment;
- runtime session;
- Explorer story;
- Refinement Story, Change Request and cursor state;
- dedicated Nautilus thread/generation evidence available to the Harness boundary.

Assert bounded error classes/counts contain no private content or path.

### Failure boundaries

- Inject failure before delete: no row or receipt changes.
- Inject failure after delete but before receipt/commit: transaction rolls back.
- Inject export contradiction: canonical result is recoverable by exact retry.
- Reuse request ID with another digest: fail closed.

## Harness and Native Tests

- `delete_journey` uses the existing `mutate_journey_registry` command.
- No provider command or conversation lifecycle appears in deletion source paths.
- Tauri validates the returned registry and either the retained active Journey or the explicit replacement before publication.
- Malformed output and unsafe staging/target paths preserve the previous registry.
- Exact request is retained after recoverable failure.

## Presentation Tests

- Parent item: **Delete Journey…** is present and disabled.
- Leaf item: action remains enabled when it is active and names the deterministic replacement in confirmation.
- Right-click, `Shift+F10` and Context Menu key expose the same action.
- Disabled action communicates why it cannot run.
- Eligible action opens an accessible `alertdialog` with exact Journey name.
- Dialog warns that deletion is permanent and does not delete project files.
- Cancel closes the dialog and submits no command.
- Confirm settles once and prevents duplicate clicks.
- Protected/stale failure keeps the item and displays a bounded reason.
- Success removes the item only after verified registry publication and reconciles local pins/recents/collapse state.

## Required Commands

```text
Harness:
  npm test -- --run
  npm run build
  cargo test --manifest-path src-tauri/Cargo.toml
  cargo check --manifest-path src-tauri/Cargo.toml
  uv run python -m unittest discover -s scripts/tests -p 'test_*.py'

Mirror:
  uv run pytest <Journey admin service/storage/CLI slices>
  uv run ruff check <changed Python files>
  uv run ruff format --check <changed Python files>
```

Record actual counts during Validation.

## Navigator Desktop Validation

Use a disposable isolated Mirror home containing:

- one parent with a child;
- one active empty leaf with a parent or another root;
- one populated inactive leaf;
- one empty inactive leaf.

Expected observations:

1. parent deletion is disabled;
2. active empty leaf deletion names and selects its deterministic replacement only after success;
3. populated leaf reaches confirmation but Mirror blocks it honestly;
4. Cancel changes nothing;
5. empty leaf deletes after explicit confirmation;
6. restart/reload preserves the canonical result and replacement selection;
7. project directories and all protected histories remain untouched;
8. no provider activity occurs.

**Pass:** only the confirmed empty leaf identity disappears after verified publication, with a valid replacement selected when it was active.
**Fail:** any cascade, optimistic disappearance, inferred selection, provider call, inaccessible action or protected-state change.

## Validation Evidence

Pending implementation and Navigator validation.
