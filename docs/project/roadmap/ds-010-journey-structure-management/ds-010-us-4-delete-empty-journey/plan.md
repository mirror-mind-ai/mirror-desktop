# Plan — DS-010.US-4

## Objective

Extend `mirror.journey-mutation@1.0` with an idempotent `delete_journey` operation that removes only an exact empty canonical leaf identity. Expose it through the Tree item context menu with a disabled parent state, explicit destructive confirmation and verified model-free registry replacement. No associated record, project file, repository, Pi/Mirror history or dedicated Journey lifecycle state may be deleted or rewritten.

## Implementation Sequence

### 1. Characterize protected deletion authority in Mirror

Add failing fixtures and service/storage tests before production changes. Build a complete protected-association inventory from the existing `count_journey_associations` boundary and extend it where dedicated/runtime ownership is not yet represented.

The deletion contract accepts only:

```text
schemaVersion
requestId
expectedSourceVersion
operation = delete_journey
payload.journeyId
```

Unknown fields fail closed. Names, slugs displayed by the UI, timestamps and tree position never establish deletion authority.

### 2. Extend the transactional mutation gateway

Inside `BEGIN IMMEDIATE`, Mirror must:

1. resolve the exact Journey identity;
2. compare the current canonical registry source version;
3. resolve or reject the idempotency receipt;
4. count child Journeys from canonical metadata;
5. count every protected association;
6. reject the non-empty/non-leaf target before deletion;
7. delete exactly one `identity(layer='journey')` row;
8. read back absence and the remaining registry authority;
9. write a sanitized durable receipt;
10. commit once.

The receipt may expose bounded association class/count diagnostics but no message content, memory content, private project path or filesystem details. Retry with the same request digest returns the same accepted result; conflicting reuse fails.

Do not call the legacy `remove_journey` path outside this transaction. Refactor shared association counting into the storage owner if necessary so validation and deletion cannot race.

### 3. Preserve desktop publication semantics

Add `delete_journey` to the Harness mutation type without creating a second native command. Tauri continues to invoke the Mirror-owned JSON CLI and publishes only a validated `0.2.0` replacement registry through atomic staging/rename.

If Mirror commits but export/publication fails, the old desktop projection remains intact and an exact idempotent retry recovers model-free. No compensating write may restore stale canonical state.

An empty active Journey may be deleted only when Harness supplies an explicit replacement Journey. The deterministic replacement is its canonical parent when present, otherwise the first remaining Journey in registry order. Tauri verifies that replacement in the returned registry before publication, and Harness changes selection only after verified success. The only remaining Journey cannot be deleted.

### 4. Add the Tree item action

In each Tree item context menu:

- render **Delete Journey…** after non-destructive actions;
- disable it whenever `children.length > 0`;
- retain right-click, `Shift+F10` and Context Menu key parity;
- expose an accessible reason through title/description when disabled.

For an eligible leaf, open an `alertdialog` that:

- names the exact Journey;
- states that deletion is permanent;
- states that project files and repositories are not deleted;
- offers Cancel and **Delete Journey** actions;
- performs no mutation before explicit confirmation;
- disables repeated submission while unsettled.

Retain the exact request/idempotency key across recoverable retry. On protected-association rejection, keep the verified tree unchanged and show an honest bounded reason. On success, reconcile pins, recents and collapsed IDs only after verified registry publication.

## Scope

- One new operation in the existing contract and gateway.
- Atomic empty-leaf and protected-association enforcement.
- Tree context action with disabled parent/active states.
- Accessible destructive confirmation and cancellation.
- Exact retry, stale/failure recovery and verified publication.
- Documentation and characterization of protected namespaces.

## Non-Goals

- Cascading, forced, recursive or bulk deletion.
- Archive, restore, merge or Journey renaming.
- Deleting a Journey with any protected association.
- Deleting project directories, repositories, identity files or projections outside the local registry replacement.
- Deleting Pi sessions, Mirror conversations, memories, tasks, attachments, runtime sessions, threads or generations.
- Provider calls or production-state dogfooding.
- Changes to sibling create, move or project-path behavior.

## Acceptance Behavior

```text
Given a Journey with children
When its Tree context menu opens
Then Delete Journey… is disabled
And no mutation request can be submitted.
```

```text
Given a leaf with no protected associations
When the Navigator confirms its exact destructive dialog
Then Mirror deletes exactly that Journey identity once
And Harness publishes only the verified replacement registry.
```

```text
Given a stale, populated, malformed or conflicting target
When deletion is attempted
Then Mirror rejects it before deletion
And Harness preserves the prior visible tree and every protected namespace.
```

## Validation Route

- Mirror contract/service/storage/CLI tests using temporary databases.
- Harness domain, source-guard and presentation tests.
- Rust validation/publication tests and `cargo check`.
- Provider sentinel and protected-namespace before/after snapshots.
- Full Harness Vitest and production build.
- Navigator desktop validation in an isolated disposable Mirror home.
- No production deletion during implementation or automated validation.

## Stop Conditions

- Any requirement to delete or cascade associated records.
- Incomplete protected-association inventory.
- Deletion eligibility derived only from the Harness projection.
- Inability to retain the idempotency request after post-commit publication failure.
- Any provider, repository or project-file mutation path.
- Required test failure without a clear story-scoped fix.

## Approval Gate

Implementation remains blocked until the Navigator explicitly approves this User Story Plan.
