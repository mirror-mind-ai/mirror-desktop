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

## Development Desktop Evidence

Captured against `Sandbox Pet Store`, generation 1, dedicated Mirror conversation `5a8da19b`:

- reopened a manually staged durable item and observed automatic acceptance, projection settlement and an empty outbox;
- replayed the accepted item from a simulated post-append/pre-projection crash and observed `existing` idempotency: exactly two rows remained;
- completed live turns returning `EXPLICIT APPEND VERIFIED` and `EXPLICIT APPEND SECOND VERIFIED`;
- each live turn stored the exact Harness user/assistant ids in `5a8da19b`, then removed its outbox item;
- no random-id semantic duplicate was present and no new Pi-interface transient conversation appeared; the newest historical transient remained dated 2026-08-29;
- forced Mirror `journey_mismatch` after durable enqueue; the exact item remained, the retry notice named the bounded reason and the composer remained available;
- restored the Journey guard and retried successfully; the projection committed and the outbox returned to zero items;
- matching production message rows remained zero and `/Users/alissonvale/mirror` remained clean on stable `fdd760f8f3532dbeb0841826107d1672f6bbb881`;
- stable and development apps remained visibly distinct, with `DEV LAB` present only in the development window.

A development database safety backup was created at `/Users/alissonvale/.mirror-minds/mirror-dev/backups/ds005-forced-failure.sqlite` before the controlled Journey-guard failure.

## Generation Rollover Evidence

A fourth controlled turn was retained in the outbox while Mirror rejected the temporary Journey mismatch. Harness then restarted to generation 2:

- generation 1 became `inactive` with original conversation `5a8da19b`;
- generation 2 became `ready` with new conversation `c7b3cd26`;
- the pending item retained generation 1 and `5a8da19b` coordinates;
- after restoring the Journey guard and reopening the app, automatic retry committed the exact pair only to `5a8da19b`;
- generation 2 received neither historical message id;
- the generation 1 projection settled and the outbox returned to zero;
- production matching rows remained zero.

All required automated and desktop gates are complete.
