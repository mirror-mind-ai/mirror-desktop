[< Story](index.md)

# Test Guide — CV-002.DS-004.US-5

## Purpose

Prove that Nautilus detects exact mapped Mirror advancement without touching Pi, and that only an explicit, current and eligible decision can create one rollback-safe hydrated Pi generation.

## Automated Validation

```bash
npm test
npm run build
cd src-tauri && cargo test
cd src-tauri && cargo check
python3 -m unittest scripts.tests.test_inspect_mirror_conversation
```

## Required Coverage

### Pure classification

- unchanged native cursor/count;
- one and multiple complete alternating user/assistant pairs;
- trailing incomplete user remains waiting;
- deterministic Mirror-derived Harness ids;
- allowlisted correlated duplicate proof;
- text-equal but uncorrelated content is not treated as identity;
- unsupported role, empty content and tail overflow;
- exact truncation marker and consolidated assistant record rejection;
- missing/regressed cursor or changed conversation conflict;
- stale Journey/session/generation/Harness authority conflict;
- independent Pi and Mirror advancement remains `both_advanced`/blocked;
- repeated observation and approval are idempotent.

### Read-only Mirror boundary

- exact Journey/conversation ownership;
- stable `(created_at, id)` ordering;
- base native id and ordinal/count validation;
- metadata fast path for unchanged snapshots;
- bounded tail and content size;
- only id, role, content, timestamp and allowlisted Nautilus correlation fields escape;
- arbitrary metadata, operations, attachments and other conversations never escape;
- malformed or unavailable database returns a bounded error;
- no database write, Pi process or provider call.

### Atomic reconciliation

- active Pi process rejects reconciliation;
- persisted authority, exact old Pi header/path/checkpoint and Mirror snapshot are revalidated;
- staged JSONL has one Journey-owned session id and deterministic parent chain;
- generation increments once and origin becomes `mirror_reconciliation`;
- Harness/Pi/Mirror hydration checkpoints match the staged transcript;
- old exact Pi file and old persisted conversation survive every injected failure point;
- successful activation preserves the old file as backup and commits the new conversation atomically;
- stale/repeated snapshot cannot create a second generation;
- context stats clear while imported activity and certified mode remain inert/preserved.

### UI/coordinator

- startup, visible focus recovery and Journey activation schedule asynchronous checks;
- only active Journey authority is queried;
- duplicate triggers coalesce and stale results are discarded;
- unchanged/waiting is quiet;
- eligible notice opens an inert plain-text preview;
- unsupported/conflicted preview has no apply action;
- apply is disabled during run/reload or stale authority;
- no Mirror message enters visible chat before backend commit;
- successful commit reloads the persisted conversation once;
- no automatic Pi/provider invocation occurs.

## Navigator E2E Route

1. Use a dedicated Journey whose Harness, Pi and Mirror checkpoints are `in_sync`.
2. Record:
   - Harness conversation id/message count;
   - Pi session id, generation, exact file, leaf/count and SHA-256;
   - Mirror conversation id, last message id/count.
3. Add one bounded user/assistant pair directly to that exact Mirror conversation while Nautilus is backgrounded or on another Journey.
4. Return to/activate the Journey.
5. Open the Mirror update disclosure.
6. Before approval, verify:
   - visible messages are unchanged;
   - generation and Pi checkpoint are unchanged;
   - exact Pi file SHA-256 is unchanged;
   - no run/provider activity appears.
7. Select `Create reconciled Pi branch`.
8. Verify:
   - visible messages gain exactly the approved pair;
   - generation increments exactly once;
   - old Pi file is preserved as backup;
   - new exact JSONL contains the accepted transcript and a valid parent chain;
   - reconciliation reaches `in_sync` with matching hydration checkpoints;
   - no provider response was generated.
9. Refocus twice and relaunch Nautilus; verify the pair and generation remain unique.
10. Exercise partial, truncated/consolidated and independent-Pi conflict through controlled fixtures or a disposable test conversation; verify no apply action and no mutation.
11. Run an injected backend failure and verify old identity/file/conversation remain active.

## Expected Observation

Mirror-only advancement produces one compact review notice. The preview is inert and Pi remains byte-for-byte unchanged until explicit approval. Eligible approval creates one new hydrated generation without model execution. Unsupported or conflicted tails never expose an apply action.

## Pass Condition

All required checks pass; the Navigator accepts the E2E route; pre-approval Pi immutability, explicit one-time generation transition, rollback, idempotency and provenance boundaries are proven.

## Fail Condition

The story fails if Mirror content enters Pi/chat automatically; text equality authorizes identity; partial/truncated/consolidated/conflicted data is applied; another Journey is queried or mutated; provider/Pi runs during observation/application; rollback loses the old branch; or focus/relaunch duplicates the update.

## Evidence Hygiene

Persist only sanitized ids, counts, hashes, reason codes and derived fixtures. Do not retain raw private conversations, arbitrary Mirror metadata, secrets, provider reasoning or tool output in roadmap evidence.
