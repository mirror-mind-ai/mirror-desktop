# Validation — CV-002.DS-005

## Automated Evidence

Passed on 2026-08-30:

- Vitest: 64 files, 332 tests;
- TypeScript and Vite production build;
- Rust stable channel tests: 34 tests;
- Rust development channel tests: 34 tests;
- Rust stable `cargo check`;
- Rust development-channel `cargo check`;
- `git diff --check`.

Coverage includes exact two-message item construction, Pi execution evidence, inserted/existing receipt parsing, deterministic item timestamps, exact reconciliation settlement, idempotent enqueue, divergent-id conflict, 32-item overflow without eviction, channel-local Pi session validation, explicit skill projection, and absence of automatic project extension loading.

`cargo fmt --check` is not a valid repository gate at the current baseline: the checked-in pre-story `src-tauri/src/main.rs` is not rustfmt-normalized and the command proposes broad unrelated formatting. This story preserves the existing file style and uses `git diff --check` to avoid review-noise normalization.

## Desktop Evidence Pending

Final development-channel validation must still prove:

1. a fresh completed turn yields exact Harness ids in its dedicated Mirror conversation;
2. the disabled logger creates no random-id duplicate or transient conversation;
3. forced append failure retains the outbox item while the composer remains available;
4. reopen retries to acceptance and removes the item only after projection settlement;
5. an `existing` retry is idempotent;
6. a pending inactive generation cannot migrate to the replacement conversation;
7. stable app, production database and `/Users/alissonvale/mirror` remain unchanged.

The story remains in progress until this desktop evidence is captured.
