# Implementation — CV-002.DS-004.US-4

## Result

Implemented non-blocking observation and safe projection of complete turns added
outside Nautilus to the exact Journey-mapped Pi JSONL branch.

## Trigger and Performance Boundary

- Startup/restored-Journey activation schedules a background check.
- Journey activation schedules a background check after persisted state loads.
- Window focus and visibility recovery schedule a debounced check without
  awaiting I/O.
- Duplicate triggers coalesce through one in-flight authority key.
- Tauri executes inspection through `spawn_blocking`.
- Exact file size, modification time and inode provide the unchanged fast path.
- A bounded Tauri cache keeps at most eight exact session snapshots and reads
  only appended bytes when file identity and append-only growth remain valid.
- Relaunch/cache miss falls back to one buffered full scan.
- No polling, broad watcher, Pi subprocess or provider invocation was added.

## Exact Pi Observation

The new `inspect_external_pi_activity` command validates:

- Journey/session-id relationship;
- canonical `.jsonl` path inside the Pi sessions root;
- session header id;
- file identity and non-regressing size;
- checkpoint base leaf existence and branch entry count;
- descendant ancestry through native `id`/`parentId` links.

The parser tolerates an incomplete final line as waiting and rejects malformed
interior JSONL, ancestry cycles, missing bases, count mismatch, replacement and
truncation. It builds only the current native branch from the latest physical
leaf.

## Supported Projection

- A turn begins at a native user message and requires a terminal assistant with
  `stopReason` `stop` or `length` before it is projectable.
- Multiple complete external turns project in native order.
- A partial trailing turn remains unprojected while earlier complete turns may
  still advance.
- Only user text and assistant text blocks are projected.
- Thinking blocks, reasoning summaries, tool calls/results, custom entries and
  compaction payloads remain non-chat and inert.
- Harness ids are deterministic from native Pi entry ids.
- Local Harness count/last-id, generation, exact session file and Pi checkpoint
  must still match before mutation.

## Durable State

- The complete projected conversation is saved before React commits it.
- Harness and Pi checkpoints advance to the last projected assistant.
- Native advancement evidence remains in the reconciliation ledger and the
  aggregate state remains honestly `pi_advanced` until later Mirror
  reconciliation.
- Imported Activity, context stats and certified mode survive projection.
- Repeated observations use fingerprint/idempotency paths and do not replay.
- Stale async results after Journey/generation/checkpoint changes are discarded.

## Conflict UI

Unchanged, waiting and successful checks are quiet. A proved authority/ancestry
conflict does not mutate messages and renders one compact composer-adjacent
notice:

```text
Pi conversation changed outside Nautilus
Review required
```

It offers no automatic merge or model-backed action.

## Files

```text
src/domain/externalPiProjection.ts
src/domain/conversationReconciliation.ts
src/agent/piProcessStream.ts
src/app/App.tsx
src/app/ExternalPiSyncNotice.tsx
src-tauri/src/main.rs
src/tests/externalPiProjection.test.ts
```

## Automated Evidence

```text
npm test: 24 files, 164 tests passed
npm run build: passed
cargo test: 6 tests passed
cargo check: passed
```

## Pending

Navigator E2E across real terminal continuation, focus recovery, Journey switch,
relaunch and controlled partial/conflict routes.
