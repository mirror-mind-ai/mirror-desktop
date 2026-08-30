[< Story](index.md)

# Test Guide — CV-002.DS-005

## Automated Matrix

- strict parsing rejects malformed, oversized, duplicate-id and non-two-message items;
- enqueue is atomic, idempotent for an identical item and conflicting for divergent reuse;
- 32-item and 4 MiB limits reject without eviction;
- append reads content only from the persisted item and writes payload through stdin;
- accepted `inserted` and `existing` receipts update the exact generation projection before acknowledgement;
- rejection and process failure retain the item with bounded diagnostics;
- app reopen retries pending items;
- generation restart leaves old items bound to the old conversation and permits historical-generation retry;
- stale runtime-session state is neither read nor mutated;
- Mirror project logger is not auto-loaded for dedicated turns; core and external skills remain explicitly projected;
- composer remains available for `mirror_pending` and blocks only provider/projection authority or outbox overflow;
- legacy `conversation-logger commit-status` and retry are absent from the normal path.

## Required Gates

```text
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo test --features development-channel
cd src-tauri && cargo check
cd src-tauri && cargo check --features development-channel
git diff --check
```

## Desktop Validation

Use a fresh disposable development generation after implementation:

1. capture exact production checkout and database non-mutation evidence;
2. complete one bounded turn;
3. verify the dedicated Mirror conversation receives the Harness message ids exactly once;
4. verify no transient/random-id duplicate is written by the logger;
5. force one append failure, confirm composer availability and persisted outbox item;
6. reopen the app and retry to acceptance;
7. retry the accepted payload and observe only `existing` states;
8. restart generation with an old pending item and prove it reaches only its original conversation;
9. verify the stable app, production database and production Mirror checkout remain unchanged.

## Pass Condition

The explicit conversation receives exactly the completed Harness pair, retry is idempotent, pending work survives without blocking local conversation, generation ownership never drifts, and no normal persistence operation depends on runtime-session selection or Pi transcript routing.
