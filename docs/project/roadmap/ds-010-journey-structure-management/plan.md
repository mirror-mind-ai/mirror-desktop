# Delivery Story Plan — DS-010

**Journey:** nautilus-harness  
**Method:** ariad  
**Navigator Flow Unit:** delivery_story

## Delivery Story

Journey Structure Management

## Objective

Deliver one model-free, transactionally safe Journey administration capability across Mirror and the Nautilus Harness. Establish a versioned mutation contract and stable sibling-order grammar, add one confined Mirror-owned mutation gateway with optimistic concurrency, atomic write/read-back/export/publication and sanitized idempotent receipts, then expose creation, project-path assignment and hierarchy reorganization through accessible desktop interactions.

Creation must be available both from the Tree control context menu for root placement and from a right-click or keyboard context menu on an individual Journey item. Item-scoped creation opens the form with that exact Journey already selected as the parent; the Navigator may still edit the parent and sibling position before confirmation.

## Child Work Packages and Sequence

1. **DS-010.TS-1 — Canonical Journey Mutation Contract**
2. **DS-010.TS-2 — Atomic Mirror Mutation Gateway**
3. **DS-010.US-1 — Create Journey**
4. **DS-010.US-3 — Assign Journey Project Path**
5. **DS-010.US-2 — Reorganize Journey Tree**
6. **DS-010.US-4 — Delete Empty Journey**

> **Navigator-approved scope addendum:** US-4 was added after the original aggregate implementation and before aggregate validation acceptance. Because deletion was an original non-goal and is destructive, US-4 receives its own User Story Plan and Navigator validation before DS-010 can resume aggregate closure.

The technical stories precede every interface mutation. Creation is the first vertical user slice. Project-path assignment follows because it reuses the form, picker and gateway without introducing structural gestures. Reorganization is last because it adds the broadest pointer, keyboard and hierarchy interaction surface.

## Scope

### Canonical mutation contract

Define a versioned, bounded request/receipt contract for:

- `create_journey`;
- `set_project_path` and `clear_project_path`;
- `move_journey`, including reparenting and sibling reordering;
- `delete_journey`, limited to empty canonical leaf identities.

Every request carries:

- a unique idempotency key;
- the exact expected registry source version;
- one operation discriminant;
- native Journey IDs for every existing Journey reference;
- only operation-specific editable fields.

The contract defines:

- canonical Journey ID and slug authority;
- deterministic slug validation and uniqueness;
- parent existence and cycle prevention;
- explicit stable sibling position;
- bounded hierarchy depth and registry size;
- canonical absolute directory representation for `project_path`;
- stale-source rejection before mutation;
- unauthorized-field rejection;
- sanitized receipts containing IDs, versions, operation status and failure class, but no semantic content or private path value.

The registry contract advances from the read-only `0.1.0` shape to a version that carries an exact `sourceVersion` and stable sibling-order evidence. Legacy Journeys without explicit order receive a deterministic key-based fallback; affected sibling sets are normalized transactionally when structure is changed. Ordering metadata must never become Journey identity.

### Mirror-owned mutation gateway

Implement Journey administration in Mirror Core, following the existing import direction:

```text
CLI transport
  → Journey service
    → identity storage / transaction owner
      → SQLite
```

The Harness and its helper scripts must not execute mutation SQL. The Tauri command invokes one bounded Mirror-owned CLI transport against the configured production Mirror home.

For each request the gateway:

1. validates schema, operation and bounds;
2. begins an immediate transaction;
3. derives the current canonical registry source version from Journey identity rows;
4. rejects a stale expected version;
5. checks idempotency key and request digest;
6. validates the complete proposed hierarchy/path result;
7. applies exactly one logical mutation;
8. reads the affected native rows back inside the transaction;
9. records a durable sanitized receipt;
10. commits once;
11. exports and validates the replacement registry;
12. returns the registry and receipt to the native desktop boundary.

Database mutation and native read-back are one transaction. Desktop registry publication occurs only after the committed canonical result has been exported and validated. If export or desktop publication fails after the Mirror commit, the prior Harness projection remains intact and the same idempotency key provides model-free retry/recovery; the Harness must not attempt a compensating overwrite of newer canonical state.

The Tauri boundary stages, validates and atomically renames the replacement registry using the confinement already established by `refresh_journey_registry`. Unknown, malformed, symlinked, stale or out-of-root paths fail closed.

### Create Journey

Add **Create Journey…** to:

- the Tree control context menu, defaulting to root placement;
- every Journey tree item's context menu, defaulting to that exact Journey as parent;
- keyboard context-menu invocation through `Shift+F10` and the Context Menu key.

The form includes:

- display name;
- deterministic local slug suggestion, explicitly editable;
- description;
- parent selector;
- sibling position selector;
- optional project path;
- a confirmation summary naming the intended placement.

Right-clicking an item passes only its canonical Journey ID into the form initializer. The form resolves the display label from the current validated registry and keeps parent/position editable. Context-menu opening never mutates Mirror.

On confirmation the Harness submits one mutation, shows bounded progress, accepts only the verified replacement registry and may select the new Journey. Selection must leave it in the existing unstarted state: no repository, directory, identity file, Pi session, Mirror conversation, Nautilus thread or provider turn is created.

### Assign Journey project path

Add a Journey-scoped management action with keyboard access and a native directory picker. The Navigator can assign, replace or clear the path after an explicit summary.

Validation requires an existing accessible directory and rejects files, malformed values and unsafe symlink resolution. The canonical path is stored only by Mirror. The receipt and generic UI status do not disclose private path content beyond the deliberate form surface. Assigning a path grants no file-creation or file-mutation authority.

### Reorganize Journey tree

Add drag handles and keyboard parity for moving a Journey:

- before a sibling;
- after a sibling;
- inside another Journey;
- to a root position.

Render explicit drop intent, bounded auto-scroll and cancellation. Submit native IDs plus the expected source version, never names or visual coordinates as authority. Mirror validates cycles, parent existence and the resulting stable sibling order before commit. A verified reload confirms success; stale, invalid or interrupted operations preserve the prior visible projection.

### Delete empty Journey

Add **Delete Journey…** to the Tree item context menu with keyboard parity. The action is disabled when the current verified registry shows children. A leaf action opens an explicit destructive confirmation naming the Journey and stating that deletion is permanent.

Confirmation submits the exact native Journey ID and registry source version. Mirror re-checks leaf status and every protected association inside the deletion transaction. Any conversation, memory, task, attachment, runtime session, Explorer/Builder record, dedicated thread or generation blocks deletion without cascade. Success removes only the empty Journey identity and publishes a verified replacement registry. Project directories, repositories and files are never deletion targets.

## Non-Goals

- Cascading or forced Journey deletion, merge, duplication or post-creation slug rename.
- Automatic repository, directory, file or identity-file creation.
- Automatic Pi session, Mirror conversation, dedicated Journey thread or generation creation.
- Provider-generated names, descriptions, slugs, hierarchy or path suggestions.
- Inference from names, timestamps, recency, Git repositories or filesystem discovery.
- Automatic watchers or implicit background synchronization.
- Concurrent Journey execution, which remains DS-009 scope.
- Changes to pins, memories, semantic content beyond the explicitly created identity, tasks, attachments, conversations or dedicated-thread state.

## Aggregate Acceptance Behavior

```text
Given a validated Harness registry with exact Mirror sourceVersion
When the Navigator confirms one create, path or move operation
Then Mirror either commits exactly one valid canonical mutation and returns a verified replacement registry
Or rejects the request before mutation / preserves recoverable projection state
And the operation invokes no provider or conversation lifecycle.
```

```text
Given the Navigator opens the context menu on Journey A
When Create Journey… is chosen
Then the form opens with Journey A selected as parent
And the parent and sibling position remain editable
And no canonical state changes until explicit confirmation.
```

```text
Given a stale registry, duplicate slug, cycle, invalid target, invalid path, malformed order or unauthorized field
When administration is attempted
Then the request fails closed
And no partial tree or desktop projection is published.
```

## Validation Route

Aggregate validation requires all of the following:

1. Mirror contract fixture and unit suites.
2. Mirror transaction/integration tests against isolated temporary databases.
3. Harness TypeScript domain and presentation tests.
4. Rust tests for confinement, subprocess handling, staged publication and recovery.
5. Python exporter/gateway adapter tests.
6. Full Harness Vitest, production build, Rust tests and `cargo check`.
7. Relevant full Mirror test slices and architecture checks.
8. A provider-call sentinel proving every administration and recovery path is model-free.
9. Navigator desktop validation using a disposable isolated Mirror home before any production-state exercise.
10. Protected-state snapshots proving no Pi session, Mirror conversation, dedicated thread, generation, memory, attachment or repository side effect.

Detailed scenarios live in `test-guide.md`.

## Implementation Contract

- Use TDD for every behavior change and characterization tests before refactoring the existing registry reload boundary.
- Keep Mirror domain logic in services/storage; CLI remains transport and Tauri remains a confined process/publication boundary.
- Use `uv run` for Mirror Python commands and tests.
- Do not mutate production Mirror state during automated tests.
- Use explicit test homes and temporary databases; production exercise requires separate Navigator authorization.
- Preserve authored roadmap and plan detail if lifecycle tooling emits reduced templates.
- Commit coherent child-story review boundaries with descriptive English messages and explicit paths; never use `git add .`.
- Do not absorb deletion, repository creation, thread provisioning or provider behavior into this Delivery Story.
- Do not implement until this aggregate plan is explicitly approved.
- Validation, Debt Review, Coherence, Done, push and release remain separate hard gates.

---

_Approval and lifecycle state are tracked by the Builder runtime, not duplicated in this plan._
