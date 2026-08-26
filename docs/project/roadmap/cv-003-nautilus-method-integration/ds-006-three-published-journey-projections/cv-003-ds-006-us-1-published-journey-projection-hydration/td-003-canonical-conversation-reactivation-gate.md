# TD-003 — Canonical Conversation Reactivation Gate

**Status:** Resolved
**Detected:** 2026-08-26

## Problem

Reactivating the Harness window could leave an imported local transcript classified as `uninitialized`. The composer nevertheless remained usable because invocation treated both `uninitialized` and `in_sync` as acceptable. Mirror advancement inspection also requires native checkpoints, so an imported conversation with no established baseline could not discover later canonical changes.

This allowed a human and the agent to continue from different transcripts.

## Required behavior

```text
window focus / visibility activation
  → inspect linked native Pi session
  → inspect linked Mirror conversation
  → compare with the local Harness projection
  → block composer during inspection
  → if divergent, keep composer blocked and offer explicit review/reload
  → enable invocation only when classification is in_sync
```

The canonical authority is the explicitly bound Pi session generation plus its linked Mirror conversation, not whichever recent conversation happens to share a Journey slug.

## Resolution

- `uninitialized` no longer permits invocation.
- The textarea and send action are disabled during authority inspection and for every classification other than `in_sync`.
- A named `ConversationAuthorityNotice` explains the mismatch and opens the explicit Mirror conversation picker.
- Provider preflight still repeats model-free Pi/Mirror inspection and fails closed if authority changes or another inspection remains active.
- Mirror import hydration now verifies that the selected canonical conversation:
  - still has the same native Mirror cursor;
  - belongs to the selected Journey;
  - ends in a complete assistant response;
  - has not advanced during hydration.
- Successful hydration writes all three native checkpoints and persists `classification: in_sync` atomically with the local conversation authority.
- Frontend reload reads the persisted conversation again after hydration instead of retaining the pre-hydration `uninitialized` object.

## Validation

```text
Frontend: 38 files, 245 tests
Build: passed
Rust: 17 tests
cargo check: passed
```

No provider or synthesis invocation is part of the consistency check.
